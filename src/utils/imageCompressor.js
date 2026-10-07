// Image Compression Utility for Fast Mobile Uploads & Google Drive Optimization

export async function compressImage(source, maxWidth = 1600, quality = 0.82) {
  if (!source) return source;

  // Skip videos or non-image data
  if (typeof source === 'string' && source.startsWith('data:video')) {
    return source;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio while capping width at maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Export as optimized JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      resolve(source); // Fallback to original if compression fails
    };

    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}
