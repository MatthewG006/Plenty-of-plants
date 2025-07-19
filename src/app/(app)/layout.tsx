
import BottomNavBar from '@/components/bottom-nav-bar';
import { AuthProvider } from '@/context/AuthContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen w-full">
        <main className="pb-24">{children}</main>
        <BottomNavBar />
      </div>
    </AuthProvider>
  );
}
