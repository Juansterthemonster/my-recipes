/**
 * migratePhotos.mjs
 * One-time script: compress all existing recipe photos to WebP and update the DB.
 *
 * Prerequisites (run once from the project root):
 *   npm install --save-dev sharp
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key> node --env-file=.env scripts/migratePhotos.mjs
 *
 * Get your service role key:
 *   Supabase Dashboard → Project Settings → API → service_role (secret key)
 *
 * What it does:
 *   1. Fetches every recipe that has a photo_url not already ending in .webp
 *   2. Downloads the original image
 *   3. Resizes to max 1600px and converts to WebP at quality 82
 *   4. Uploads the compressed version to Supabase Storage
 *   5. Updates photo_url in the recipes table
 *   6. Prints a size-savings summary at the end
 *
 * Old files in Storage are NOT deleted — verify everything looks good first,
 * then clean them up manually via the Supabase Storage dashboard.
 */

import { createClient } from '@supabase/supabase-js'
import sharp            from 'sharp'

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET            = 'recipe-photos'
const MAX_DIMENSION     = 1800   // px — longest edge
const WEBP_QUALITY      = 82     // 0–100

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run with:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/migratePhotos.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function pct(before, after) {
  return `${Math.round((1 - after / before) * 100)}% smaller`
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Fetch all recipes with a photo that isn't already webp
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, user_id, photo_url')
    .not('photo_url', 'is', null)

  if (error) { console.error('Failed to fetch recipes:', error.message); process.exit(1) }

  const toProcess = recipes.filter(r => !r.photo_url.toLowerCase().includes('.webp'))

  if (toProcess.length === 0) {
    console.log('✓ All photos are already WebP — nothing to do.')
    return
  }

  console.log(`Found ${toProcess.length} photo(s) to compress.\n`)

  let totalBefore = 0
  let totalAfter  = 0
  let succeeded   = 0
  let failed      = 0

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i]
    const idx    = `[${i + 1}/${toProcess.length}]`

    process.stdout.write(`${idx} Recipe ${recipe.id} — downloading… `)

    // 2. Download original
    let originalBuffer
    try {
      const res = await fetch(recipe.photo_url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      originalBuffer = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      console.log(`SKIP (download failed: ${e.message})`)
      failed++
      continue
    }

    // 3. Compress with sharp
    let compressedBuffer
    try {
      compressedBuffer = await sharp(originalBuffer)
        .rotate()                           // auto-rotate from EXIF orientation, then strip tag
        .resize({
          width:             MAX_DIMENSION,
          height:            MAX_DIMENSION,
          fit:               'inside',      // preserve aspect ratio
          withoutEnlargement: true,         // never upscale
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
    } catch (e) {
      console.log(`SKIP (compress failed: ${e.message})`)
      failed++
      continue
    }

    const before = originalBuffer.byteLength
    const after  = compressedBuffer.byteLength
    totalBefore += before
    totalAfter  += after

    process.stdout.write(`${formatBytes(before)} → ${formatBytes(after)} (${pct(before, after)}) — uploading… `)

    // 4. Upload compressed WebP
    const newPath = `${recipe.user_id}/${Date.now()}.webp`
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, compressedBuffer, { contentType: 'image/webp', upsert: false })

    if (uploadErr) {
      console.log(`SKIP (upload failed: ${uploadErr.message})`)
      failed++
      continue
    }

    // 5. Get new public URL
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

    // 6. Update recipe row
    const { error: updateErr } = await supabase
      .from('recipes')
      .update({ photo_url: publicUrl })
      .eq('id', recipe.id)

    if (updateErr) {
      console.log(`SKIP (DB update failed: ${updateErr.message})`)
      // Note: the new file was uploaded but the DB still points to the old one.
      // The new file can be cleaned up manually in the Storage dashboard.
      failed++
      continue
    }

    console.log('✓')
    succeeded++
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────')
  console.log(`Completed: ${succeeded} succeeded, ${failed} failed`)
  if (succeeded > 0) {
    console.log(`Storage saved: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${pct(totalBefore, totalAfter)})`)
  }
  console.log('\nOld files in Storage have NOT been deleted.')
  console.log('Once you verify the photos look good in the app, you can')
  console.log('delete the old originals from the Supabase Storage dashboard.')
}

run().catch(e => { console.error(e); process.exit(1) })
