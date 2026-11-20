import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import logo from '../../mobile/src/assets/vonenina-logo.jpeg';
import { AccountsWorkspace } from './accounts';
import {
  authRequest,
  AuthRequestError,
  csrfTokenFromCookie,
  isAdministrator,
  tokenFromLocationHash,
  type BrowserSession,
  type BrowserUser,
} from './auth-client';

type View = 'login' | 'forgot' | 'activate' | 'reset';

function getView(): View {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/forgot-password') return 'forgot';
  if (path === '/activate') return 'activate';
  if (path === '/reset-password') return 'reset';
  return 'login';
}

export function App() {
  const [view, setView] = useState(getView);
  const [user, setUser] = useState<BrowserUser | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const updateSession = useCallback((session: BrowserSession) => {
    if (!isAdministrator(session.user)) {
      void authRequest('browser/logout', { method: 'POST', csrfToken: session.csrfToken }).catch(() => undefined);
      setUser(null);
      setCsrfToken('');
      throw new Error('Cet espace est réservé aux comptes administrateurs.');
    }
    setUser(session.user);
    setCsrfToken(session.csrfToken);
  }, []);

  const restore = useCallback(async () => {
    try {
      const identity = await authRequest<BrowserSession>('browser/me');
      updateSession(identity);
    } catch (error) {
      if (error instanceof AuthRequestError && error.status === 401) {
        try {
          const refreshed = await authRequest<BrowserSession>('browser/refresh', {
            method: 'POST',
            csrfToken: csrfTokenFromCookie(document.cookie),
          });
          updateSession(refreshed);
        } catch {
          setUser(null);
          setCsrfToken('');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [updateSession]);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (!user || !csrfToken) return;
    const timeout = window.setTimeout(
      async () => {
        try {
          const refreshed = await authRequest<BrowserSession>('browser/refresh', {
            method: 'POST',
            csrfToken,
          });
          updateSession(refreshed);
        } catch {
          setUser(null);
          setCsrfToken('');
        }
      },
      10 * 60 * 1000,
    );
    return () => window.clearTimeout(timeout);
  }, [csrfToken, updateSession, user]);

  function navigate(next: View) {
    const path: Record<View, string> = {
      login: '/login',
      forgot: '/forgot-password',
      activate: '/activate',
      reset: '/reset-password',
    };
    window.history.pushState({}, '', path[next]);
    setView(next);
    setNotice('');
  }

  useEffect(() => {
    const onPopState = () => setView(getView());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  async function logout() {
    try {
      await authRequest('browser/logout', { method: 'POST', csrfToken });
    } catch {
      // Local navigation must still end the UI session if the API is unreachable.
    } finally {
      setUser(null);
      setCsrfToken('');
      navigate('login');
    }
  }

  if (loading)
    return (
      <main className="loading" aria-label="Chargement de la session">
        Chargement…
      </main>
    );
  if (user) {
    return <AccountsWorkspace account={user.accountName} csrfToken={csrfToken} onLogout={() => void logout()} />;
  }

  return (
    <main className="auth-layout">
      <aside className="brand-panel">
        <div className="brand-panel-content">
          <Brand />
          <span className="eyebrow">ESPACE DE GESTION</span>
          <h1>Fivondronana, au service de la communauté.</h1>
          <p>Un espace réservé aux administrateurs autorisés pour piloter les services de la plateforme.</p>
        </div>
        <p className="brand-footnote">Accès sécurisé · FIVONDRONANA</p>
      </aside>
      <section className="form-panel" aria-live="polite">
        {view === 'login' && <LoginForm onSuccess={updateSession} onNavigate={navigate} />}
        {view === 'forgot' && <RecoveryForm onNavigate={navigate} onNotice={setNotice} />}
        {view === 'activate' && <OneTimePasswordForm mode="activate" onNavigate={navigate} onNotice={setNotice} />}
        {view === 'reset' && <OneTimePasswordForm mode="reset" onNavigate={navigate} onNotice={setNotice} />}
        {notice && (
          <p className="notice success-notice" role="status">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img src={logo} alt="Logo FIVONDRONANA" />
      <span>FIVONDRONANA</span>
    </div>
  );
}

function FormFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="form-frame">
      <span className="eyebrow">PORTAIL ADMINISTRATEUR</span>
      <h2>{title}</h2>
      <p className="form-subtitle">{subtitle}</p>
      {children}
    </div>
  );
}

function LoginForm({
  onSuccess,
  onNavigate,
}: {
  onSuccess: (session: BrowserSession) => void;
  onNavigate: (view: View) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const login = await authRequest<{ csrfToken: string }>('browser/login', {
        method: 'POST',
        csrfToken: csrfTokenFromCookie(document.cookie),
        body: {
          identifier: data.get('identifier'),
          password: data.get('password'),
          rememberMe: data.get('rememberMe') === 'on',
        },
      });
      const identity = await authRequest<BrowserSession>('browser/me');
      onSuccess({ ...identity, csrfToken: identity.csrfToken || login.csrfToken });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title="Content de vous revoir"
      subtitle="Connectez-vous avec les identifiants de votre compte administrateur."
    >
      <form className="form" onSubmit={submit}>
        <label htmlFor="identifier">E-mail ou téléphone</label>
        <input id="identifier" name="identifier" autoComplete="username" required />
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <div className="form-options">
          <label className="checkbox-label">
            <input type="checkbox" name="rememberMe" /> <span>Tsarovy aho</span>
          </label>
          <button className="text-button" type="button" onClick={() => onNavigate('forgot')}>
            Mot de passe oublié ?
          </button>
        </div>
        {error && (
          <p className="notice error-notice" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </FormFrame>
  );
}

function RecoveryForm({
  onNavigate,
  onNotice,
}: {
  onNavigate: (view: View) => void;
  onNotice: (notice: string) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const email = new FormData(event.currentTarget).get('email');
      await authRequest('password-recovery', { method: 'POST', body: { email } });
      onNotice('Si un compte actif correspond à cette adresse, un lien de récupération vous sera envoyé.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Demande impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame title="Récupérer l’accès" subtitle="Saisissez l’adresse e-mail associée à votre compte administrateur.">
      <form className="form" onSubmit={submit}>
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        {error && (
          <p className="notice error-notice" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Envoi…' : 'Envoyer le lien'}
        </button>
        <button className="text-button back-button" type="button" onClick={() => onNavigate('login')}>
          Retour à la connexion
        </button>
      </form>
    </FormFrame>
  );
}

function OneTimePasswordForm({
  mode,
  onNavigate,
  onNotice,
}: {
  mode: 'activate' | 'reset';
  onNavigate: (view: View) => void;
  onNotice: (notice: string) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const token = tokenFromLocationHash(window.location.hash);
  const activation = mode === 'activate';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const password = new FormData(event.currentTarget).get('password');
    try {
      if (!token) throw new Error('Le lien est manquant ou incomplet. Demandez un nouveau lien.');
      await authRequest(activation ? 'activate' : 'password-reset', {
        method: 'POST',
        body: activation ? { token, password } : { token, newPassword: password },
      });
      window.history.replaceState({}, '', window.location.pathname);
      onNavigate('login');
      onNotice(
        activation
          ? 'Votre compte est activé. Vous pouvez maintenant vous connecter.'
          : 'Votre mot de passe a été modifié. Vous pouvez vous connecter.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Opération impossible. Demandez un nouveau lien.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title={activation ? 'Activer votre compte' : 'Choisir un nouveau mot de passe'}
      subtitle={
        activation
          ? 'Définissez un mot de passe pour finaliser l’activation.'
          : 'Choisissez un nouveau mot de passe pour votre compte.'
      }
    >
      <form className="form" onSubmit={submit}>
        <label htmlFor="password">Nouveau mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
        <span className="field-hint">8 caractères minimum</span>
        {error && (
          <p className="notice error-notice" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? 'Enregistrement…' : activation ? 'Activer le compte' : 'Réinitialiser le mot de passe'}
        </button>
        <button className="text-button back-button" type="button" onClick={() => onNavigate('login')}>
          Retour à la connexion
        </button>
      </form>
    </FormFrame>
  );
}
