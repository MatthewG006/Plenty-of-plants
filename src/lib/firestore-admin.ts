
import { adminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function purchaseFertilizer(userId: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(userId);
  await userRef.update({
    fertilizerCount: FieldValue.increment(1),
  });
}
