
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
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is the real authentication listener.
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? user.uid : "no user");
      setUser(user);
      if (!user) {
        // If no user is logged in, clear data and finish loading.
        setGameData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();

    /*
    // Mock user logic is commented out to enable real authentication.
    const mockUser = {
      uid: "bN5Pn6XwNgbZWG1ZqLLtFNnx8jF2",
      email: "prknitex@gmail.com",
      displayName: "prknitex",
    } as User;
    setUser(mockUser);
    */
    
  }, []);

  useEffect(() => {
    // This effect runs when the user object changes.
    // It sets up the real-time listener for the user's game data.
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setGameData(docSnap.data() as GameData);
        } else {
            // This case handles a brand new user. We create their document
            // and onSnapshot will be triggered again with the new data.
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
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, gameData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
