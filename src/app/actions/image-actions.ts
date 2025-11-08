
'use server';

import { headers } from 'next/headers';

export async function getImageDataUriAction(imageUrl: string): Promise<string> {
  try {
    let absoluteUrl = imageUrl;
    // If the URL is relative (starts with '/'), construct an absolute URL
    if (imageUrl.startsWith('/')) {
        const heads = headers();
        const host = heads.get('host');
        if (!host) {
            throw new Error('Could not determine host from headers.');
        }
        // Use http for local development, otherwise https
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        absoluteUrl = `${protocol}://${host}${imageUrl}`;
    }

    // Fetch the image data on the server using the absolute URL
    const imageResponse = await fetch(absoluteUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from ${absoluteUrl}: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const dataUri = `data:${contentType};base64,${imageBase64}`;

    return dataUri;

  } catch (error: any) {
    console.error("Error in getImageDataUriAction:", error);
    // Rethrow a more generic error to the client to avoid exposing server details.
    throw new Error("Failed to get image data URI due to a server error.");
  }
}
