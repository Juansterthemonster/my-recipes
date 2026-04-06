/**
 * uploadToCloudinary.js
 *
 * Uploads a compressed image Blob to Cloudinary using an unsigned upload preset.
 * No API secret required — safe to call directly from the browser.
 *
 * Env vars needed (add to .env):
 *   VITE_CLOUDINARY_CLOUD_NAME    — your cloud name (e.g. "dxyz123")
 *   VITE_CLOUDINARY_UPLOAD_PRESET — unsigned preset name (e.g. "mi-sazon")
 *
 * @param {Blob}   blob     - compressed image blob (already WebP from compressImage)
 * @param {string} publicId - use the recipe ID so each photo is identifiable in Cloudinary
 * @returns {Promise<string>} - the secure_url of the uploaded image
 */

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadToCloudinary(blob, publicId) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary env vars not set. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env')
  }

  const formData = new FormData()
  formData.append('file', blob)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'mi-sazon')
  if (publicId) formData.append('public_id', publicId)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Cloudinary upload failed (${res.status})`)
  }

  const data = await res.json()
  return data.secure_url
}
