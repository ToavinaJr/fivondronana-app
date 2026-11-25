import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import logo from '../../mobile/src/assets/vonenina-logo.jpeg';
import { AccountsPage } from './accounts';
import { type AdminPage } from './admin-shell';
import { ArchivesPage } from './archives';
import {
  AuthRequestError,
  authRequest,
  type BrowserSession,
  type BrowserUser,
  csrfTokenFromCookie,
  isAdministrator,
  tokenFromLocationHash,
} from './auth-client';
import { ContactsPage } from './contacts';
import { ConversationsPage } from './conversations';
import { ResponsibilitiesPage } from './responsibilities';
import { buttonPrimaryClass, formClass, inputClass, labelClass, noticeErrorClass, textButtonClass } from './ui-classes';

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
      <main className="grid min-h-screen place-items-center text-brand-muted" aria-label="Chargement de la session">
        Chargement…
      </main>
    );
  if (user) {
    return <Workspace account={user.accountName} csrfToken={csrfToken} onLogout={() => void logout()} />;
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(340px,0.9fr)_minmax(480px,1.1fr)]">
      <aside className="flex min-h-61.25 flex-col justify-between bg-[linear-gradient(145deg,#9d1510,#c02a20_62%,#83140f)] px-6 py-7 text-white sm:min-h-66.25 sm:px-8 lg:min-h-0 lg:p-[clamp(32px,6vw,88px)]">
        <div className="mt-auto max-w-130 lg:my-auto">
          <Brand />
          <span className="inline-block text-[11px] font-extrabold tracking-[0.14em] text-[#f8d7d4]">
            ESPACE DE GESTION
          </span>
          <h1 className="my-3 max-w-140 text-[clamp(26px,6vw,54px)] leading-[1.08] tracking-[-0.045em] lg:max-w-120">            
            Fivondronana, au service de la communauté.
          </h1>
          <p className="max-w-100 text-sm leading-[1.7] text-[#ffe8e6] sm:text-base">
            Un espace réservé aux administrateurs autorisés pour piloter les services de la plateforme.
          </p>
        </div>
        <p className="hidden text-xs text-[#f8d7d4] sm:block">Accès sécurisé · FIVONDRONANA</p>
      </aside>
      <section
        className="grid items-start justify-items-center px-5 py-9 sm:px-7 sm:py-11 lg:items-center lg:px-7 lg:py-12"
        aria-live="polite"
      >
        {view === 'login' && <LoginForm onSuccess={updateSession} onNavigate={navigate} />}
        {view === 'forgot' && <RecoveryForm onNavigate={navigate} onNotice={setNotice} />}
        {view === 'activate' && <OneTimePasswordForm mode="activate" onNavigate={navigate} onNotice={setNotice} />}
        {view === 'reset' && <OneTimePasswordForm mode="reset" onNavigate={navigate} onNotice={setNotice} />}
        {notice && (
          <p
            className="mt-4 w-full max-w-110 rounded-lg bg-[#eaf7f5] px-3.5 py-3 text-[13px] leading-normal text-[#075c56]"
            role="status"
          >
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}

function Workspace({ account, csrfToken, onLogout }: { account: string; csrfToken: string; onLogout: () => void }) {
  const [page, setPage] = useState<AdminPage>('accounts');
  if (page === 'archives')
    return (
      <ArchivesPage
        account={account}
        csrfToken={csrfToken}
        activePage={page}
        onNavigate={setPage}
        onLogout={onLogout}
      />
    );
  if (page === 'conversations')
    return (
      <ConversationsPage
        account={account}
        csrfToken={csrfToken}
        activePage={page}
        onNavigate={setPage}
        onLogout={onLogout}
      />
    );
  if (page === 'contacts')
    return (
      <ContactsPage
        account={account}
        csrfToken={csrfToken}
        activePage={page}
        onNavigate={setPage}
        onLogout={onLogout}
      />
    );
  if (page === 'responsibilities')
    return (
      <ResponsibilitiesPage
        account={account}
        csrfToken={csrfToken}
        activePage={page}
        onNavigate={setPage}
        onLogout={onLogout}
      />
    );
  return (
    <AccountsPage account={account} csrfToken={csrfToken} activePage={page} onNavigate={setPage} onLogout={onLogout} />
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`mb-8 flex items-center gap-3.5 font-extrabold tracking-[0.12em] lg:mb-16 ${compact ? 'text-[13px] text-brand-red' : ''}`}
    >
      <img
        src={logo}
        alt="Logo FIVONDRONANA"
        className={`rounded-full border-2 object-cover ${compact ? 'h-10.5 w-10.5 border-brand-border' : 'h-14.5 w-14.5 border-white/75'}`}
      />
      <span>FIVONDRONANA</span>
    </div>
  );
}

function FormFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-110">
      <span className="inline-block text-[11px] font-extrabold tracking-[0.14em] text-brand-teal">
        PORTAIL ADMINISTRATEUR
      </span>
      <h2 className="mb-2 mt-3 text-[clamp(27px,3vw,34px)] tracking-[-0.035em]">{title}</h2>
      <p className="mb-8 leading-[1.6] text-brand-muted">{subtitle}</p>
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
      <form className={formClass} onSubmit={submit}>
        <label className={labelClass} htmlFor="identifier">
          E-mail ou téléphone
        </label>
        <input className={inputClass} id="identifier" name="identifier" autoComplete="username" required />
        <label className={labelClass} htmlFor="password">
          Mot de passe
        </label>
        <input
          className={inputClass}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <div className="mb-6 -mt-0.5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-[13px] text-[#494949]">
            <input className="accent-brand-red" type="checkbox" name="rememberMe" /> <span>Tsarovy aho</span>
          </label>
          <button className={textButtonClass} type="button" onClick={() => onNavigate('forgot')}>
            Mot de passe oublié ?
          </button>
        </div>
        {error && (
          <p className={noticeErrorClass} role="alert">
            {error}
          </p>
        )}
        <button className={buttonPrimaryClass} type="submit" disabled={busy}>
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
      <form className={formClass} onSubmit={submit}>
        <label className={labelClass} htmlFor="email">
          Adresse e-mail
        </label>
        <input className={inputClass} id="email" name="email" type="email" autoComplete="email" required />
        {error && (
          <p className={noticeErrorClass} role="alert">
            {error}
          </p>
        )}
        <button className={buttonPrimaryClass} type="submit" disabled={busy}>
          {busy ? 'Envoi…' : 'Envoyer le lien'}
        </button>
        <button
          className={`${textButtonClass} mt-5.5 self-center`}
          type="button"
          onClick={() => onNavigate('login')}
        >
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
      <form className={formClass} onSubmit={submit}>
        <label className={labelClass} htmlFor="password">
          Nouveau mot de passe
        </label>
        <input
          className={inputClass}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
        />
        <span className="-mt-3.75 mb-5 text-xs text-brand-muted">8 caractères minimum</span>
        {error && (
          <p className={noticeErrorClass} role="alert">
            {error}
          </p>
        )}
        <button className={buttonPrimaryClass} type="submit" disabled={busy}>
          {busy ? 'Enregistrement…' : activation ? 'Activer le compte' : 'Réinitialiser le mot de passe'}
        </button>
        <button
          className={`${textButtonClass} mt-5.5 self-center`}
          type="button"
          onClick={() => onNavigate('login')}
        >
          Retour à la connexion
        </button>
      </form>
    </FormFrame>
  );
}
