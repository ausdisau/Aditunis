import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type Props = { authConfigured: boolean };

type Consent = {
  personalAdaptation: boolean;
  cameraProcessing: boolean;
  cloudProcessing: boolean;
  federatedLearning: boolean;
  researchUse: boolean;
  persistentVoiceEmbedding: boolean;
};

const initialConsent: Consent = {
  personalAdaptation: true,
  cameraProcessing: false,
  cloudProcessing: false,
  federatedLearning: false,
  researchUse: false,
  persistentVoiceEmbedding: false
};

export default function App({ authConfigured }: Props) {
  const auth = useAuth0();
  const [consent, setConsent] = useState(initialConsent);
  const [status, setStatus] = useState("idle");

  const update = (key: keyof Consent, value: boolean) =>
    setConsent((current) => ({ ...current, [key]: value }));

  async function savePreferences() {
    if (!authConfigured || !auth.isAuthenticated) return;
    setStatus("saving");
    try {
      const token = await auth.getAccessTokenSilently();
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: auth.user?.name ?? "", locale: "en-AU", consent })
      });
      setStatus(response.ok ? "saved" : response.status === 503 ? "setup" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="shell">
      <a href="#main" className="skip">Skip to main content</a>
      <header>
        <div>
          <p className="eyebrow">ADTUNIS PRIVATE SPEECH</p>
          <h1>Personal speech that adapts to the person.</h1>
        </div>
        <div className="auth">
          {!authConfigured ? (
            <span className="pill warning">Auth0 configuration pending</span>
          ) : auth.isLoading ? (
            <span className="pill">Checking sign-in…</span>
          ) : auth.isAuthenticated ? (
            <>
              <span>{auth.user?.name ?? auth.user?.email ?? "Signed in"}</span>
              <button className="secondary" onClick={() => auth.logout({ logoutParams: { returnTo: window.location.origin } })}>Sign out</button>
            </>
          ) : (
            <button onClick={() => auth.loginWithRedirect()}>Sign in with Auth0</button>
          )}
        </div>
      </header>

      <main id="main">
        <section className="card hero">
          <div>
            <p className="eyebrow">Live recognition workspace</p>
            <h2>What I said</h2>
            <p className="transcript">Turn the television off.</p>
            <p className="confidence">Confidence <strong>91%</strong></p>
            <p className="muted">Raw speech stays on the device by default. Camera and cloud processing are optional.</p>
          </div>
          <div className="listen">
            <button className="listenButton">Start listening</button>
            <div className="modes"><button>Verbatim</button><button>Assistive alternatives</button></div>
          </div>
        </section>

        <section className="grid">
          <article className="card">
            <p className="eyebrow">Model evidence</p>
            <h2>Why this transcript?</h2>
            {[
              ["Personal audio", 48],
              ["Diverse-speech expert", 27],
              ["Visual speech", 15],
              ["Personal context", 10]
            ].map(([label, value]) => (
              <div className="evidence" key={String(label)}>
                <span>{label}</span><div className="bar"><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong>
              </div>
            ))}
          </article>

          <article className="card">
            <p className="eyebrow">Model stack</p>
            <h2>Personalisation status</h2>
            <ul className="models">
              <li><span>General acoustic model</span><b>Ready</b></li>
              <li><span>Diverse-speech expert</span><b>Ready</b></li>
              <li><span>Personal AdaLoRA adapter</span><b>{auth.isAuthenticated ? "Available" : "Sign in"}</b></li>
              <li><span>Visual speech encoder</span><b>{consent.cameraProcessing ? "Enabled" : "Off"}</b></li>
            </ul>
          </article>
        </section>

        <section className="grid">
          <article className="card">
            <p className="eyebrow">Your controls</p>
            <h2>Privacy and consent</h2>
            {([
              ["personalAdaptation", "Personal adaptation", "Learn corrections in your own adapter."],
              ["cameraProcessing", "Camera processing", "Use visual speech cues. Off by default."],
              ["cloudProcessing", "Cloud processing", "Allow selected utterances to leave the device."],
              ["federatedLearning", "Federated learning", "Share privacy-protected updates, not raw recordings."],
              ["researchUse", "Research use", "Separate from ordinary service use."],
              ["persistentVoiceEmbedding", "Persistent voice representation", "Higher privacy risk; off by default."]
            ] as const).map(([key, label, hint]) => (
              <label className="toggle" key={key}>
                <span><b>{label}</b><small>{hint}</small></span>
                <input type="checkbox" checked={consent[key]} onChange={(e) => update(key, e.target.checked)} />
              </label>
            ))}
            <button className="save" disabled={!auth.isAuthenticated || status === "saving"} onClick={() => void savePreferences()}>
              {status === "saving" ? "Saving…" : "Save my choices"}
            </button>
            {status === "saved" && <p role="status" className="success">Saved.</p>}
            {status === "setup" && <p role="status" className="muted">Database schema is prepared but not yet applied.</p>}
            {status === "error" && <p role="alert" className="error">Could not save right now.</p>}
          </article>

          <article className="card">
            <p className="eyebrow">Privacy boundary</p>
            <h2>What this deployment stores</h2>
            <p className="muted">The initial Neon schema is limited to Auth0 subject ID, display name, locale and consent preferences.</p>
            <p className="muted">It does not store raw speech, video, personal adapters or persistent voice embeddings.</p>
            <div className="notice">
              Speech clarity is never treated as cognition, competence or consent capacity. No diagnosis is required to use the recogniser.
            </div>
          </article>
        </section>
      </main>
      <footer>Adtunis Private Speech · accessibility and research engineering scaffold</footer>
    </div>
  );
}
