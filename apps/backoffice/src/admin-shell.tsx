import type { ReactNode } from 'react';
import logo from '../../mobile/src/assets/vonenina-logo.jpeg';
import { buttonOutlineClass } from './ui-classes';

export type AdminPage = 'accounts' | 'archives' | 'conversations' | 'contacts' | 'responsibilities';

export const iconButtonClass =
  'inline-grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border-0 bg-transparent p-0 text-[#747670] enabled:hover:bg-[#fff0ee] enabled:hover:text-[#971710] disabled:cursor-wait disabled:opacity-45';

export function Required() {
  return (
    <span className="text-brand-red" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

const navItems: { id: AdminPage; label: string; icon: IconName }[] = [
  { id: 'accounts', label: 'Comptes', icon: 'users' },
  { id: 'archives', label: 'Arisiva', icon: 'archive' },
  { id: 'conversations', label: 'Hafatra', icon: 'messages' },
  { id: 'contacts', label: 'Fifandraisana', icon: 'contacts' },
  { id: 'responsibilities', label: 'Andraikitra', icon: 'badge' },
];

export function AdminShell({
  account,
  page,
  onNavigate,
  onLogout,
  kicker,
  title,
  description,
  actions,
  children,
}: {
  account: string;
  page: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  kicker: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const activeLabel = navItems.find((item) => item.id === page)?.label ?? '';
  return (
    <div className="min-h-screen bg-[#f5f6f4] text-[#252525]">
      <aside className="flex h-[58px] flex-row items-center justify-between border-b border-[#e4e5e1] bg-white px-4 md:fixed md:inset-y-0 md:left-0 md:z-20 md:h-auto md:w-[205px] md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:pb-[18px] md:pt-7 lg:w-[248px] lg:px-[18px]">
        <a
          className="flex items-center gap-2.5 text-[10px] font-extrabold tracking-[0.1em] text-brand-red no-underline md:mx-2.5 md:mb-12 md:text-xs"
          href="/"
          aria-label="Fivondronana, accueil du backoffice"
        >
          <img src={logo} alt="" className="h-[31px] w-[31px] rounded-full object-cover md:h-[38px] md:w-[38px]" />
          <span>FIVONDRONANA</span>
        </a>

        <nav className="flex items-center gap-1 md:hidden" aria-label="Navigation principale">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-current={item.id === page ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              className={`${iconButtonClass} ${item.id === page ? 'bg-[#fff1ef] text-[#971710]' : ''}`}
            >
              <Icon name={item.icon} />
            </button>
          ))}
        </nav>

        <div className="hidden px-[11px] pb-2.5 text-[11px] font-bold tracking-[0.04em] text-[#858782] md:block">
          Administration
        </div>
        <nav className="hidden md:grid md:gap-[5px]" aria-label="Navigation principale">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={item.id === page ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg p-3 text-left text-sm font-semibold ${
                item.id === page ? 'bg-[#fff1ef] text-[#98140e]' : 'text-[#5f625d] hover:bg-[#f5f6f4]'
              }`}
            >
              <Icon name={item.icon} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 md:mt-auto md:border-t md:border-[#ecece9] md:pt-3.5">
          <span className="hidden h-[34px] w-[34px] place-items-center rounded-full bg-[#f8e9e7] text-[13px] font-bold text-[#8f1a14] md:grid">
            {account.trim().charAt(0).toLocaleUpperCase()}
          </span>
          <div className="hidden min-w-0 flex-1 gap-[3px] md:grid">
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">{account}</strong>
            <small className="text-[11px] text-[#777]">Administrateur</small>
          </div>
          <button
            className={iconButtonClass}
            type="button"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            onClick={onLogout}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="min-h-screen md:ml-[205px] lg:ml-[248px]">
        <header className="flex h-11 items-center justify-between bg-[#f5f6f4] px-[17px] text-[10px] text-[#62645f] md:h-16 md:border-b md:border-[#e5e6e2] md:bg-white md:px-[22px] md:text-xs lg:px-[38px]">
          <span>
            Portail d’administration <span className="mx-2.5 text-[#a5a6a1]">/</span> {activeLabel}
          </span>
          <button
            className={`hidden ${buttonOutlineClass} !min-h-9 text-xs md:inline-flex`}
            type="button"
            onClick={onLogout}
          >
            Se déconnecter
          </button>
        </header>
        <section className="mx-auto max-w-[1440px] px-[15px] py-6 md:px-5 md:pb-6 md:pt-8 lg:px-[clamp(22px,4vw,58px)] lg:pb-8 lg:pt-11">
          <div className="mb-[21px] flex flex-col items-start gap-[18px] sm:flex-row sm:items-end sm:justify-between md:mb-[30px]">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.1em] text-[#858782]">{kicker}</p>
              <h1 className="m-0 text-[clamp(30px,3vw,38px)] tracking-[-0.04em]">{title}</h1>
              <p className="mt-2 max-w-[330px] text-xs leading-[1.5] text-[#70716d] sm:max-w-none sm:text-sm sm:leading-normal">
                {description}
              </p>
            </div>
            {actions}
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}

type IconName =
  | 'users'
  | 'archive'
  | 'logout'
  | 'plus'
  | 'search'
  | 'edit'
  | 'mail'
  | 'pause'
  | 'check'
  | 'close'
  | 'upload'
  | 'download'
  | 'trash'
  | 'eye'
  | 'eye-off'
  | 'messages'
  | 'contacts'
  | 'badge'
  | 'back';

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    users:
      'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M10 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    archive: 'M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 13h4',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
    plus: 'M12 5v14m-7-7h14',
    search: 'm21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm18 3-10 7L2 7',
    pause: 'M10 5H6v14h4zm8 0h-4v14h4z',
    check: 'm5 12 4 4L19 6',
    close: 'm18 6-12 12M6 6l12 12',
    upload: 'M12 16V4m0 0 5 5m-5-5-5 5M5 20h14',
    download: 'M12 4v12m0 0 5-5m-5 5-5-5M5 20h14',
    trash: 'M4 7h16M9 7V4h6v3m-7 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13',
    eye: 'M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Zm9.5 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
    'eye-off':
      'M3 3l18 18M10.6 10.6a3.5 3.5 0 0 0 4.8 4.8M6.6 6.7C4.3 8.2 2.5 12 2.5 12S6 19 12 19c1.6 0 3-.4 4.2-1M9.9 5.2A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-2.1 3',
    messages: 'M21 11.5a8.38 8.38 0 0 1-9 8.4A9 9 0 1 1 20.6 10a8.5 8.5 0 0 1 .4 1.5Z',
    contacts:
      'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3.5 9c.4-2 1.8-3 3.5-3s3.1 1 3.5 3',
    badge:
      'M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6l-9-4Zm0 6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-3 9c.5-1.8 1.7-2.8 3-2.8s2.5 1 3 2.8',
    back: 'M19 12H5m0 0 6 6m-6-6 6-6',
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-[17px] w-[17px]'}
    >
      <path d={paths[name]} />
    </svg>
  );
}
