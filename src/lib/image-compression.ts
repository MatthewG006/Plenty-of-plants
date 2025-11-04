
// Helper function to compress an image
export async function compressImage(dataUri: string, maxSize = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        // This is the crucial fix for tainted canvas errors when loading from a URL.
        img.crossOrigin = 'anonymous'; 
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            // Use JPEG with a quality setting of 80%
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}

// Helper function to make white backgrounds transparent
export async function makeBackgroundTransparent(url: string, threshold = 240): Promise<string> {
    
    // 1. Fetch the image data and convert to a blob
    const response = await fetch(url);
    if (!response.ok) {
        console.warn("Failed to fetch image for transparency, returning original url");
        return url;
    }
    const blob = await response.blob();

    // 2. Create a data URL from the blob
    const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    // 3. Process the data URL on the canvas
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const { width, height } = img;
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, width, height);
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
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            // This path is less likely now, but kept as a safeguard.
            console.error("Error loading image data URI onto canvas:", err);
            resolve(url);
        };
        img.src = dataUri;
    });
}

// Helper function to check if an image is all black
export async function isImageBlack(dataUri: string, threshold = 10): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // We can check a smaller version for performance
            const checkSize = 100;
            canvas.width = checkSize;
            canvas.height = checkSize;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for black image check'));
            }

            ctx.drawImage(img, 0, 0, checkSize, checkSize);

            try {
                const imageData = ctx.getImageData(0, 0, checkSize, checkSize);
                const data = imageData.data;
                let blackPixels = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    // Check if the pixel is black or very dark
                    if (r < threshold && g < threshold && b < threshold) {
                        blackPixels++;
                    }
                }
                
                // If over 95% of pixels are black, consider it a black image
                const totalPixels = checkSize * checkSize;
                resolve((blackPixels / totalPixels) > 0.95);

            } catch (e) {
                console.error("Error checking image data:", e);
                // If we can't read the data (e.g., tainted canvas), assume it's not black to be safe
                resolve(false);
            }
        };
        img.onerror = () => {
            // If the image fails to load, it's not a valid plant, so we can consider it a failure.
            // This might be caught by other parts of the app, but it's good to handle here.
            resolve(true); 
        };
        img.src = dataUri;
    });
}
