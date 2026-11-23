// Live quiz — join (T2). Public page: anyone with the game PIN can join with a
// nickname; no account needed. quiz_join returns a player token that the play
// screen presents with every call (kept in this browser only).
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserFacingError } from "@/lib/userFacingError";
import { AVATARS, QUIZ_LIMITS, liveQuiz, normalizePin, saveTicket } from "@/lib/liveQuiz";

export default function QuizJoinPage() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState(normalizePin(joinCode ?? ""));
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [step, setStep] = useState<"pin" | "name">(normalizePin(joinCode ?? "").length === 6 ? "name" : "pin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setError("");
    setBusy(true);
    try {
      const ticket = await liveQuiz.join(pin, name, avatar);
      saveTicket(ticket);
      navigate(`/quiz/play/${ticket.session_id}/${ticket.participant_id}`, { replace: true });
    } catch (e) {
      const msg = toUserFacingError(e, "Could not join the game.");
      setError(msg);
      if (/PIN not found|ended/i.test(msg)) setStep("pin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 px-4">
      <Helmet><title>Join Quiz — Vestry</title></Helmet>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-5">
        <h1 className="text-center text-2xl font-bold text-slate-900">Join a live quiz</h1>

        {step === "pin" ? (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (pin.length === 6) setStep("name"); }}>
            <div className="space-y-1">
              <Label htmlFor="game-pin">Game PIN</Label>
              <Input id="game-pin" value={pin} onChange={e => setPin(normalizePin(e.target.value))} autoFocus
                inputMode="text" autoComplete="off" placeholder="ABC123" className="text-center font-mono text-2xl tracking-[0.3em] uppercase h-14" />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={pin.length !== 6}>Next</Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); void join(); }}>
            <p className="text-center text-sm text-slate-500">PIN <span className="font-mono font-bold">{pin}</span>{" "}
              <button type="button" className="underline" onClick={() => { setStep("pin"); setError(""); }}>change</button></p>
            <div className="space-y-1">
              <Label htmlFor="nickname">Nickname</Label>
              <Input id="nickname" value={name} maxLength={QUIZ_LIMITS.maxNickname} onChange={e => setName(e.target.value)} autoFocus
                autoComplete="nickname" placeholder="Your name in the game" className="h-12" />
            </div>
            <div className="space-y-1">
              <Label>Avatar</Label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map(a => (
                  <button key={a} type="button" aria-label={`Avatar ${a}`} aria-pressed={avatar === a} onClick={() => setAvatar(a)}
                    className={`rounded-lg p-1 text-2xl ${avatar === a ? "bg-purple-100 ring-2 ring-purple-600" : "hover:bg-slate-100"}`}>{a}</button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" className="w-full h-12" disabled={busy || !name.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Join game
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
