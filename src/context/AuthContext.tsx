
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase/provider";
import type { GameData } from "@/interfaces/plant";

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
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameDataLoading, setGameDataLoading] = useState(true);

  useEffect(() => {
    // This effect runs when the user state changes.
    if (user && db) {
      setGameDataLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setGameData(doc.data() as GameData);
        } else {
          setGameData(null);
        }
        setGameDataLoading(false);
      }, (error) => {
        console.error("Error fetching game data:", error);
        setGameData(null);
        setGameDataLoading(false);
      });

      return () => unsubscribeSnapshot();
    } else if (!user) {
      // No user, clear data and set loading to false.
      setGameData(null);
      setGameDataLoading(false);
    }
  }, [user, db]);

  const contextValue = {
    user,
    gameData,
    loading: userLoading || gameDataLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
