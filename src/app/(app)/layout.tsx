import BottomNavBar from '@/components/bottom-nav-bar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-app-gradient">
      <main className="pb-20">{children}</main>
      <BottomNavBar />
    </div>
  );
}
