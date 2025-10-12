
import { AuthProvider } from "@/context/AuthContext";
import BottomNavBar from "@/components/bottom-nav-bar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <>
        <main>{children}</main>
        <BottomNavBar />
      </>
  );
}
