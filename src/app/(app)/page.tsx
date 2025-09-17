import AuthGuard from "@/components/auth/AuthGuard";
import HomeContent from "@/components/home/HomeContent";

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}
