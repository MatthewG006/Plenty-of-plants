import PublicRoute from "@/components/auth/PublicRoute";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <PublicRoute>
      <LoginForm />
    </PublicRoute>
  );
}
