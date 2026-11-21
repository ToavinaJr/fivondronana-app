import { useEffect, useRef, useState } from 'react';
import { type AdminUser, adminRequest, type PageResult } from './admin-client';
import { Icon, iconButtonClass } from './admin-shell';
import { fieldClass } from './ui-classes';

export function MembersDashboard({
  members,
  loading,
  error,
  csrfToken,
  onAdd,
  onRemove,
}: {
  members: { id: string; accountName: string; email?: string | null; phone?: string | null }[];
  loading: boolean;
  error: string;
  csrfToken: string;
  onAdd: (user: AdminUser) => void | Promise<void>;
  onRemove: (userId: string) => void | Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const page = await adminRequest<PageResult<AdminUser>>(`users?q=${encodeURIComponent(term)}`, { csrfToken });
        setResults(page.data.filter((user) => !members.some((member) => member.id === user.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, csrfToken, members]);

  async function add(user: AdminUser) {
    setBusyId(user.id);
    try {
      await onAdd(user);
      setQuery('');
    } finally {
      setBusyId('');
    }
  }

  async function remove(userId: string) {
    setBusyId(userId);
    try {
      await onRemove(userId);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <label className="mb-2 block text-[13px] font-bold" htmlFor="members-dashboard-search">
          Rechercher un compte à ajouter
        </label>
        <input
          id="members-dashboard-search"
          className={fieldClass}
          type="search"
          placeholder="Rechercher par nom, e-mail ou téléphone…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.trim() && (
          <div className="mt-2 grid max-h-[220px] gap-1 overflow-auto rounded-[9px] border border-[#e2e3df] bg-white p-1.5">
            {searching && <span className="px-2 py-1.5 text-xs text-[#858680]">Recherche…</span>}
            {!searching && results.length === 0 && (
              <span className="px-2 py-1.5 text-xs text-[#858680]">Aucun résultat.</span>
            )}
            {!searching &&
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={busyId === user.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-left text-[13px] hover:bg-[#f5f6f4] disabled:opacity-60"
                  onClick={() => void add(user)}
                >
                  <span>
                    {user.accountName}
                    {user.email ? <span className="text-[11px] text-[#858680]"> · {user.email}</span> : null}
                  </span>
                  <Icon name="plus" className="h-4 w-4 text-brand-red" />
                </button>
              ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-[#fff0ee] px-3.5 py-2.5 text-xs text-[#8c1812]" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-[10px] border border-[#e2e3df] bg-white">
        <div className="border-b border-[#ecece9] bg-[#fafaf9] px-4 py-2.5 text-[10px] font-bold tracking-[0.035em] text-[#777973]">
          {loading ? 'Chargement des comptes…' : `${members.length} compte${members.length === 1 ? '' : 's'}`}
        </div>
        {!loading && members.length === 0 && (
          <p className="px-4 py-7 text-center text-xs text-[#777973]">Aucun compte pour le moment.</p>
        )}
        {!loading &&
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 border-b border-[#eeeeeb] px-4 py-3 text-xs last:border-b-0"
            >
              <div className="grid gap-0.5">
                <strong className="text-[#30312e]">{member.accountName}</strong>
                {(member.email || member.phone) && (
                  <small className="text-[11px] text-[#858680]">{member.email || member.phone}</small>
                )}
              </div>
              <button
                className={iconButtonClass}
                type="button"
                title="Retirer"
                aria-label={`Retirer ${member.accountName}`}
                disabled={busyId === member.id}
                onClick={() => void remove(member.id)}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
