


// Helper function to compress an image
export async function compressImage(dataUri: string, maxSize = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
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
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}

// This client-side function is no longer used for cross-origin images.
// The core logic has been moved to a server action to bypass CORS.
// It is kept here in case it is needed for same-origin data URIs in the future.
export async function makeBackgroundTransparent(url: string, threshold = 240): Promise<string> {
    if (!url) {
        return url;
    }

    if (!url.startsWith('data:')) {
       console.warn("makeBackgroundTransparent should be called with a data URI. URL was passed:", url);
       // Fallback for safety, but this indicates a logic error elsewhere.
       return url;
    }

    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject('Could not get canvas context');
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (r > threshold && g > threshold && b > threshold) {
                    data[i + 3] = 0; // Set alpha to 0 for white pixels
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            console.error("Error processing image data URI:", err);
            reject(err);
        };
        img.src = url;
    });
}


// Helper function to check if an image is all black
export async function isImageBlack(dataUri: string, threshold = 10): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
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
                    if (r < threshold && g < threshold && b < threshold) {
                        blackPixels++;
                    }
                }
                
                const totalPixels = checkSize * checkSize;
                resolve((blackPixels / totalPixels) > 0.95);

            } catch (e) {
                console.error("Error checking image data:", e);
                resolve(false);
            }
        };
        img.onerror = () => {
            resolve(true); 
        };
        img.src = dataUri;
    });
}
