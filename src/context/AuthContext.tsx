
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { type User } from "firebase/auth";
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
  const contextValue = {
    user: null,
    gameData: null,
    loading: false, // Immediately set loading to false for public view
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
