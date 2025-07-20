import admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

admin.initializeApp();

export const deleteUser = onCall({
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
        
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (userDoc.exists) {
                transaction.delete(userDocRef);
            }
        });
        logger.info(`Successfully deleted Firestore document for UID: ${uid}`);

        await admin.auth().deleteUser(uid);
        logger.info(`Successfully deleted Auth user for UID: ${uid}`);

        return { success: true, message: `User ${uid} successfully deleted.` };

    } catch (error) {
        logger.error(`Failed to delete user ${uid}:`, error);
        if (error instanceof Error) {
            throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
        }
        throw new HttpsError('internal', 'An unknown error occurred while deleting the user.');
    }
});
