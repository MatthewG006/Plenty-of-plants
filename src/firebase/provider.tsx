'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { getAuth, getDb } from './index';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

type FirebaseContextType = {
    auth: Auth;
    db: Firestore;
};

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
    const instances = { auth: getAuth(), db: getDb() };

    return (
        <FirebaseContext.Provider value={instances}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
};

export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().db;
