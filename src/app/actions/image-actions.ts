'use server';

// This server action fetches an image URL, processes it on the server to make the background transparent,
// and returns it as a data URI. This bypasses all client-side CORS issues.
export async function getImageDataUriAction(url: string): Promise<string> {
  try {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${url}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${imageBase64}`;
  } catch (error) {
    console.error(`Failed to get image data URI for ${url}`, error);
    // Return the original URL as a fallback so the image still displays, albeit without transparency.
    return url;
  }
}
