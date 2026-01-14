
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import type { GameData } from "@/interfaces/plant";
import { createUserDocument } from "@/lib/firestore";

type AuthContextType = {
  user: User | null;
  gameData: GameData | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  gameData: null,
  loading: false, // Set to false for public access mode
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(false); // Set to false for public access

  useEffect(() => {
    // This is all commented out for public access mode.
    // When re-enabling auth, uncomment this block.
    /*
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setGameData(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
    */
  }, []);

  useEffect(() => {
    // This is all commented out for public access mode.
    // When re-enabling auth, uncomment this block.
    /*
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setGameData(docSnap.data() as GameData);
        } else {
            createUserDocument(user).then(newGameData => {
                setGameData(newGameData);
            });
        }
        setLoading(false);
      }, (error) => {
        console.error("Firestore subscription error:", error);
        setGameData(null);
        setLoading(false);
      });

      return () => unsubscribeFirestore();
    }
    */
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, gameData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
