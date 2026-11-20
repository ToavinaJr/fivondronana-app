import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AdminEntity,
  type AdminResponsibility,
  type AdminUser,
  adminRequest,
  type PageResult,
} from './admin-client';
import { type AdminPage, AdminShell, Icon, iconButtonClass } from './admin-shell';
import { buttonOutlineClass, buttonPrimaryClass, noticeErrorClass } from './ui-classes';

const PAGE_SIZE = 20;
const roleLabels: Record<string, string> = {
  ADMINISTRATOR: 'Administrateur',
  RESPONSIBLE: 'Responsable',
  ENTITY_MANAGER: 'Responsable d’entité',
  GENERAL_MANAGER: 'Responsable général',
};

export function AccountsPage({
  account,
  csrfToken,
  activePage,
  onNavigate,
  onLogout,
}: {
  account: string;
  csrfToken: string;
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [entities, setEntities] = useState<AdminEntity[]>([]);
  const [responsibilities, setResponsibilities] = useState<AdminResponsibility[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<AdminUser | 'create' | null>(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (query) params.set('q', query);
      const [result, entityOptions, responsibilityOptions] = await Promise.all([
        adminRequest<PageResult<AdminUser>>(`users?${params.toString()}`, { csrfToken }),
        adminRequest<AdminEntity[]>('entities', { csrfToken }),
        adminRequest<AdminResponsibility[]>('responsibilities', { csrfToken }),
      ]);
      setUsers(result.data);
      setPageCount(result.pagination.totalPages);
      setTotal(result.pagination.total);
      setEntities(entityOptions);
      setResponsibilities(responsibilityOptions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les comptes.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(userId: string, path: string, method: string, body?: unknown, success?: string) {
    setBusyId(userId);
    setError('');
    setNotice('');
    try {
      await adminRequest(path, { method, body, csrfToken });
      if (success) setNotice(success);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La modification a échoué.');
    } finally {
      setBusyId('');
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(searchDraft.trim());
  }

  return (
    <AdminShell
      account={account}
      page={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      kicker="ANNUAIRE"
      title="Comptes"
      description="Gérez les accès, les rôles et le rattachement des responsables."
      actions={
        <button className={buttonPrimaryClass} type="button" onClick={() => setEditor('create')}>
          <Icon name="plus" /> Ajouter un compte
        </button>
      }
    >
      <div className="mb-[15px] flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <search className="w-full sm:w-[min(100%,650px)]">
          <form
            className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-[#dedfdb] bg-white pl-3"
            onSubmit={search}
          >
            <Icon name="search" className="h-[17px] w-[17px] text-[#777a74]" />
            <input
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[11px] text-[#252525] outline-none sm:text-[13px]"
              aria-label="Rechercher un compte"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Nom, e-mail, téléphone, entité…"
            />
            {searchDraft && (
              <button
                className="shrink-0 border-0 bg-transparent px-1.5 py-1 text-xl text-[#777]"
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => {
                  setSearchDraft('');
                  setQuery('');
                  setPage(1);
                }}
              >
                ×
              </button>
            )}
            <button
              className="h-full shrink-0 rounded-r-lg border-0 border-l border-[#e5e5e2] px-[9px] text-[10px] font-bold text-[#8f1a14] hover:bg-[#fff5f4] sm:px-[15px] sm:text-xs"
              type="submit"
            >
              Rechercher
            </button>
          </form>
        </search>
        <span className="whitespace-nowrap text-xs text-[#747570]">
          {total} {total === 1 ? 'compte' : 'comptes'}
        </span>
      </div>

      {notice && (
        <p className="mb-3 rounded-lg bg-[#eaf5ee] px-3.5 py-2.5 text-xs text-[#075c48]" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div
          className="mb-3 flex items-center justify-between gap-4 rounded-lg bg-[#fff0ee] px-3.5 py-2.5 text-xs text-[#8c1812]"
          role="alert"
        >
          <span>{error}</span>
          <button className="p-1 font-bold underline" type="button" onClick={() => void load()}>
            Réessayer
          </button>
        </div>
      )}

      <AccountsTable
        users={users}
        loading={loading}
        error={error}
        query={query}
        busyId={busyId}
        onEdit={setEditor}
        onMutate={mutate}
      />

      <footer className="flex min-h-[62px] flex-col items-start gap-3 pt-3 text-[11px] text-[#777973] sm:flex-row sm:items-center sm:justify-between sm:pt-0">
        <span>
          {total === 0
            ? 'Aucun compte'
            : `Affichage de ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total}`}
        </span>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <button
            className="min-h-8 rounded-[9px] border border-[#dedfdb] bg-white px-2.5 text-[11px] text-[#4b4c48] disabled:cursor-default disabled:opacity-45"
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            Précédent
          </button>
          <span>
            Page {page}
            {pageCount ? ` sur ${pageCount}` : ''}
          </span>
          <button
            className="min-h-8 rounded-[9px] border border-[#dedfdb] bg-white px-2.5 text-[11px] text-[#4b4c48] disabled:cursor-default disabled:opacity-45"
            type="button"
            disabled={pageCount === 0 || page >= pageCount || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Suivant
          </button>
        </div>
      </footer>
      {editor && (
        <AccountEditor
          account={editor === 'create' ? null : editor}
          entities={entities}
          responsibilities={responsibilities}
          csrfToken={csrfToken}
          onClose={() => setEditor(null)}
          onSaved={async (message) => {
            setEditor(null);
            setNotice(message);
            await load();
          }}
        />
      )}
    </AdminShell>
  );
}

function AccountsTable({
  users,
  loading,
  error,
  query,
  busyId,
  onEdit,
  onMutate,
}: {
  users: AdminUser[];
  loading: boolean;
  error: string;
  query: string;
  busyId: string;
  onEdit: (user: AdminUser) => void;
  onMutate: (userId: string, path: string, method: string, body?: unknown, success?: string) => Promise<void>;
}) {
  const emptyState = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1ef] text-[#9c211a]">
        <Icon name="users" className="h-5 w-5" />
      </span>
      <strong className="mt-2 block text-sm text-[#393a37]">
        {query ? 'Aucun résultat' : 'Aucun compte pour le moment'}
      </strong>
      <span className="mt-1 block text-xs text-[#777973]">
        {query ? 'Essayez un autre nom, e-mail ou entité.' : 'Ajoutez un compte pour inviter un responsable.'}
      </span>
    </>
  );

  return (
    <>
      <div className="hidden overflow-auto rounded-[10px] border border-[#e2e3df] bg-white sm:block">
        <table className="w-full min-w-[890px] border-collapse text-left">
          <thead>
            <tr>
              {['Compte', 'Rôle', 'Entité / groupe', 'Responsabilités', 'Statut'].map((heading) => (
                <th
                  key={heading}
                  className="h-11 border-b border-[#ecece9] bg-[#fafaf9] px-4 text-[10px] font-bold tracking-[0.035em] text-[#777973]"
                >
                  {heading}
                </th>
              ))}
              <th className="h-11 border-b border-[#ecece9] bg-[#fafaf9] px-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="!h-[170px] !text-center text-[#777973]">
                  Chargement des comptes…
                </td>
              </tr>
            )}
            {!loading && !error && users.length === 0 && (
              <tr>
                <td colSpan={6} className="!h-[170px] !text-center text-[#777973]">
                  <div className="mx-auto flex max-w-xs flex-col items-center">{emptyState}</div>
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.id} className="[&:last-child>td]:border-b-0">
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <div className="flex min-w-[170px] items-center gap-2.5">
                      <UserAvatar name={user.accountName} />
                      <span className="grid min-w-0 gap-1">
                        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                          {user.accountName}
                        </strong>
                        <small className="block text-[11px] text-[#858680]">
                          {user.email ?? user.phone ?? 'Coordonnée absente'}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <RoleList roles={user.roles} />
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <EntityCell user={user} />
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <span
                      className="line-clamp-2 max-w-[180px] leading-[1.5]"
                      title={user.responsibilities.map((item) => item.name).join(', ')}
                    >
                      {user.responsibilities.length ? user.responsibilities.map((item) => item.name).join(', ') : '—'}
                    </span>
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <StatusBadge user={user} />
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    <div className="flex justify-end gap-0.5">
                      <RowActions user={user} busyId={busyId} onEdit={onEdit} onMutate={onMutate} />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {loading && (
          <div className="rounded-[10px] border border-[#e2e3df] bg-white p-7 text-center text-xs text-[#777973]">
            Chargement des comptes…
          </div>
        )}
        {!loading && !error && users.length === 0 && (
          <div className="flex flex-col items-center rounded-[10px] border border-[#e2e3df] bg-white p-7 text-center">
            {emptyState}
          </div>
        )}
        {!loading &&
          users.map((user) => (
            <div key={user.id} className="rounded-[10px] border border-[#e2e3df] bg-white p-4">
              <div className="flex items-center gap-2.5">
                <UserAvatar name={user.accountName} />
                <div className="min-w-0 flex-1">
                  <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                    {user.accountName}
                  </strong>
                  <small className="block text-[11px] text-[#858680]">
                    {user.email ?? user.phone ?? 'Coordonnée absente'}
                  </small>
                </div>
                <StatusBadge user={user} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div>
                  <dt className="mb-1 text-[#858782]">Rôle</dt>
                  <dd>
                    <RoleList roles={user.roles} />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[#858782]">Entité / groupe</dt>
                  <dd>
                    <EntityCell user={user} />
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="mb-1 text-[#858782]">Responsabilités</dt>
                  <dd>
                    {user.responsibilities.length ? user.responsibilities.map((item) => item.name).join(', ') : '—'}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-end gap-0.5 border-t border-[#eeeeeb] pt-3">
                <RowActions user={user} busyId={busyId} onEdit={onEdit} onMutate={onMutate} />
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#f8e9e7] text-xs font-bold text-[#8f1a14]">
      {name.trim().charAt(0).toLocaleUpperCase()}
    </span>
  );
}

function RoleList({ roles }: { roles: string[] }) {
  return (
    <div className="flex max-w-[170px] flex-wrap gap-1">
      {roles.map((role) => (
        <span key={role} className="whitespace-nowrap rounded bg-[#f0f1ee] px-1.5 py-1 text-[10px] text-[#565a55]">
          {roleLabels[role] ?? role}
        </span>
      ))}
    </div>
  );
}

function EntityCell({ user }: { user: AdminUser }) {
  if (!user.entity) return <span className="text-[#8a8b85]">Non rattaché</span>;
  return (
    <span>
      {user.entity.name}
      <small className="mt-1 block text-[11px] text-[#858680]">{user.group?.name ?? '—'}</small>
    </span>
  );
}

function RowActions({
  user,
  busyId,
  onEdit,
  onMutate,
}: {
  user: AdminUser;
  busyId: string;
  onEdit: (user: AdminUser) => void;
  onMutate: (userId: string, path: string, method: string, body?: unknown, success?: string) => Promise<void>;
}) {
  return (
    <>
      <button
        className={iconButtonClass}
        type="button"
        title="Modifier le compte"
        aria-label={`Modifier ${user.accountName}`}
        onClick={() => onEdit(user)}
      >
        <Icon name="edit" />
      </button>
      {!user.isActive && !user.activatedAt && (
        <button
          className={iconButtonClass}
          type="button"
          title="Renvoyer l’invitation"
          aria-label={`Renvoyer l’invitation à ${user.accountName}`}
          disabled={busyId === user.id}
          onClick={() =>
            void onMutate(
              user.id,
              `users/${user.id}/invitation`,
              'POST',
              undefined,
              'Demande de renvoi d’invitation traitée.',
            )
          }
        >
          <Icon name="mail" />
        </button>
      )}
      {(user.isActive || user.activatedAt) && (
        <button
          className={iconButtonClass}
          type="button"
          title={user.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
          aria-label={`${user.isActive ? 'Désactiver' : 'Réactiver'} ${user.accountName}`}
          disabled={busyId === user.id}
          onClick={() =>
            void onMutate(
              user.id,
              `users/${user.id}/active`,
              'PATCH',
              { isActive: !user.isActive },
              user.isActive ? 'Compte désactivé.' : 'Compte réactivé.',
            )
          }
        >
          <Icon name={user.isActive ? 'pause' : 'check'} />
        </button>
      )}
    </>
  );
}

function StatusBadge({ user }: { user: AdminUser }) {
  const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold';
  const dot = 'inline-block h-1.5 w-1.5 rounded-full bg-current';
  if (user.isActive)
    return (
      <span className={`${base} bg-[#eaf5ee] text-[#18704c]`}>
        <i className={dot} /> Actif
      </span>
    );
  if (!user.activatedAt)
    return (
      <span className={`${base} bg-[#fff4db] text-[#8a5a0a]`}>
        <i className={dot} /> Invitation en attente
      </span>
    );
  return (
    <span className={`${base} bg-[#f0f0ee] text-[#777973]`}>
      <i className={dot} /> Désactivé
    </span>
  );
}

function AccountEditor({
  account,
  entities,
  responsibilities,
  csrfToken,
  onClose,
  onSaved,
}: {
  account: AdminUser | null;
  entities: AdminEntity[];
  responsibilities: AdminResponsibility[];
  csrfToken: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [entityId, setEntityId] = useState(account?.entity?.id ?? '');
  const [groupId, setGroupId] = useState(account?.group?.id ?? '');
  const [roles, setRoles] = useState<string[]>(account?.roles ?? ['RESPONSIBLE']);
  const [responsibilityIds, setResponsibilityIds] = useState<string[]>(
    account?.responsibilities.map(({ id }) => id) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedEntity = entities.find((entity) => entity.id === entityId);
  const activeEntities = useMemo(() => entities.filter((entity) => entity.isActive), [entities]);
  const fieldClass =
    'h-[42px] w-full rounded-[7px] border border-[#dfe0dc] px-[11px] text-[13px] font-normal text-[#2e2f2b] outline-none focus:border-brand-teal focus:shadow-[0_0_0_3px_rgb(8_127_123/0.11)]';
  const fieldLabelClass = 'grid gap-[7px] text-xs font-bold text-[#454641]';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    const body = {
      accountName: String(fields.get('accountName') ?? '').trim(),
      email: String(fields.get('email') ?? '').trim(),
      phone: String(fields.get('phone') ?? '').trim() || null,
      entityId,
      groupId,
      responsibilityIds,
      roles,
    };
    try {
      const result = await adminRequest<{ invitationPending?: boolean; invitationDeliveryStatus?: string }>(
        account ? `users/${account.id}` : 'users',
        {
          method: account ? 'PATCH' : 'POST',
          body,
          csrfToken,
        },
      );
      const message = result.invitationPending
        ? result.invitationDeliveryStatus === 'SENT'
          ? account
            ? 'Compte mis à jour. L’invitation de réactivation a été envoyée.'
            : 'Compte créé. L’invitation a été envoyée par e-mail.'
          : 'Compte enregistré, mais l’e-mail d’invitation n’a pas pu être envoyé. Vous pourrez le renvoyer.'
        : account
          ? 'Compte mis à jour.'
          : 'Compte créé.';
      await onSaved(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer ce compte.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgb(25,27,24)]/50 p-5 sm:p-6">
      <section
        className="max-h-[95vh] w-full max-w-[660px] overflow-auto rounded-xl bg-white shadow-[0_24px_80px_rgb(0_0_0/0.22)] sm:max-h-[min(92vh,900px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header className="flex items-start justify-between border-b border-[#ededeb] px-[19px] py-[21px] sm:px-7 sm:py-6">
          <div>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.1em] text-[#858782]">GESTION DES ACCÈS</p>
            <h2 id="editor-title" className="m-0 text-xl tracking-[-0.03em] sm:text-[23px]">
              {account ? 'Modifier le compte' : 'Ajouter un compte'}
            </h2>
          </div>
          <button className={iconButtonClass} type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <form
          className="grid gap-[17px] px-[19px] py-[19px] sm:gap-5 sm:px-7 sm:pb-[26px] sm:pt-[22px]"
          onSubmit={submit}
        >
          <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 sm:gap-4">
            <label className={fieldLabelClass}>
              Nom complet
              <input
                className={fieldClass}
                name="accountName"
                defaultValue={account?.accountName ?? ''}
                maxLength={120}
                required
              />
            </label>
            <label className={fieldLabelClass}>
              E-mail
              <input
                className={fieldClass}
                name="email"
                type="email"
                defaultValue={account?.email ?? ''}
                maxLength={320}
                required
              />
            </label>
            <label className={fieldLabelClass}>
              Téléphone <span className="text-[10px] font-normal text-[#898a84]">Facultatif</span>
              <input
                className={fieldClass}
                name="phone"
                type="tel"
                defaultValue={account?.phone ?? ''}
                maxLength={40}
              />
            </label>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-[11px] text-[13px] font-bold text-[#333430]">Rattachement</legend>
            <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 sm:gap-4">
              <label className={fieldLabelClass}>
                Entité
                <select
                  className={fieldClass}
                  required
                  value={entityId}
                  onChange={(event) => {
                    setEntityId(event.target.value);
                    setGroupId('');
                  }}
                >
                  <option value="">Choisir une entité</option>
                  {activeEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={fieldLabelClass}>
                Groupe
                <select
                  className={fieldClass}
                  required
                  value={groupId}
                  onChange={(event) => setGroupId(event.target.value)}
                  disabled={!selectedEntity}
                >
                  <option value="">Choisir un groupe</option>
                  {selectedEntity?.groups
                    .filter((group) => group.isActive)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <p className="mt-[9px] text-[11px] text-[#797a75]">
              Un responsable ne peut être rattaché qu’à une seule entité et à un seul groupe.
            </p>
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-[11px] text-[13px] font-bold text-[#333430]">Rôles</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(roleLabels).map(([role, label]) => (
                <Choice
                  key={role}
                  checked={roles.includes(role)}
                  onChange={() =>
                    setRoles((current) =>
                      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
                    )
                  }
                >
                  {label}
                </Choice>
              ))}
            </div>
            {roles.length === 0 && (
              <small className="mt-2 inline-block text-xs text-[#a11a13]">Choisissez au moins un rôle.</small>
            )}
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-[11px] text-[13px] font-bold text-[#333430]">Responsabilités officielles</legend>
            {responsibilities.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {responsibilities
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <Choice
                      key={item.id}
                      checked={responsibilityIds.includes(item.id)}
                      onChange={() =>
                        setResponsibilityIds((current) =>
                          current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
                        )
                      }
                    >
                      {item.name}
                    </Choice>
                  ))}
              </div>
            ) : (
              <p className="mt-[9px] text-[11px] text-[#797a75]">Aucune responsabilité active n’est configurée.</p>
            )}
            {responsibilityIds.length === 0 && (
              <small className="mt-2 inline-block text-xs text-[#a11a13]">
                Choisissez au moins une responsabilité.
              </small>
            )}
          </fieldset>
          {error && <p className={noticeErrorClass}>{error}</p>}
          <footer className="sticky -bottom-[19px] -mx-[19px] -mb-[19px] flex justify-end gap-2.5 border-t border-[#ededeb] bg-white px-[19px] py-[13px] sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1">
            <button className={`${buttonOutlineClass} !min-h-10 !text-xs`} type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className={`${buttonPrimaryClass} !min-h-10 !text-xs`}
              type="submit"
              disabled={busy || roles.length === 0 || responsibilityIds.length === 0 || !entityId || !groupId}
            >
              {busy ? 'Enregistrement…' : account ? 'Enregistrer' : 'Créer et inviter'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function Choice({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex min-h-[38px] items-center gap-2 rounded-md border border-[#e6e7e3] px-2.5 py-[7px] text-[11px] font-medium text-[#555650]">
      <input className="accent-brand-red" type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
