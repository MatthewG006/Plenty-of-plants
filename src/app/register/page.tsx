import PublicRoute from "@/components/auth/PublicRoute";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <PublicRoute>
      <RegisterForm />
    </PublicRoute>
  );
}
