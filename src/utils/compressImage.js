/**
 * Compress and resize an image file in the browser using Canvas.
 * Converts to WebP for ~30% smaller files at equal perceived quality.
 *
 * @param {File|Blob} file      - The original image file from a file input
 * @param {object}   [opts]
 * @param {number}   [opts.maxDimension=1600] - Longest edge cap in px; smaller images are untouched
 * @param {number}   [opts.quality=0.82]      - WebP quality, 0–1
 * @returns {Promise<Blob>}     - Compressed WebP blob, ready to upload
 */
/**
 * Copy a picked file into memory right away. On Android the file picker can hand
 * over a temporary / cloud-backed handle (Photos, Lightroom, etc.) whose access
 * lapses by the time the user taps Save, which shows up as "failed to load image".
 * Reading the bytes at pick time avoids that. Falls back to the original file.
 */
export async function snapshotFile(file) {
  try {
    const buf = await file.arrayBuffer()
    return new Blob([buf], { type: file.type || 'image/jpeg' })
  } catch (e) {
    console.warn('snapshotFile failed, using original file', e)
    return file
  }
}

function decodeWithImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error('compressImage: timed out reading image'))
    }, 30000)
    img.onload = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve({ source: img, width: img.width, height: img.height })
    }
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error('compressImage: failed to load image'))
    }
    img.src = url
  })
}

async function decode(file) {
  // createImageBitmap handles some files <img> rejects, and avoids blob-URL issues
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return { source: bmp, width: bmp.width, height: bmp.height }
    } catch { /* fall through to <img> */ }
  }
  try {
    return await decodeWithImage(file)
  } catch {
    // One retry after a short pause — transient read failures often clear up
    await new Promise(r => setTimeout(r, 400))
    return await decodeWithImage(file)
  }
}

export async function compressImage(file, { maxDimension = 1800, quality = 0.82 } = {}) {
  const { source, width, height } = await decode(file)

  // Scale down only if the image exceeds maxDimension on either axis
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(source, 0, 0, w, h)
  if (source.close) source.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob
        ? resolve(blob)
        : reject(new Error('compressImage: canvas.toBlob returned null')),
      'image/webp',
      quality
    )
  })
}
