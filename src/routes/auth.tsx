import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In — Nova" },
      { name: "description", content: "Staff access to the Nova reception dashboard." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/reception" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/reception` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/reception" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/reception`,
    });
    if (result.error) setError(result.error.message ?? "Google sign-in failed.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-night text-paper px-6" style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-sm">
        <Link to="/" className="text-[10px] uppercase tracking-[0.4em] text-sand block mb-12 text-center">Nova · Est. 2022</Link>
        <h1 className="text-4xl text-center mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Reception <span className="italic text-sand">Access</span>
        </h1>
        <p className="text-center text-paper/50 text-xs uppercase tracking-[0.25em] mb-10">Staff only</p>

        <button
          onClick={handleGoogle}
          className="w-full border border-paper/20 py-3 text-xs uppercase tracking-[0.25em] hover:bg-paper/5 transition-colors mb-4"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6 text-[10px] uppercase tracking-widest text-paper/30">
          <div className="flex-1 h-px bg-paper/15" /> or <div className="flex-1 h-px bg-paper/15" />
        </div>

        <form onSubmit={handleEmail} className="space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-paper/50 block mb-2">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-paper/20 py-2 text-sm focus:border-sand outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.25em] text-paper/50 block mb-2">Password</label>
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-paper/20 py-2 text-sm focus:border-sand outline-none"
            />
          </div>
          {error && <p className="text-xs text-burnt bg-burnt/10 border border-burnt/30 px-3 py-2">{error}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full bg-sand text-night py-3 text-[11px] uppercase tracking-[0.3em] font-medium hover:bg-copper transition-colors disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center mt-6 text-[10px] uppercase tracking-[0.25em] text-paper/50 hover:text-sand transition-colors"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <p className="mt-10 text-[10px] uppercase tracking-[0.25em] text-paper/30 text-center">
          New staff accounts need a role grant from an admin before accessing the dashboard.
        </p>
      </div>
    </div>
  );
}
