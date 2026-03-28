/**
 * fixOnePhoto.mjs
 * Fixes the photo for a single recipe by ID.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/fixOnePhoto.mjs \
 *     --recipe <recipe-uuid> \
 *     --file   <original-filename>   (e.g. 1712300000000.jpg — just the filename, not full path)
 *
 * How to find the values:
 *   --recipe : Supabase Dashboard → Table Editor → recipes → copy the id column value
 *   --file   : Supabase Dashboard → Storage → recipe-photos → open the user folder → copy the filename
 *
 * What it does:
 *   1. Looks up the recipe to get the user_id (needed to find the file in Storage)
 *   2. Downloads the original file from Storage
 *   3. Compresses with .rotate() to fix EXIF orientation
 *   4. Uploads the corrected WebP
 *   5. Updates photo_url on the recipe row
 */

import { createClient } from '@supabase/supabase-js'
import sharp            from 'sharp'

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET           = 'recipe-photos'
const MAX_DIMENSION    = 1800
const WEBP_QUALITY     = 82

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars.')
  process.exit(1)
}

// ─── Parse args ────────────────────────────────────────────────────────────────

function getArg(flag) {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : null
}

const recipeId    = getArg('--recipe')
const originalFile = getArg('--file')

if (!recipeId || !originalFile) {
  console.error('Usage:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<key> node --env-file=.env scripts/fixOnePhoto.mjs \\')
  console.error('    --recipe <recipe-uuid> \\')
  console.error('    --file   <original-filename>   (e.g. 1712300000000.jpg)')
  process.exit(1)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getPublicUrl(supabase, path) {
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1. Look up the recipe to get its user_id and name
  console.log(`Looking up recipe ${recipeId}…`)
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .select('id, user_id, name, photo_url')
    .eq('id', recipeId)
    .single()

  if (recipeErr || !recipe) {
    console.error('Recipe not found:', recipeErr?.message ?? 'no row returned')
    process.exit(1)
  }

  console.log(`  Recipe : "${recipe.name}"`)
  console.log(`  User   : ${recipe.user_id}`)
  console.log(`  Current photo_url: ${recipe.photo_url ?? '(none)'}`)

  // 2. Build the storage path and download the original
  const storagePath = `${recipe.user_id}/${originalFile}`
  const originalUrl = getPublicUrl(supabase, storagePath)

  console.log(`\nDownloading original: ${storagePath}`)
  const res = await fetch(originalUrl)
  if (!res.ok) {
    console.error(`Download failed: HTTP ${res.status}`)
    console.error(`Check that the file exists in Storage at: ${storagePath}`)
    process.exit(1)
  }
  const originalBuffer = Buffer.from(await res.arrayBuffer())
  console.log(`  Downloaded: ${formatBytes(originalBuffer.byteLength)}`)

  // 3. Compress with orientation fix
  console.log('Compressing with orientation fix…')
  const compressedBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
  console.log(`  Compressed: ${formatBytes(compressedBuffer.byteLength)}`)

  // 4. Upload corrected WebP
  const newPath = `${recipe.user_id}/${Date.now()}.webp`
  console.log(`\nUploading corrected WebP: ${newPath}`)
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, compressedBuffer, { contentType: 'image/webp', upsert: false })

  if (uploadErr) {
    console.error('Upload failed:', uploadErr.message)
    process.exit(1)
  }

  const newUrl = getPublicUrl(supabase, newPath)

  // 5. Update recipe row
  console.log('Updating recipe row…')
  const { error: updateErr } = await supabase
    .from('recipes')
    .update({ photo_url: newUrl })
    .eq('id', recipeId)

  if (updateErr) {
    console.error('DB update failed:', updateErr.message)
    process.exit(1)
  }

  console.log('\n✓ Done.')
  console.log(`  New photo_url: ${newUrl}`)
}

run().catch(e => { console.error(e); process.exit(1) })
