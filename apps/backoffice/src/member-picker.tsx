import { useEffect, useRef, useState } from 'react';
import { type AdminUser, adminRequest, type PageResult } from './admin-client';
import { fieldClass, fieldLabelClass } from './ui-classes';

export function MemberPicker({
  csrfToken,
  members,
  label = 'Personnes ajoutées directement',
  onAdd,
  onRemove,
}: {
  csrfToken: string;
  members: { id: string; accountName: string }[];
  label?: string;
  onAdd: (user: AdminUser) => void;
  onRemove: (userId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
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
        setResults(page.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, csrfToken]);

  return (
    <div className={fieldLabelClass}>
      <span>{label}</span>
      <input
        className={fieldClass}
        type="search"
        placeholder="Rechercher par nom, e-mail ou téléphone…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim() && (
        <div className="grid max-h-[140px] gap-1 overflow-auto rounded-[7px] border border-[#dfe0dc] p-1.5">
          {searching && <span className="px-1.5 py-1 text-xs text-[#858680]">Recherche…</span>}
          {!searching && results.length === 0 && (
            <span className="px-1.5 py-1 text-xs text-[#858680]">Aucun résultat.</span>
          )}
          {!searching &&
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                className="rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-[#f5f6f4]"
                onClick={() => {
                  onAdd(user);
                  setQuery('');
                }}
              >
                {user.accountName}
                {user.email ? <span className="text-[11px] text-[#858680]"> · {user.email}</span> : null}
              </button>
            ))}
        </div>
      )}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {members.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f1ee] px-2.5 py-1 text-[12px] text-[#41423e]"
            >
              {member.accountName}
              <button
                type="button"
                aria-label={`Retirer ${member.accountName}`}
                className="text-[#858680] hover:text-[#8c1812]"
                onClick={() => onRemove(member.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
