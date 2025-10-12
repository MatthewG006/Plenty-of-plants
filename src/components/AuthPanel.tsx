// components/AuthPanel.tsx
import { auth } from "../lib/firebaseClient";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function AuthPanel() {
  const [user, loading] = useAuthState(auth);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert("Sign-in failed");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="p-2 text-gray-500">Loading user...</div>;
  }

  return (
    <div className="flex items-center justify-between border p-2 rounded bg-white shadow mb-4">
      {user ? (
        <>
          <div className="flex items-center gap-2">
            <img
              src={user.photoURL ?? "/default-avatar.png"}
              alt={user.displayName ?? "User"}
              className="w-8 h-8 rounded-full"
            />
            <span className="text-sm font-medium">
              {user.displayName ?? "User"}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
          >
            Sign Out
          </button>
        </>
      ) : (
        <button
          onClick={handleSignIn}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
        >
          Sign In with Google
        </button>
      )}
    </div>
  );
}
