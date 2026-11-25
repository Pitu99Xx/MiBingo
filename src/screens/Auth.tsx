import { useState } from "react";
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut, User
} from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "../lib/toast";
import { Avatar, Ball } from "../components";
import { AV_COLORS, MIN_AGE } from "../game/rules";
import { ageOf, createProfile } from "../lib/profile";
import { APP_VERSION } from "../lib/version";

export function authError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "El correo o la contraseña no son correctos.",
    "auth/wrong-password": "El correo o la contraseña no son correctos.",
    "auth/user-not-found": "No hay ninguna cuenta con ese correo.",
    "auth/email-already-in-use": "Ya hay una cuenta con ese correo. Pulsa «Entrar».",
    "auth/weak-password": "La contraseña necesita al menos 8 caracteres.",
    "auth/invalid-email": "Escribe un correo válido, por ejemplo tu@correo.com.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos y vuelve a probar.",
    "auth/network-request-failed": "No hay conexión. Revisa tu internet y vuelve a probar.",
    "auth/popup-closed-by-user": "Has cerrado la ventana de Google antes de terminar.",
    "auth/cancelled-popup-request": "Has cerrado la ventana de Google antes de terminar.",
    "auth/requires-recent-login": "Por seguridad, cierra sesión, vuelve a entrar y repite.",
    "permission-denied": "No tienes permiso para hacer eso."
  };
  return map[code] || "Algo ha fallado. Vuelve a intentarlo.";
}

export function Login() {
  const [signIn, setSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  async function google() {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth, p); }
    catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") await signInWithRedirect(auth, p);
      else toast(authError(e));
    }
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const em = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("Escribe un correo válido, por ejemplo tu@correo.com");
    if (pass.length < 8) return toast("La contraseña necesita al menos 8 caracteres");
    setBusy(true);
    try {
      if (signIn) await signInWithEmailAndPassword(auth, em, pass);
      else { const c = await createUserWithEmailAndPassword(auth, em, pass); await sendEmailVerification(c.user); }
    } catch (e) { toast(authError(e)); }
    setBusy(false);
  }
  async function forgot() {
    const em = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("Escribe primero tu correo arriba");
    try { await sendPasswordResetEmail(auth, em); toast("Te hemos enviado un correo para cambiar la contraseña"); }
    catch (e) { toast(authError(e)); }
  }

  return (
    <section className="screen s-login">
      <div className="pad">
        <div className="logo">
          <div className="balls">
            <Ball n="M" size={46} color="#e0442e" />
            <Ball n="i" size={46} color="#f3b73b" />
            <Ball n="B" size={46} color="#1aa3c2" />
            <Ball n="!" size={46} color="#6fa83a" />
          </div>
          <h1>MiBingo</h1>
          <p>El bingo de toda la vida, en el bolsillo.<br />Atento a las bolas: aquí nadie marca por ti.</p>
          <p style={{ fontSize: 12 }}>Para mayores de {MIN_AGE} años · sin dinero real · v{APP_VERSION}</p>
        </div>
        <button className="btn google" type="button" onClick={google}><span className="gmark" aria-hidden="true" />Continuar con Google</button>
        <div className="or">o con tu correo</div>
        <form id="emailForm" onSubmit={submit} noValidate>
          <label className="f">Correo electrónico<input id="email" type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="f">Contraseña<input id="pass" type="password" autoComplete={signIn ? "current-password" : "new-password"} placeholder="Mínimo 8 caracteres" value={pass} onChange={e => setPass(e.target.value)} /></label>
          <button className="btn primary" disabled={busy}>{signIn ? "Entrar" : "Crear cuenta"}</button>
          <p className="small" style={{ textAlign: "center" }}>
            {signIn ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button type="button" className="link" onClick={() => setSignIn(!signIn)}>{signIn ? "Crear cuenta" : "Entrar"}</button>
          </p>
          {signIn && <p className="small" style={{ textAlign: "center" }}><button type="button" className="link" onClick={forgot}>He olvidado mi contraseña</button></p>}
        </form>
      </div>
    </section>
  );
}

export function VerifyEmail({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) { await auth.currentUser.getIdToken(true); location.reload(); }
      else toast("Todavía no está verificado. Abre el enlace del correo.");
    } catch (e) { toast(authError(e)); }
    setBusy(false);
  }
  async function resend() {
    try { await sendEmailVerification(user); toast("Correo reenviado. Mira también en spam."); }
    catch (e) { toast(authError(e)); }
  }
  return (
    <section className="screen">
      <div className="pad" style={{ paddingTop: 40 }}>
        <h2 style={{ fontSize: 30, textAlign: "center" }}>Verifica tu correo</h2>
        <p className="small" style={{ textAlign: "center", fontSize: 15 }}>
          Te hemos enviado un enlace a <span className="mail">{user.email}</span>. Ábrelo para activar la cuenta y vuelve aquí.
        </p>
        <button className="btn primary" type="button" disabled={busy} onClick={check}>Ya lo he verificado</button>
        <button className="btn ghost" type="button" onClick={resend}>Reenviar el correo</button>
        <button className="btn ghost" type="button" onClick={() => signOut(auth)} style={{ borderColor: "transparent", color: "var(--muted)" }}>Usar otra cuenta</button>
      </div>
    </section>
  );
}

export function ProfileSetup({ user, onCreated }: { user: User; onCreated: () => void }) {
  const [name, setName] = useState((user.displayName || "").split(" ")[0].slice(0, 14));
  const [birth, setBirth] = useState("");
  const [color, setColor] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const bd = birth ? new Date(birth + "T12:00:00") : null;
  const age = bd && !isNaN(+bd) ? ageOf(bd) : null;
  const todayIso = new Date().toISOString().slice(0, 10);

  async function save() {
    const n = name.trim();
    if (n.length < 2) return setErr("Escribe tu nombre, al menos 2 letras.");
    if (!bd || age === null || age < 0 || age > 120) return setErr("Elige tu fecha de nacimiento.");
    if (age < MIN_AGE) return setErr(`Lo sentimos: hay que tener al menos ${MIN_AGE} años para jugar.`);
    setErr(""); setBusy(true);
    try { await createProfile(user.uid, n, bd, color); onCreated(); }
    catch (e) { setErr(authError(e)); setBusy(false); }
  }
  return (
    <section className="screen">
      <div className="pad" style={{ paddingTop: 22 }}>
        <h2 style={{ fontSize: 30, textAlign: "center" }}>¡Bienvenido a la mesa!</h2>
        <p className="small" style={{ textAlign: "center", marginTop: -6 }}>Solo la primera vez. Así te verán los demás jugadores.</p>
        <Avatar name={name} color={AV_COLORS[color]} />
        <div className="swatches">
          {AV_COLORS.map((c, i) => (
            <button key={c} type="button" className={i === color ? "on" : ""} style={{ "--c": c } as React.CSSProperties} aria-label={"Color " + (i + 1)} onClick={() => setColor(i)} />
          ))}
        </div>
        <label className="f">Nombre en la mesa<input id="pName" maxLength={14} placeholder="Tu nombre" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="f">Fecha de nacimiento<input id="pBirth" type="date" max={todayIso} value={birth} onChange={e => setBirth(e.target.value)} /></label>
        <p className="small" style={age !== null && age < MIN_AGE ? { color: "var(--bad)" } : undefined}>
          {age === null ? `Hay que tener al menos ${MIN_AGE} años. Nadie más ve tu fecha.` : age < MIN_AGE ? `Tienes ${age} años. MiBingo es para mayores de ${MIN_AGE}.` : `Tienes ${age} años. Tu fecha no se puede cambiar después.`}
        </p>
        <div className="gift"><span className="coin" style={{ width: 26, height: 26 }} /><span>Al crear la cuenta te regalamos <b>500 fichas</b> para empezar.</span></div>
        {err && <p className="err">{err}</p>}
        <button className="btn primary" type="button" disabled={busy} onClick={save}>Confirmar y entrar</button>
      </div>
    </section>
  );
}
