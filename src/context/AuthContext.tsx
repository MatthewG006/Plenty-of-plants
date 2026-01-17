
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
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
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // First, clean up any existing Firestore listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setGameData(docSnap.data() as GameData);
          } else {
            try {
              // This is a new user, create their document.
              // The listener will automatically pick up the newly created document.
              await createUserDocument(user);
            } catch (error) {
              console.error("Error creating user document:", error);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setLoading(false); // Stop loading even if there's an error
        });
      } else {
        setUser(null);
        setGameData(null);
        setLoading(false);
      }
    });

    // Cleanup function for the useEffect hook
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);


  return (
    <AuthContext.Provider value={{ user, gameData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
