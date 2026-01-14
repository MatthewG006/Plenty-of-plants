'use client';

// import Splash from './Splash';
import PublicRoute from "@/components/auth/PublicRoute";
import LoginForm from "./login/LoginForm";

export default function Page() {
  // The splash screen is bypassed to go directly to the login/redirect logic.
  // return <Splash />;
  return (
    <PublicRoute>
      <main 
        className="flex min-h-screen items-center justify-center bg-cover bg-center p-4"
        style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/plentyofplants-108e8.firebasestorage.app/o/splash-bg.png?alt=media&token=ba86f593-e391-48c8-99cc-babbfb594b1b')" }}
      >
        <LoginForm />
      </main>
    </PublicRoute>
  );
}
