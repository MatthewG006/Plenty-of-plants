// pages/contest/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebaseClient";
import { doc, collection, onSnapshot } from "firebase/firestore";
import ContestLobby from "../../components/ContestLobby";
import { vote } from "../../lib/contestApi";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebaseClient";

export default function ContestPage() {
  const router = useRouter();
  const { id: sessionId } = router.query;
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, `contestSessions/${sessionId}`);
    const participantsRef = collection(
      db,
      `contestSessions/${sessionId}/participants`
    );

    const unsub1 = onSnapshot(sessionRef, (snap) => {
      setSession(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    const unsub2 = onSnapshot(participantsRef, (snap) => {
      setParticipants(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [sessionId]);

  const handleVote = async (participantId: string) => {
    if (!user) {
      alert("Please sign in to vote!");
      return;
    }
    try {
      await vote(sessionId as string, user.uid, participantId);
      alert("Vote submitted!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!session) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Contest: {sessionId}</h1>
      {session.status === "lobby" && (
        <ContestLobby
          participants={participants}
          session={session}
          currentUser={user}
        />
      )}
      {session.status === "voting" && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Vote for your favorite</h2>
          <div className="grid grid-cols-2 gap-4">
            {participants.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg p-2 shadow hover:shadow-lg transition"
              >
                <p className="font-bold">{p.displayName}</p>
                <img
                  src={`/plants/${p.plantId}.jpg`} // adjust to your image path
                  alt={p.displayName}
                  className="rounded mt-2"
                />
                <button
                  className="mt-2 bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600"
                  onClick={() => handleVote(p.id)}
                >
                  Vote
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {session.status === "ended" && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Voting has ended!</h2>
        </div>
      )}
    </div>
  );
}
