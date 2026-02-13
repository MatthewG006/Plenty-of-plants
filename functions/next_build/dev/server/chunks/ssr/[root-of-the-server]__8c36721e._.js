module.exports = [
"[project]/src/app/actions/draw-plant.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4027afb637f29f38395829cf7e6f584d059f4973b1":"drawPlantAction"},"",""] */ __turbopack_context__.s([
    "drawPlantAction",
    ()=>drawPlantAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$storage$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/storage/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/storage/dist/node-esm/index.node.esm.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$app$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/app/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@firebase/app/dist/esm/index.esm.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
const firebaseConfig = {
    apiKey: ("TURBOPACK compile-time value", "AIzaSyBxgn4A1fMUdIwUKdDh4KWyjJTSle2dXQE"),
    authDomain: ("TURBOPACK compile-time value", "plentyofplants-108e8.firebaseapp.com"),
    projectId: ("TURBOPACK compile-time value", "plentyofplants-108e8"),
    storageBucket: ("TURBOPACK compile-time value", "plentyofplants-108e8.appspot.com"),
    messagingSenderId: ("TURBOPACK compile-time value", "317861154450"),
    appId: ("TURBOPACK compile-time value", "1:317861154450:web:3a586f3cc5b1c42e64e04b")
};
async function drawPlantAction(existingImageFilenames) {
    try {
        const app = !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getApps"])().length ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getApp"])();
        const storage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getStorage"])(app);
        const fallbackPlantsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ref"])(storage, 'fallback-plants');
        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["listAll"])(fallbackPlantsRef);
        const allImageRefs = res.items;
        if (allImageRefs.length === 0) {
            throw new Error('No fallback images found in storage.');
        }
        // Filter out images the user already has
        let availableImageRefs = allImageRefs.filter((imageRef)=>{
            const filename = imageRef.name.split('/').pop() || '';
            return !existingImageFilenames.includes(filename);
        });
        // If the user has all plants, fall back to the full list
        if (availableImageRefs.length === 0) {
            availableImageRefs = allImageRefs;
        }
        const randomFileRef = availableImageRefs[Math.floor(Math.random() * availableImageRefs.length)];
        const imageURL = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$firebase$2f$storage$2f$dist$2f$node$2d$esm$2f$index$2e$node$2e$esm$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDownloadURL"])(randomFileRef);
        // Fetch the image data on the server
        const imageResponse = await fetch(imageURL);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        const dataUri = `data:${contentType};base64,${imageBase64}`;
        const filename = randomFileRef.name.split('/').pop() || 'unknown';
        const name = filename.toLowerCase() // Convert to lowercase to ensure consistency
        .replace(/\.(png|jpg|jpeg)$/i, '').replace(/[-_]/g, ' ').split(' ').map((word)=>word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return {
            name: name,
            description: `A lovely ${name} that just sprouted.`,
            imageDataUri: dataUri,
            // Send the filename so the client can track it
            hint: filename
        };
    } catch (error) {
        console.error("Error in drawPlantAction:", error);
        // Rethrow a more generic error to the client to avoid exposing server details.
        throw new Error("Failed to get a fallback plant due to a server error.");
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    drawPlantAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(drawPlantAction, "4027afb637f29f38395829cf7e6f584d059f4973b1", null);
}),
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[project]/src/app/actions/image-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"403c35d5c3be373c2d1bf61f77c8d22168d8181f48":"getImageDataUriAction","70ce5453e93e6b05354fe63628fa510771d6483205":"uploadImageAction"},"",""] */ __turbopack_context__.s([
    "getImageDataUriAction",
    ()=>getImageDataUriAction,
    "uploadImageAction",
    ()=>uploadImageAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs/promises [external] (fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin [external] (firebase-admin, cjs, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
// Constants
const DEFAULT_BUCKET_NAME = 'plentyofplants-108e8.firebasestorage.app';
function getStorageBucketName() {
    const envBucket = ("TURBOPACK compile-time value", "plentyofplants-108e8.appspot.com");
    if (envBucket && envBucket.trim() !== '') {
        return envBucket;
    }
    return DEFAULT_BUCKET_NAME;
}
// Initialize Firebase Admin SDK
if (!__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["apps"].length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const storageBucket = getStorageBucketName();
    console.log(`Initializing Firebase Admin SDK. Storage Bucket: ${storageBucket}`);
    if (privateKey && projectId && clientEmail) {
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["initializeApp"]({
                credential: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["credential"].cert({
                    projectId: projectId,
                    clientEmail: clientEmail,
                    // When storing the private key in an environment variable, you need to replace the `\n` characters.
                    privateKey: privateKey.replace(/\\n/g, '\n')
                }),
                storageBucket: storageBucket
            });
        } catch (e) {
            console.error("Error initializing Firebase Admin SDK with credentials:", e);
        }
    } else {
        // Try initializing with default credentials (works in Cloud Functions)
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["initializeApp"]({
                storageBucket: storageBucket
            });
            console.log("Initialized Firebase Admin SDK with default credentials.");
        } catch (e) {
            console.warn("Failed to initialize Firebase Admin SDK with default credentials:", e);
        }
    }
}
async function getImageDataUriAction(imageUrl) {
    try {
        let imageBuffer;
        let contentType;
        const firebaseStoragePattern = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/;
        const match = imageUrl.match(firebaseStoragePattern);
        if (match && match[1]) {
            // It's a Firebase Storage URL, use Admin SDK if available
            if (__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["apps"].length > 0) {
                const filePath = decodeURIComponent(match[1]);
                const bucketName = getStorageBucketName();
                const bucket = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["storage"]().bucket(bucketName);
                const file = bucket.file(filePath);
                try {
                    const [data] = await file.download();
                    imageBuffer = data;
                    const [metadata] = await file.getMetadata();
                    contentType = metadata.contentType || 'image/png';
                } catch (sdkError) {
                    console.error(`Firebase Admin SDK failed to download ${filePath} from ${bucketName}. Falling back to fetch.`, sdkError);
                    // Fallback to fetch if SDK fails
                    const imageResponse = await fetch(imageUrl);
                    if (!imageResponse.ok) {
                        throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
                    }
                    const arrayBuffer = await imageResponse.arrayBuffer();
                    imageBuffer = Buffer.from(arrayBuffer);
                    contentType = imageResponse.headers.get('content-type') || 'image/png';
                }
            } else {
                // Fallback to fetch if Admin SDK is not initialized
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
                }
                const arrayBuffer = await imageResponse.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
                contentType = imageResponse.headers.get('content-type') || 'image/png';
            }
        } else if (imageUrl.startsWith('/')) {
            // It's a local file
            const filePath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'public', imageUrl);
            imageBuffer = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].readFile(filePath);
            const extension = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].extname(filePath).toLowerCase();
            switch(extension){
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
            // It's some other external URL, use fetch
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            contentType = imageResponse.headers.get('content-type') || 'image/png';
        }
        const imageBase64 = imageBuffer.toString('base64');
        const dataUri = `data:${contentType};base64,${imageBase64}`;
        return dataUri;
    } catch (error) {
        console.error("Error in getImageDataUriAction:", error);
        throw new Error(`Failed to get image data URI due to a server error: ${error.message}`);
    }
}
async function uploadImageAction(uid, plantId, dataUri) {
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["apps"].length === 0) {
        throw new Error("Cannot upload image: Firebase Admin SDK is not initialized. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set or default credentials are available.");
    }
    try {
        const bucketName = getStorageBucketName();
        console.log(`uploadImageAction: Using bucket ${bucketName}`);
        const bucket = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["storage"]().bucket(bucketName);
        // Convert plantId to string to be safe
        const filePath = `users/${uid}/plants/${plantId}/${Date.now()}.jpg`;
        const file = bucket.file(filePath);
        const base64 = dataUri.split(',')[1];
        if (!base64) {
            throw new Error('Invalid data URI provided for upload.');
        }
        const buffer = Buffer.from(base64, 'base64');
        await file.save(buffer, {
            metadata: {
                contentType: 'image/jpeg'
            }
        });
        // Generate a public URL. Since we are using Firebase Storage, 
        // we can construct the URL directly if the bucket is public, 
        // or get a signed URL. A signed URL is safer.
        // For long-term access, a download token is better, but getSignedUrl is easier here.
        // Let's use getSignedUrl with a very long expiration.
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });
        return url;
    } catch (error) {
        console.error("Error in uploadImageAction:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getImageDataUriAction,
    uploadImageAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getImageDataUriAction, "403c35d5c3be373c2d1bf61f77c8d22168d8181f48", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(uploadImageAction, "70ce5453e93e6b05354fe63628fa510771d6483205", null);
}),
"[externals]/perf_hooks [external] (perf_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("perf_hooks", () => require("perf_hooks"));

module.exports = mod;
}),
"[externals]/node:perf_hooks [external] (node:perf_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:perf_hooks", () => require("node:perf_hooks"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/process [external] (process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("process", () => require("process"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/async_hooks [external] (async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("async_hooks", () => require("async_hooks"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/dns [external] (dns, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("dns", () => require("dns"));

module.exports = mod;
}),
"[externals]/dgram [external] (dgram, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("dgram", () => require("dgram"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/vm [external] (vm, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("vm", () => require("vm"));

module.exports = mod;
}),
"[externals]/tty [external] (tty, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tty", () => require("tty"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/querystring [external] (querystring, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("querystring", () => require("querystring"));

module.exports = mod;
}),
"[externals]/node:events [external] (node:events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:events", () => require("node:events"));

module.exports = mod;
}),
"[externals]/node:process [external] (node:process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:process", () => require("node:process"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[project]/src/app/actions/plant-chat.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"009687a053b3c1e60cc91fe28b8009736a25b79015":"plantADay","4015b7f79511079e26882a4579abfcb73227443f97":"generateImage","40f98cca8ddfce0acb59341aba1302e3e5ff82941e":"plantChatAction","40fe0fce67145a59c082667cd5f9c59f2278e83633":"generateText"},"",""] */ __turbopack_context__.s([
    "generateImage",
    ()=>generateImage,
    "generateText",
    ()=>generateText,
    "plantADay",
    ()=>plantADay,
    "plantChatAction",
    ()=>plantChatAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$genkit$2f$lib$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/genkit/lib/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$genkit$2f$lib$2f$genkit$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/genkit/lib/genkit.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$genkit$2d$ai$2f$google$2d$genai$2f$lib$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@genkit-ai/google-genai/lib/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$genkit$2d$ai$2f$google$2d$genai$2f$lib$2f$googleai$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@genkit-ai/google-genai/lib/googleai/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
// Initialize a single AI client with the Google AI plugin
const ai = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$genkit$2f$lib$2f$genkit$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["genkit"])({
    plugins: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$genkit$2d$ai$2f$google$2d$genai$2f$lib$2f$googleai$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["googleAI"])()
    ]
});
async function generateText(prompt) {
    if (!prompt) throw new Error("Prompt is required");
    const response = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        prompt
    });
    return response.text;
}
async function plantADay() {
    const prompt = "Give me a random plant name and a short description.";
    const response = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        prompt
    });
    return response.text;
}
async function generateImage(plantName) {
    if (!plantName) throw new Error("plantName is required");
    // Using a text-to-image prompt
    const prompt = `Generate a high-quality realistic image of the plant: ${plantName}`;
    const { media } = await ai.generate({
        model: 'googleai/imagen-3-fast-generate-001',
        prompt
    });
    return {
        imageUrl: media?.url ?? ""
    };
}
const plantChatAction = async (input)=>{
    const { plantName, plantPersonality, userMessage, form } = input;
    const persona = `You are a ${plantName} with a ${plantPersonality} personality. Your current form is ${form}.`;
    const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: `${persona}\n\n${userMessage}`
    });
    return {
        response: response.text
    };
};
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    generateText,
    plantADay,
    generateImage,
    plantChatAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(generateText, "40fe0fce67145a59c082667cd5f9c59f2278e83633", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(plantADay, "009687a053b3c1e60cc91fe28b8009736a25b79015", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(generateImage, "4015b7f79511079e26882a4579abfcb73227443f97", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(plantChatAction, "40f98cca8ddfce0acb59341aba1302e3e5ff82941e", null);
}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/actions/draw-plant.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/actions/image-actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE2 => \"[project]/src/app/actions/plant-chat.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$draw$2d$plant$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/draw-plant.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$image$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/image-actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$plant$2d$chat$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/plant-chat.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/actions/draw-plant.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/actions/image-actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE2 => \"[project]/src/app/actions/plant-chat.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "4027afb637f29f38395829cf7e6f584d059f4973b1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$draw$2d$plant$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["drawPlantAction"],
    "40f98cca8ddfce0acb59341aba1302e3e5ff82941e",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$plant$2d$chat$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["plantChatAction"],
    "70ce5453e93e6b05354fe63628fa510771d6483205",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$image$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["uploadImageAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$actions$2f$draw$2d$plant$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$app$2f$actions$2f$image$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE2__$3d3e$__$225b$project$5d2f$src$2f$app$2f$actions$2f$plant$2d$chat$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/actions/draw-plant.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/app/actions/image-actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE2 => "[project]/src/app/actions/plant-chat.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$draw$2d$plant$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/draw-plant.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$image$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/image-actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$plant$2d$chat$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/plant-chat.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8c36721e._.js.map