
import { NextResponse } from 'next/server';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const userDocRef = doc(db, 'users', userId);

        await updateDoc(userDocRef, {
            fertilizerCount: increment(1)
        });

        return NextResponse.json({ status: 'success' });

    } catch (error: any) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: error.message || 'An internal error occurred' }, { status: 500 });
    }
}

    