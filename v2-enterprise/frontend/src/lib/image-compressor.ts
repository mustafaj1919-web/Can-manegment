/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Resizes the image to fit within maxWidth/maxHeight and compresses quality to quality.
 */
export function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return resolve(file)
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Compress and convert to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file)
            }
            // Create a new File from blob
            const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            const compressedFile = new File([blob], `${nameWithoutExtension}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = (err) => {
        reject(err)
      }
    }
    reader.onerror = (err) => {
      reject(err)
    }
  })
}
