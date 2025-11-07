'use server';

// This server action acts as a proxy to fetch an image URL.
// It bypasses client-side CORS issues by fetching the data on the server.
// It returns the image as a data URI, which the client can then process.
export async function getImageDataUriAction(url: string): Promise<string> {
    try {
        if (!url) {
            throw new Error('No image URL provided.');
        }

        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        return `data:${contentType};base64,${imageBase64}`;

    } catch (error: any) {
        console.error("Error in getImageDataUriAction:", error);
        // Rethrow a more generic error to the client
        throw new Error("Server failed to retrieve image data.");
    }
}
