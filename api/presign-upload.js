// Vercel serverless function: generates a short-lived presigned PUT URL
// so the browser can upload directly to Cloudflare R2 without ever
// seeing the R2 secret keys. Those live only in this function's
// environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://my-recipes-sigma.vercel.app',
]

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // allow any Vercel preview deployment (*.vercel.app)
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
}

function setCors(req, res) {
  const origin = req.headers.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

// Map a small set of expected content types to safe file extensions.
// Falls back to .webp (the format our client-side compression step
// already outputs) for anything unrecognized.
const EXT_FOR_TYPE = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export default async function handler(req, res) {
  setCors(req, res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { publicId, contentType } = req.body || {}

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      res.status(500).json({ error: 'R2 env vars not configured on the server' })
      return
    }

    const safeType = EXT_FOR_TYPE[contentType] ? contentType : 'image/webp'
    const ext = EXT_FOR_TYPE[safeType] || 'webp'
    const safeId = (publicId || 'recipe').toString().replace(/[^a-zA-Z0-9_-]/g, '')
    const key = `mi-sazon/${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: safeType,
      // Filenames are unique per upload (timestamp + random suffix), so
      // it's always safe to cache the object forever at the edge/browser.
      CacheControl: 'public, max-age=31536000, immutable',
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 })
    const publicUrl = `${process.env.VITE_R2_PUBLIC_URL}/${key}`

    res.status(200).json({ uploadUrl, publicUrl })
  } catch (err) {
    console.error('presign-upload error:', err)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
}
