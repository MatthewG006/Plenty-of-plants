
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  // const { user, loading } = useAuth();
  // const router = useRouter();

  // useEffect(() => {
  //   if (!loading && user) {
  //     router.push("/home");
  //   }
  // }, [user, loading, router]);

  // if (loading || user) {
  //   return <LoadingSpinner />;
  // }

  return <>{children}</>;
}
