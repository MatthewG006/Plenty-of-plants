import PublicRoute from "@/components/auth/PublicRoute";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <PublicRoute>
      <main className="flex min-h-screen items-center justify-center bg-splash-image p-4">
        <LoginForm />
      </main>
    </PublicRoute>
  );
}
