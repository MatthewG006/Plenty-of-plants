
// Helper function to compress an image
export async function compressImage(dataUri: string, maxSize = 128): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous'; // Fix for tainted canvas error
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
            // Use JPEG with a lower quality setting for better compression
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = dataUri;
    });
}

// Helper function to make white backgrounds transparent
export async function makeBackgroundTransparent(dataUri: string, threshold = 240): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
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
        img.onerror = reject;
        img.src = dataUri;
    });
}
