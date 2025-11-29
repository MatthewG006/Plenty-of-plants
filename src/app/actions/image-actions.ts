
'use server';

import { headers } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

export async function getImageDataUriAction(imageUrl: string): Promise<string> {
  try {
    let imageBuffer: ArrayBuffer;
    let contentType: string;

    // Check if the imageUrl is a relative path to a local file
    if (imageUrl.startsWith('/')) {
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        imageBuffer = await fs.readFile(filePath);
        
        const extension = path.extname(filePath).toLowerCase();
        switch (extension) {
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            default:
                contentType = 'application/octet-stream';
        }
    } else {
        // Otherwise, treat it as a full URL
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
        contentType = imageResponse.headers.get('content-type') || 'image/png';
    }

    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const dataUri = `data:${contentType};base64,${imageBase64}`;

    return dataUri;

  } catch (error: any) {
    console.error("Error in getImageDataUriAction:", error);
    // Rethrow a more generic error to the client to avoid exposing server details.
    throw new Error("Failed to get image data URI due to a server error.");
  }
}
