import { useEffect, useRef, useState } from 'react';
import Admin from './Admin.jsx';
import { openLocalWorkspace, closeLocalWorkspace, isLocalWorkspace, leaveDeviceMode } from './localFamily.js';
import './auth-theme.css';

const api = '/api/admin';
const REFRESH_MS = 60_000;

export default function AdminAccess({ content, onChange, ready }) {
  if (isLocalWorkspace() && location.pathname !== '/login') {
    return <Admin content={content} onChange={onChange} ready={ready} lang="en" user={{name:'Device workspace'}} onLogout={closeLocalWorkspace} />;
  }
  return <HostedAccess content={content} onChange={onChange} ready={ready}/>;
}

function HostedAccess({ content, onChange, ready }) {
  const [user, setUser] = useState(null);
  const [pending, setPending] = useState(true);
  const [setup, setSetup] = useState(false);       // auth not configured on server
  const [offline, setOffline] = useState(false);   // CHANGE #1 — network/server failure
  const [logoutError, setLogoutError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    let active = true;
    let refreshing = false;

    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch(`${api}/refresh`, { method: 'POST', cache: 'no-store' });
        if (!active) return;

        // CHANGE #2 — distinguish configured vs. misconfigured vs. server down
        const configured = response.status !== 503 && response.status !== 404;
        setSetup(!configured);
        setOffline(false);

        const result = response.ok ? await response.json().catch(() => null) : null;
        if (!active) return;

        // The explicit login route always requires a fresh form submission.
        const onLoginPage = window.location.pathname.replace(/\/$/, '') === '/login';
        const nextUser = !onLoginPage && result?.role === 'admin' ? result : null;
        // CHANGE #3 — keep the same reference if it's the same admin
        const prev = userRef.current;
        const same = prev && nextUser && (prev.id ?? prev.email) === (nextUser.id ?? nextUser.email);
        setUser(same ? prev : nextUser);
      } catch {
        if (!active) return;
        // CHANGE #4 — network failure is not the same as "signed out"
        setOffline(true);
      } finally {
        refreshing = false;
        if (active) setPending(false);
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') void refresh();
    }

    void refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  async function logout() {
    try {
      const response = await fetch(`${api}/logout`, { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      window.location.replace('/login');
    } catch {
      setLogoutError(true);
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoginPending(true);
    setLoginError(false);
    setLogoutError(false);          // CHANGE #5 — clear stale logout error
    try {
      const response = await fetch(`${api}/login`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.role !== 'admin') throw new Error('Sign in failed');

      leaveDeviceMode();
      setPassword('');

      // CHANGE #6 — normalize the URL *before* mounting Admin so its
      // sectionFromLocation() reads the right path on first render.
      const path = window.location.pathname.startsWith('/admin/')
        ? window.location.pathname + window.location.search
        : '/admin';
      window.history.replaceState({ adminSection: null }, '', path);

      setUser(result);
    } catch {
      setLoginError(true);
    } finally {
      setLoginPending(false);
    }
  }

  if (user) {
    return (
      <Admin
        content={content}
        onChange={onChange}
        ready={ready}
        lang="en"
        user={user}
        onLogout={logout}
        logoutError={logoutError}
      />
    );
  }

  return (
    <main lang="en" className="login-screen">
      <a href="/" className="login-brand">
        <span aria-hidden="true">ऐ</span>
        <strong>Aishwary Farms</strong>
        <small>FAMILY WORKSPACE</small>
      </a>

      <div className="login-layout">
        <section className="login-intro" aria-label="Aishwary Farms">
          <p className="login-eyebrow">A private space for your family</p>
          <h1>Keep your<br /><em>roots connected.</em></h1>
          <p>Bring your family story, people and generations together in one thoughtful place.</p>
          <div className="login-generation-note">
            <span aria-hidden="true">✦</span>
            <span>One family. Every generation.</span>
          </div>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-mark" aria-hidden="true">✦</div>
          <p className="login-eyebrow">Welcome back</p>
          <h2 id="login-title">Admin sign in</h2>
          <p className="login-subtitle">Use the authorized credentials for this family workspace.</p>

          {pending ? (
            <p role="status" className="login-status">Checking your session…</p>
          ) : offline ? (
            // CHANGE #7 — connection failure gets its own state + retry
            <div role="alert" className="login-error">
              Can't reach the authentication service.{' '}
              <button
                type="button"
                className="login-retry"
                onClick={() => { setPending(true); setOffline(false); location.reload(); }}
              >
                Retry
              </button>
            </div>
          ) : setup ? (
            // CHANGE #8 — actionable setup message instead of a dead end
            <div role="status" className="login-setup">
              Authentication isn't configured on this deployment yet.
              Set the admin credentials in your environment and redeploy, then{' '}
              <button type="button" className="login-retry" onClick={() => location.reload()}>
                reload
              </button>.
            </div>
          ) : (
            <form className="login-form" onSubmit={login}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  // CHANGE #9 — clear the error as soon as the user edits
                  onChange={(event) => { setEmail(event.target.value); if (loginError) setLoginError(false); }}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); if (loginError) setLoginError(false); }}
                />
              </label>
              <button disabled={loginPending} type="submit">
                {loginPending ? 'Signing in…' : 'Sign in securely'}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}

          {loginError && (
            <p role="alert" className="login-error">
              Email or password is incorrect.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
