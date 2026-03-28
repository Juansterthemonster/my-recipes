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
export function compressImage(file, { maxDimension = 1800, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Scale down only if the image exceeds maxDimension on either axis
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        blob => blob
          ? resolve(blob)
          : reject(new Error('compressImage: canvas.toBlob returned null')),
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('compressImage: failed to load image'))
    }

    img.src = url
  })
}
