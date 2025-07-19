
import BottomNavBar from '@/components/bottom-nav-bar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full">
      <main className="pb-24">{children}</main>
      <BottomNavBar />
    </div>
  );
}
