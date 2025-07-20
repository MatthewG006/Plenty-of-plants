
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

admin.initializeApp();

exports.deleteUser = onCall({
    enforceAppCheck: false,
    region: 'us-east1',
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const uid = request.auth.uid;

    try {
        const db = admin.firestore();
        const userDocRef = db.collection('users').doc(uid);
        
        // Delete Firestore document
        await userDocRef.delete();
        logger.info(`Successfully deleted Firestore document for UID: ${uid}`);

        // Delete Firebase Auth user
        await admin.auth().deleteUser(uid);
        logger.info(`Successfully deleted Auth user for UID: ${uid}`);

        return { success: true, message: `User ${uid} successfully deleted.` };

    } catch (error) {
        logger.error(`Failed to delete user ${uid}:`, error);
        throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
    }
});
