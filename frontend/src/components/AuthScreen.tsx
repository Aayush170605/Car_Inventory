import { useState, type FormEvent } from 'react';
import { ArrowRight, CarFront, ShieldCheck } from 'lucide-react';
import { request } from '../api';
import type { Session } from '../types';
import { CarArt } from './CarArt';

export function AuthScreen({ onLogin, notice }: { onLogin: (session: Session) => void; notice: string }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { onLogin(await request<Session>(`/auth/${register ? 'register' : 'login'}`, undefined, 'POST', { email: data.get('email'), password: data.get('password') })); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="auth-layout">
    <section className="auth-story">
      <a className="brand" href="/"><CarFront size={28}/>motorlane<span>®</span></a>
      <div className="auth-story-content"><span className="pill light">THE ROAD AHEAD</span><h1>Good cars.<br/>Great beginnings.</h1><p>A considered collection, ready for your next chapter. Find your drive at Motorlane.</p><CarArt color="#98b9a2"/></div>
      <p className="auth-footnote">Thoughtfully selected. Effortlessly managed.</p>
    </section>
    <main className="auth-main"><div className="auth-form-wrap">
      <span className="eyebrow">WELCOME TO MOTORLANE</span>
      <h2>{register ? 'Your journey starts here.' : 'Welcome back.'}</h2>
      <p className="muted">{register ? 'Create an account to explore and purchase vehicles.' : 'Sign in to explore the collection.'}</p>
      <div className="auth-tabs"><button className={!register ? 'active' : ''} onClick={() => { setRegister(false); setError(''); }} disabled={busy}>Sign in</button><button className={register ? 'active' : ''} onClick={() => { setRegister(true); setError(''); }} disabled={busy}>Create account</button></div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={submit} className="form-stack">
        <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label>
        <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} placeholder="Enter your password" required minLength={10} maxLength={128}/></label>
        {register && <p className="field-hint">Use 10–128 characters. New accounts have customer access.</p>}
        <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={17}/></button>
      </form>
      <p className="auth-security"><ShieldCheck size={16}/> Your next drive is just a few clicks away.</p>
    </div></main>
  </div>;
}
