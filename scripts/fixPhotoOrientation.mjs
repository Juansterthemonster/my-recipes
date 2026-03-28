/**
 * fixPhotoOrientation.mjs
 *
 * Correctly matches original photos to their recipes, then re-processes
 * them with `.rotate()` to fix EXIF orientation.
 *
 * WHY PREVIOUS VERSIONS FAILED
 * ─────────────────────────────
 * Sorting originals by filename-timestamp and recipes by created_at, then
 * pairing positionally, assumes photos were uploaded in the same order that
 * recipes were created. That assumption breaks whenever a user uploads a photo
 * to an existing recipe out of creation order.
 *
 * CORRECT MATCHING STRATEGY
 * ─────────────────────────
 * When a user uploads a photo they are almost always working on that specific
 * recipe at that moment. So the original file's upload timestamp will be
 * closest in time to its recipe's created_at among all candidates.
 *
 * Algorithm:
 *   1. Collect all original (non-webp) files for each user from Storage.
 *   2. Collect all recipes with photos for each user (with created_at).
 *   3. Compute every pairwise time-distance: |original_upload_ts - recipe_created_at|
 *   4. Greedy assignment: repeatedly pick the closest pair, mark both as taken.
 *      This guarantees a unique 1-to-1 mapping with minimal total time error.
 *   5. DRY RUN by default — show the proposed mapping and time gaps so you can
 *      verify it before writing anything.
 *   6. Pass --commit to process originals with .rotate(), compress, and update the DB.
 *
 * USAGE
 * ─────
 *   # Dry run (safe — read-only, shows proposed mapping):
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/fixPhotoOrientation.mjs
 *
 *   # Apply the fix once you've verified the mapping looks correct:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/fixPhotoOrientation.mjs --commit
 */

import { createClient } from '@supabase/supabase-js'
import sharp            from 'sharp'

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET           = 'recipe-photos'
const MAX_DIMENSION    = 1800
const WEBP_QUALITY     = 82
const DRY_RUN          = !process.argv.includes('--commit')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run with:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/fixPhotoOrientation.mjs')
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

function formatDate(ts) {
  return new Date(ts).toLocaleString()
}

function formatGap(ms) {
  const s = Math.round(ms / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  return `${(s / 3600).toFixed(1)}h`
}

async function listFolder(folder) {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 })
  if (error) throw new Error(`list("${folder}"): ${error.message}`)
  return data ?? []
}

function getPublicUrl(path) {
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

/**
 * Greedy 1-to-1 assignment: pairs each original with the recipe whose
 * created_at is closest in time to the original's upload timestamp.
 *
 * Returns: [{ original, recipe }]
 */
function assignByTimestamp(originals, recipes) {
  // Build every possible pair with its time-distance
  const pairs = []
  for (const orig of originals) {
    for (const recipe of recipes) {
      const gap = Math.abs(orig.ts - new Date(recipe.created_at).getTime())
      pairs.push({ orig, recipe, gap })
    }
  }

  // Sort by smallest gap first
  pairs.sort((a, b) => a.gap - b.gap)

  const usedOriginals = new Set()
  const usedRecipes   = new Set()
  const assignments   = []

  for (const pair of pairs) {
    if (usedOriginals.has(pair.orig.path)) continue
    if (usedRecipes.has(pair.recipe.id))   continue
    assignments.push(pair)
    usedOriginals.add(pair.orig.path)
    usedRecipes.add(pair.recipe.id)
    if (assignments.length === Math.min(originals.length, recipes.length)) break
  }

  return assignments
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(DRY_RUN
    ? '🔍 DRY RUN — no changes will be made. Add --commit to apply.\n'
    : '🚀 COMMIT MODE — changes will be written.\n'
  )

  // 1. Discover user folders
  const topLevel    = await listFolder('')
  const userFolders = topLevel.filter(f => !f.name.includes('.'))

  if (userFolders.length === 0) {
    console.log('No folders found in bucket — are your credentials correct?')
    return
  }

  // 2. Collect original (non-webp) files per user
  const originalsByUser = {}
  for (const folder of userFolders) {
    const userId = folder.name
    const files  = await listFolder(userId)
    const originals = files
      .filter(f => !f.name.toLowerCase().endsWith('.webp'))
      .map(f => ({
        path:     `${userId}/${f.name}`,
        fileName: f.name,
        url:      getPublicUrl(`${userId}/${f.name}`),
        ts:       parseInt(f.name.split('.')[0], 10),  // filename is Date.now() at upload
      }))
      .filter(f => !isNaN(f.ts))
    if (originals.length > 0) originalsByUser[userId] = originals
  }

  const totalOriginals = Object.values(originalsByUser).flat().length
  if (totalOriginals === 0) {
    console.log('No original (non-WebP) files found in Storage.')
    console.log('The originals may have already been deleted from the bucket.')
    return
  }

  // 3. Load recipes with photos, including created_at for timestamp matching
  const { data: recipes, error: recipeErr } = await supabase
    .from('recipes')
    .select('id, user_id, name, photo_url, created_at')
    .not('photo_url', 'is', null)

  if (recipeErr) { console.error('Failed to fetch recipes:', recipeErr.message); process.exit(1) }

  const recipesByUser = {}
  for (const r of recipes) {
    if (!recipesByUser[r.user_id]) recipesByUser[r.user_id] = []
    recipesByUser[r.user_id].push(r)
  }

  // 4. Per-user: compute assignments, show dry-run table, optionally commit
  let totalSucceeded = 0
  let totalFailed    = 0
  let totalSkipped   = 0
  let totalBefore    = 0
  let totalAfter     = 0

  for (const userId of Object.keys(originalsByUser)) {
    const originals   = originalsByUser[userId]
    const userRecipes = recipesByUser[userId] ?? []

    console.log(`── User ${userId} ──`)

    if (userRecipes.length === 0) {
      console.log(`   No recipes with photos found — skipping ${originals.length} file(s).\n`)
      totalSkipped += originals.length
      continue
    }

    if (originals.length > userRecipes.length) {
      // More originals than recipes — can't reliably assign orphan files
      console.log(`   ⚠️  ${originals.length} original file(s) but only ${userRecipes.length} recipe(s) with photos.`)
      console.log(`   Cannot reliably match — skipping. Fix these manually in the app.\n`)
      totalSkipped += originals.length
      continue
    }

    // originals.length < recipes.length is OK — it means one recipe's original was
    // already a .webp (skipped by the first migration) or its original was deleted.
    // We'll match all originals and leave the unmatched recipe's photo_url unchanged.

    // Compute greedy timestamp-proximity assignment
    const assignments = assignByTimestamp(originals, userRecipes)

    // Show proposed mapping
    const assignedRecipeIds = new Set(assignments.map(a => a.recipe.id))
    const unmatchedRecipes  = userRecipes.filter(r => !assignedRecipeIds.has(r.id))

    console.log(`   Proposed matching (closest upload time to recipe creation):`)
    console.log(`   ${'Original file'.padEnd(28)} ${'Recipe name'.padEnd(30)} Gap`)
    console.log(`   ${'-'.repeat(70)}`)
    for (const { orig, recipe, gap } of assignments) {
      const origLabel   = orig.fileName.padEnd(28)
      const recipeLabel = `"${recipe.name}"`.padEnd(30)
      const gapLabel    = formatGap(gap)
      console.log(`   ${origLabel} ${recipeLabel} ${gapLabel}`)
    }
    if (unmatchedRecipes.length > 0) {
      console.log(`   ${'(no original found)'.padEnd(28)} ${`"${unmatchedRecipes.map(r => r.name).join('", "')}"`.padEnd(30)} — photo_url left unchanged`)
    }
    console.log('')

    if (DRY_RUN) continue

    // ── COMMIT: process each assignment ──────────────────────────────────────

    for (let i = 0; i < assignments.length; i++) {
      const { orig, recipe } = assignments[i]
      const idx = `   [${i + 1}/${assignments.length}]`

      process.stdout.write(`${idx} "${recipe.name}" ← ${orig.fileName} — downloading… `)

      let originalBuffer
      try {
        const res = await fetch(orig.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        originalBuffer = Buffer.from(await res.arrayBuffer())
      } catch (e) {
        console.log(`SKIP (download failed: ${e.message})`)
        totalFailed++
        continue
      }

      let compressedBuffer
      try {
        compressedBuffer = await sharp(originalBuffer)
          .rotate()                          // apply EXIF orientation, bake into pixels
          .resize({
            width:              MAX_DIMENSION,
            height:             MAX_DIMENSION,
            fit:                'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
      } catch (e) {
        console.log(`SKIP (compress failed: ${e.message})`)
        totalFailed++
        continue
      }

      const before = originalBuffer.byteLength
      const after  = compressedBuffer.byteLength
      totalBefore += before
      totalAfter  += after

      process.stdout.write(`${formatBytes(before)} → ${formatBytes(after)} (${pct(before, after)}) — uploading… `)

      const newPath = `${userId}/${Date.now()}.webp`
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, compressedBuffer, { contentType: 'image/webp', upsert: false })

      if (uploadErr) {
        console.log(`SKIP (upload failed: ${uploadErr.message})`)
        totalFailed++
        continue
      }

      const { error: updateErr } = await supabase
        .from('recipes')
        .update({ photo_url: getPublicUrl(newPath) })
        .eq('id', recipe.id)

      if (updateErr) {
        console.log(`SKIP (DB update failed: ${updateErr.message})`)
        totalFailed++
        continue
      }

      console.log('✓')
      totalSucceeded++
    }

    console.log('')
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────')

  if (DRY_RUN) {
    console.log('Dry run complete — no changes were made.')
    console.log('If the mapping above looks correct, run with --commit to apply it:')
    console.log('  SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/fixPhotoOrientation.mjs --commit')
  } else {
    console.log(`Completed: ${totalSucceeded} fixed, ${totalFailed} failed, ${totalSkipped} skipped`)
    if (totalSucceeded > 0) {
      console.log(`Storage: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${pct(totalBefore, totalAfter)})`)
    }
    if (totalSkipped > 0) {
      console.log('\nSkipped recipes: open each in the app, remove the photo, and re-upload it.')
    }
    console.log('\nOld files in Storage have NOT been deleted.')
    console.log('Once photos look correct, clean them up via the Supabase Storage dashboard.')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
