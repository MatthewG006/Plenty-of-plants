'use server';

import { Canvas, loadImage } from 'canvas';

/**
 * Takes an image URL, fetches it on the server, and processes it to make
 * any white or near-white background transparent.
 * @param url The URL of the image to process.
 * @param threshold The tolerance for what is considered "white". 0-255.
 * @returns A base64 data URI of the processed PNG image.
 */
export async function getTransparentImageAction(url: string, threshold = 240): Promise<string> {
    if (!url || url.startsWith('data:')) {
        return url; // Return if it's already a data URI or empty
    }

    try {
        const image = await loadImage(url);
        const canvas = new Canvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context on the server.');
        }

        ctx.drawImage(image, 0, 0);

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
        console.error(`Failed to process image on server for URL: ${url}`, error);
        // In case of an error on the server, just return the original URL.
        // The client will display the non-transparent image, which is better than a broken one.
        return url;
    }
}
