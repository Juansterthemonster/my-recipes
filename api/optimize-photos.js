// Photo optimizer. Makes the small copies (<name>_640.webp, _960.webp, _1280.webp) for any
// photo in the R2 bucket that doesn't have them yet (for example photos uploaded from the iPhone
// app, which doesn't make copies). Originals are never changed or deleted.
//
// Called two ways:
//   GET  from the weekly Vercel cron (vercel.json). Vercel sends  Authorization: Bearer $CRON_SECRET
//   POST from the admin dashboard "Run now" button, with the signed-in admin's session token.
// Every run writes one row to photo_optimization_runs (read by the admin dashboard).
//
// Env (Vercel): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const SIZES = [640, 960, 1280]
const QUALITY = 90
const MAX_PHOTOS = 40        // photos per run; the rest are reported as "remaining"
const TIME_BUDGET_MS = 45000 // stop starting new photos after this (function limit is 60 s)

const EXT = /\.(webp|png|jpe?g)$/i
const isThumb = k => /_(640|960|1280)\.webp$/.test(k)
const baseOf = k => k.replace(EXT, '')

async function authorize(req) {
  const auth = req.headers.authorization || ''
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET
    return secret && auth === `Bearer ${secret}` ? 'cron' : null
  }
  if (req.method === 'POST' && auth.startsWith('Bearer ')) {
    const user = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    })
    const { data, error } = await user.rpc('is_admin')
    return !error && data === true ? 'manual' : null
  }
  return null
}

export default async function handler(req, res) {
  const trigger = await authorize(req)
  if (!trigger) { res.status(401).json({ error: 'Not allowed' }); return }

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    res.status(500).json({ error: 'R2 env vars not configured on the server' }); return
  }

  const started = Date.now()
  const run = { trigger, scanned: 0, optimized: 0, copies_made: 0, failed: 0, remaining: 0, duration_ms: 0, error: null }

  try {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    })

    const keys = new Set()
    let token
    do {
      const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: 'mi-sazon/', ContinuationToken: token }))
      for (const o of r.Contents || []) keys.add(o.Key)
      token = r.IsTruncated ? r.NextContinuationToken : undefined
    } while (token)

    const originals = [...keys].filter(k => EXT.test(k) && !isThumb(k))
    const todo = originals.filter(k => SIZES.some(w => !keys.has(`${baseOf(k)}_${w}.webp`)))
    run.scanned = originals.length

    let handled = 0
    for (const key of todo) {
      if (handled >= MAX_PHOTOS || Date.now() - started > TIME_BUDGET_MS) break
      handled++
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
        const input = Buffer.from(await obj.Body.transformToByteArray())
        const base = sharp(input).rotate()
        let made = 0
        for (const w of SIZES) {
          const tkey = `${baseOf(key)}_${w}.webp`
          if (keys.has(tkey)) continue
          const out = await base.clone()
            .resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY }).toBuffer()
          await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME, Key: tkey, Body: out, ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }))
          made++
        }
        run.optimized++
        run.copies_made += made
      } catch (e) {
        run.failed++
        console.error('optimize-photos failed', key, e)
      }
    }
    run.remaining = Math.max(0, todo.length - handled)
  } catch (e) {
    console.error('optimize-photos error', e)
    run.error = String(e?.message || e).slice(0, 500)
  }

  run.duration_ms = Date.now() - started

  let logged = false
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await admin.from('photo_optimization_runs').insert(run)
    if (error) console.error('optimize-photos: could not log run', error)
    else logged = true
  }

  res.status(run.error ? 500 : 200).json({ ...run, logged })
}
