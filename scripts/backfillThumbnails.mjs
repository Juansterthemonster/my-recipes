/**
 * backfillThumbnails.mjs
 *
 * Creates the small card copies (<name>_640.webp and <name>_960.webp) for photos
 * already in the R2 bucket. New uploads make these automatically; this is a
 * one-time job for older photos. Originals are never changed or deleted.
 * Safe to re-run: photos that already have both copies are skipped.
 *
 * USAGE (needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 * — the same values that are in Vercel's environment variables):
 *
 *   # Dry run, only lists what it would do:
 *   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET_NAME=… \
 *     node scripts/backfillThumbnails.mjs
 *
 *   # Do it:
 *   … node scripts/backfillThumbnails.mjs --commit
 */
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env
const COMMIT = process.argv.includes('--commit')
const SIZES = [640, 960]
const QUALITY = 90

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Missing R2_* environment variables (see the header of this file).')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const keys = new Set()
let token
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: 'mi-sazon/', ContinuationToken: token }))
  for (const o of r.Contents || []) keys.add(o.Key)
  token = r.IsTruncated ? r.NextContinuationToken : undefined
} while (token)

const isThumb = k => /_(640|960)\.webp$/.test(k)
const EXT = /\.(webp|png|jpe?g)$/i
const baseOf = k => k.replace(EXT, '')
const originals = [...keys].filter(k => EXT.test(k) && !isThumb(k))
const todo = originals.filter(k => SIZES.some(w => !keys.has(`${baseOf(k)}_${w}.webp`)))

console.log(`${originals.length} originals, ${todo.length} need thumbnails. ${COMMIT ? 'COMMIT mode' : 'DRY RUN (add --commit to write)'}`)

let done = 0, failed = 0
for (const key of todo) {
  if (!COMMIT) { console.log('would process', key); continue }
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    const input = Buffer.from(await obj.Body.transformToByteArray())
    for (const w of SIZES) {
      const tkey = `${baseOf(key)}_${w}.webp`
      if (keys.has(tkey)) continue
      const out = await sharp(input).rotate().resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY }).toBuffer()
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME, Key: tkey, Body: out, ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }))
    }
    done++
    if (done % 20 === 0) console.log(`  ${done}/${todo.length}`)
  } catch (e) {
    failed++
    console.error('FAILED', key, e.message)
  }
}
if (COMMIT) console.log(`Done. ${done} processed, ${failed} failed.`)
