
import { AuthProvider } from "@/context/AuthContext";
import BottomNavBar from "@/components/bottom-nav-bar";
import AuthGuard from "@/components/auth/AuthGuard";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <AuthGuard>
        <main>{children}</main>
        <BottomNavBar />
      </AuthGuard>
  );
}
