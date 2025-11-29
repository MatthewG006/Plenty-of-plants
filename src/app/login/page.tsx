import PublicRoute from "@/components/auth/PublicRoute";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <PublicRoute>
      <main
        className="flex min-h-screen items-center justify-center p-4"
        style={{
          backgroundImage: "linear-gradient(to top, rgba(83, 223, 129, 0.8), rgba(83, 223, 129, 0.05)), url('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.appspot.com/o/splash-bg.png?alt=media&token=ba86f593-e391-48c8-99cc-babbfb594b1b')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <LoginForm />
      </main>
    </PublicRoute>
  );
}
