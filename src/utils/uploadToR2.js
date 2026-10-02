// Drop-in replacement for uploadToCloudinary.js.
// Uploads directly to Cloudflare R2 using a short-lived presigned URL
// fetched from our own /api/presign-upload serverless function, so the
// R2 secret keys never reach the browser.

// fetch() with a hard timeout — a stalled request rejects instead of hanging forever.
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Upload timed out')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export async function uploadToR2(blob, publicId) {
  const contentType = blob.type || 'image/webp'

  const presignRes = await fetchWithTimeout('/api/presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, contentType }),
  }, 20000)

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}))
    throw new Error(err.error || `Failed to get upload URL (${presignRes.status})`)
  }

  const { uploadUrl, publicUrl } = await presignRes.json()

  const uploadRes = await fetchWithTimeout(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  }, 60000)

  if (!uploadRes.ok) {
    throw new Error(`R2 upload failed (${uploadRes.status})`)
  }

  return publicUrl
}
