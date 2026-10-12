/**
 * migrateCloudinaryToR2.mjs
 *
 * One-time script: migrate all existing recipe photos from Cloudinary to
 * Cloudflare R2, and update both `photo_url` and `photos` in the DB.
 *
 * Usage:
 *   node --env-file=.env scripts/migrateCloudinaryToR2.mjs
 *   node --env-file=.env scripts/migrateCloudinaryToR2.mjs --dry-run   (preview only, no writes/uploads)
 *
 * Uses from .env (already added earlier in this project):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   VITE_R2_PUBLIC_URL
 *
 * What it does:
 *   1. Fetches every recipe that has a photo_url and/or a photos[] entry.
 *      Each recipe's own photos are only ever read from and written back to
 *      that same recipe's row (matched by id) — there is no separate
 *      matching/pairing heuristic, so a photo can never end up attached to
 *      the wrong recipe.
 *   2. For each photo that still points to cloudinary.com:
 *        - downloads the original bytes from Cloudinary
 *        - re-compresses through sharp with the exact same settings the
 *          app's client-side upload path uses (src/utils/compressImage.js:
 *          longest edge capped at 1800px, WebP quality 82) so every migrated
 *          photo meets the same size/quality bar as a freshly-uploaded one,
 *          even if the original predates that compression step
 *        - uploads the result to R2 with a far-future Cache-Control header
 *          (filenames are unique per upload, so this is always safe)
 *   3. Rebuilds `photos` preserving the EXACT original array order, swapping
 *      in the new R2 URL only at the index of each migrated photo (anything
 *      already on R2 is left untouched, in its original position)
 *   4. Sets `photo_url` to the new photos[0] and writes both columns back
 *
 * Safe to re-run: only recipes that still have a cloudinary.com URL
 * somewhere in photos/photo_url are touched. If the script stops partway
 * through, just run it again — already-migrated recipes are skipped.
 *
 * Old files on Cloudinary are NOT deleted by this script. Once you've
 * verified photos load correctly in the app, you can let the Cloudinary
 * account lapse / clear it out manually — nothing here depends on it anymore.
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

// ─── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')

// Mirrors src/utils/compressImage.js exactly, so migrated photos match the
// size/quality of anything uploaded through the app today.
const MAX_DIMENSION = 1800
const WEBP_QUALITY  = 82

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_KEY    = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET        = process.env.R2_BUCKET_NAME
const R2_PUBLIC_URL    = process.env.VITE_R2_PUBLIC_URL

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing Supabase env vars.')
  console.error('    Make sure .env contains VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.error('❌  Missing R2 env vars.')
  console.error('    Make sure .env contains R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, VITE_R2_PUBLIC_URL')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_KEY,
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function migrateOnePhoto(cloudinaryUrl, recipeId, photoIndex) {
  // 1. Download the original bytes from Cloudinary
  const res = await fetch(cloudinaryUrl)
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
  const originalBuffer = Buffer.from(await res.arrayBuffer())

  // 2. Re-compress through sharp so this photo matches the same
  //    max-1800px / WebP-q82 bar as anything uploaded through the app,
  //    regardless of how the original was encoded.
  //    .rotate() with no args auto-applies any EXIF orientation before
  //    stripping it — a no-op if the source has none.
  const optimizedBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  // 3. Upload the optimized version to R2
  const key = `mi-sazon/${recipeId}_${photoIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`

  if (!DRY_RUN) {
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }))
  }

  return {
    url: `${R2_PUBLIC_URL}/${key}`,
    originalBytes: originalBuffer.byteLength,
    optimizedBytes: optimizedBuffer.byteLength,
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  if (DRY_RUN) console.log('🔎  DRY RUN — no uploads or DB writes will happen.\n')

  // 1. Fetch every recipe that has any photo at all
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, photo_url, photos')
    .or('photo_url.not.is.null,photos.not.eq.[]')

  if (error) { console.error('Failed to fetch recipes:', error.message); process.exit(1) }

  // 2. Only recipes that still have at least one cloudinary.com URL somewhere.
  //    `urls` is this recipe's own array, in its original display order —
  //    it never mixes photos from a different recipe.
  const toProcess = recipes
    .map(r => ({
      ...r,
      urls: r.photos?.length ? r.photos : (r.photo_url ? [r.photo_url] : []),
    }))
    .filter(r => r.urls.some(u => typeof u === 'string' && u.includes('cloudinary.com')))

  if (toProcess.length === 0) {
    console.log('✓ No Cloudinary photos left to migrate — everything is already on R2.')
    return
  }

  console.log(`Found ${toProcess.length} recipe(s) with Cloudinary photo(s) to migrate.\n`)

  let recipesSucceeded  = 0
  let recipesFailed     = 0
  let photosMigrated    = 0
  let originalBytesSum  = 0
  let optimizedBytesSum = 0

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i]
    const idx    = `[${i + 1}/${toProcess.length}]`
    console.log(`${idx} Recipe ${recipe.id} — ${recipe.urls.length} photo(s), order: [${recipe.urls.map((_, p) => p).join(', ')}]`)

    // Preserve the original array length/order exactly — this loop only
    // ever replaces an entry at its own index, never reorders or drops one.
    const newUrls = new Array(recipe.urls.length)
    let recipeHadFailure = false

    for (let p = 0; p < recipe.urls.length; p++) {
      const url = recipe.urls[p]

      if (typeof url !== 'string' || !url.includes('cloudinary.com')) {
        // Already on R2 (or some other host) — leave it exactly as-is, in place.
        newUrls[p] = url
        continue
      }

      process.stdout.write(`    photo ${p + 1}/${recipe.urls.length}: downloading + optimizing + uploading to R2… `)
      try {
        const { url: r2Url, originalBytes, optimizedBytes } = await migrateOnePhoto(url, recipe.id, p)
        newUrls[p] = r2Url
        photosMigrated++
        originalBytesSum  += originalBytes
        optimizedBytesSum += optimizedBytes
        console.log(`✓ ${formatBytes(originalBytes)} → ${formatBytes(optimizedBytes)}`)
      } catch (e) {
        console.log(`FAILED — ${e.message}`)
        newUrls[p] = url // keep the old (working) Cloudinary URL rather than losing the photo or its position
        recipeHadFailure = true
      }
    }

    if (DRY_RUN) {
      console.log(`    (dry run — would update photo_url + photos)\n`)
      recipesSucceeded++
      continue
    }

    const { error: updateErr } = await supabase
      .from('recipes')
      .update({ photos: newUrls, photo_url: newUrls[0] || null })
      .eq('id', recipe.id)

    if (updateErr) {
      console.log(`    SKIP — DB update failed: ${updateErr.message}\n`)
      recipesFailed++
      continue
    }

    if (recipeHadFailure) {
      console.log(`    DB updated, but one or more photos failed and were left on Cloudinary — re-run to retry them\n`)
      recipesFailed++
    } else {
      console.log(`    DB updated ✓\n`)
      recipesSucceeded++
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────')
  console.log(`Migration ${DRY_RUN ? 'preview' : 'complete'}: ${recipesSucceeded} recipe(s) fully migrated, ${recipesFailed} with issues`)
  console.log(`${photosMigrated} photo(s) moved to R2`)
  if (photosMigrated > 0) {
    console.log(`Size: ${formatBytes(originalBytesSum)} → ${formatBytes(optimizedBytesSum)} (${originalBytesSum ? Math.round((1 - optimizedBytesSum / originalBytesSum) * 100) : 0}% smaller)`)
  }

  if (recipesFailed > 0) {
    console.log('\nTip: re-run the script to retry anything that failed.')
    console.log('     Recipes already fully on R2 are skipped automatically.')
  }

  if (DRY_RUN) {
    console.log('\nThis was a dry run — nothing was uploaded or changed.')
    console.log('Re-run without --dry-run to actually migrate.')
  } else if (recipesSucceeded > 0) {
    console.log('\nNext steps:')
    console.log('  1. Open the app and verify recipe photos load correctly, in the right order')
    console.log('  2. Once confirmed, the Cloudinary account can be cleared out / cancelled')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
