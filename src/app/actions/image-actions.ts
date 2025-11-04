'use server';

import { createCanvas, loadImage } from 'canvas';

// This server action fetches an image URL, processes it on the server to make the background transparent,
// and returns it as a data URI. This bypasses all client-side CORS issues.
export async function getTransparentImageAction(url: string, threshold = 240): Promise<string> {
  if (!url || url.startsWith('data:')) {
    return url;
  }

  try {
    const img = await loadImage(url);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // If the pixel is close to white, make it transparent
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0; // Set alpha to 0
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error(`Failed to process image on server: ${url}`, error);
    return url; // Fallback to the original URL on error
  }
}
