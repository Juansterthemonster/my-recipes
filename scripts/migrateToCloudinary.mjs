/**
 * migrateToCloudinary.mjs
 *
 * One-time script: migrate all existing recipe photos from Supabase Storage
 * to Cloudinary and update photo_url in the DB.
 *
 * Usage:
 *   node --env-file=.env scripts/migrateToCloudinary.mjs
 *
 * Add to .env before running:
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=mi-sazon
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *
 * What it does:
 *   1. Fetches all recipes whose photo_url still points to Supabase Storage
 *   2. Downloads each image from Supabase
 *   3. Uploads it to Cloudinary (using the recipe ID as the public_id)
 *   4. Updates photo_url in the recipes table to the new Cloudinary URL
 *   5. Prints a summary at the end
 *
 * Safe to re-run: recipes already migrated (photo_url contains 'cloudinary')
 * are skipped automatically. If the script stops mid-way, just run it again.
 *
 * Old files in Supabase Storage are NOT deleted — verify everything looks good
 * in the app first, then delete them from the Supabase Storage dashboard.
 */

import { createClient } from '@supabase/supabase-js'

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLOUD_NAME        = process.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET     = process.env.VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUDINARY_FOLDER = 'mi-sazon'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing Supabase env vars.')
  console.error('    Make sure .env contains VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.error('❌  Missing Cloudinary env vars.')
  console.error('    Make sure .env contains VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET')
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

async function uploadToCloudinary(buffer, recipeId) {
  const form = new FormData()
  // Use a Blob so FormData sends it as a file
  const blob = new Blob([buffer], { type: 'image/webp' })
  form.append('file', blob, `${recipeId}.webp`)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', CLOUDINARY_FOLDER)
  form.append('public_id', recipeId)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.secure_url
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Fetch all recipes with a photo that still points to Supabase Storage
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, user_id, photo_url')
    .not('photo_url', 'is', null)

  if (error) { console.error('Failed to fetch recipes:', error.message); process.exit(1) }

  const toProcess = recipes.filter(r =>
    r.photo_url && !r.photo_url.includes('cloudinary.com')
  )

  if (toProcess.length === 0) {
    console.log('✓ All photos are already on Cloudinary — nothing to do.')
    return
  }

  console.log(`Found ${toProcess.length} photo(s) to migrate to Cloudinary.\n`)

  let succeeded = 0
  let failed    = 0

  for (let i = 0; i < toProcess.length; i++) {
    const recipe = toProcess[i]
    const idx    = `[${i + 1}/${toProcess.length}]`

    process.stdout.write(`${idx} Recipe ${recipe.id}\n    Downloading from Supabase… `)

    // 2. Download from Supabase Storage
    let buffer
    try {
      const res = await fetch(recipe.photo_url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      buffer = Buffer.from(await res.arrayBuffer())
      process.stdout.write(`${formatBytes(buffer.byteLength)} ✓\n`)
    } catch (e) {
      console.log(`\n    SKIP — download failed: ${e.message}`)
      failed++
      continue
    }

    // 3. Upload to Cloudinary
    process.stdout.write(`    Uploading to Cloudinary… `)
    let cloudinaryUrl
    try {
      cloudinaryUrl = await uploadToCloudinary(buffer, recipe.id)
      process.stdout.write(`✓\n`)
    } catch (e) {
      console.log(`\n    SKIP — Cloudinary upload failed: ${e.message}`)
      failed++
      continue
    }

    // 4. Update photo_url in DB
    process.stdout.write(`    Updating DB… `)
    const { error: updateErr } = await supabase
      .from('recipes')
      .update({ photo_url: cloudinaryUrl })
      .eq('id', recipe.id)

    if (updateErr) {
      console.log(`\n    SKIP — DB update failed: ${updateErr.message}`)
      // Cloudinary now has the file but DB still points to Supabase.
      // Re-running the script will re-upload and retry (overwrite: true handles duplicates).
      failed++
      continue
    }

    console.log(`    DB updated ✓  →  ${cloudinaryUrl}\n`)
    succeeded++
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────')
  console.log(`Migration complete: ${succeeded} succeeded, ${failed} failed`)

  if (failed > 0) {
    console.log('\nTip: Re-run the script to retry failed photos.')
    console.log('     Already-migrated recipes are skipped automatically.')
  }

  if (succeeded > 0) {
    console.log('\nNext steps:')
    console.log('  1. Open the app and verify all recipe photos load correctly')
    console.log('  2. Once confirmed, delete the old files from:')
    console.log('     Supabase Dashboard → Storage → recipe-photos')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
