// components/ContestLobby.tsx
import { joinSession, startVoting } from "../lib/contestApi";

interface Props {
  participants: any[];
  session: any;
  currentUser: any;
}

export default function ContestLobby({
  participants,
  session,
  currentUser,
}: Props) {
  const handleJoin = async () => {
    if (!currentUser) {
      alert("Sign in first!");
      return;
    }
    const plantId = prompt("Enter your plant ID:");
    const displayName = prompt("Enter your display name:");
    if (!plantId || !displayName) return;
    await joinSession(session.id, currentUser.uid, plantId, displayName);
  };

  const handleStartVoting = async () => {
    if (session.hostId !== currentUser?.uid) {
      alert("Only the host can start voting!");
      return;
    }
    await startVoting(session.id);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Lobby</h2>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li
            key={p.id}
            className="border rounded p-2 flex justify-between items-center"
          >
            <span>{p.displayName}</span>
            <span className="text-gray-500 text-sm">{p.plantId}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleJoin}
          className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
        >
          Join
        </button>
        {session.hostId === currentUser?.uid && (
          <button
            onClick={handleStartVoting}
            className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600"
          >
            Start Voting
          </button>
        )}
      </div>
    </div>
  );
}
