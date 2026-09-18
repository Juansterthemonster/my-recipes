// Drop-in replacement for uploadToCloudinary.js.
// Uploads directly to Cloudflare R2 using a short-lived presigned URL
// fetched from our own /api/presign-upload serverless function, so the
// R2 secret keys never reach the browser.

export async function uploadToR2(blob, publicId) {
  const contentType = blob.type || 'image/webp'

  const presignRes = await fetch('/api/presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, contentType }),
  })

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}))
    throw new Error(err.error || `Failed to get upload URL (${presignRes.status})`)
  }

  const { uploadUrl, publicUrl } = await presignRes.json()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  })

  if (!uploadRes.ok) {
    throw new Error(`R2 upload failed (${uploadRes.status})`)
  }

  return publicUrl
}
