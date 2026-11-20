import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import logo from '../../mobile/src/assets/vonenina-logo.jpeg';
import {
  adminRequest,
  type AdminEntity,
  type AdminResponsibility,
  type AdminUser,
  type PageResult,
} from './admin-client';

const PAGE_SIZE = 20;
const roleLabels: Record<string, string> = {
  ADMINISTRATOR: 'Administrateur',
  RESPONSIBLE: 'Responsable',
  ENTITY_MANAGER: 'Responsable d’entité',
  GENERAL_MANAGER: 'Responsable général',
};

export function AccountsWorkspace({
  account,
  csrfToken,
  onLogout,
}: {
  account: string;
  csrfToken: string;
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
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Fivondronana, accueil du backoffice">
          <img src={logo} alt="" />
          <span>FIVONDRONANA</span>
        </a>
        <div className="sidebar-caption">Administration</div>
        <nav aria-label="Navigation principale">
          <span className="nav-item nav-item-active">
            <Icon name="users" /> Comptes
          </span>
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">{account.trim().charAt(0).toLocaleUpperCase()}</span>
          <div className="sidebar-identity">
            <strong>{account}</strong>
            <small>Administrateur</small>
          </div>
          <button
            className="icon-button"
            type="button"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            onClick={onLogout}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>
            Portail d’administration <span className="crumb-divider">/</span> Comptes
          </span>
          <button className="button button-outline logout-wide" type="button" onClick={onLogout}>
            Se déconnecter
          </button>
        </header>
        <section className="directory-page">
          <div className="page-heading">
            <div>
              <p className="page-kicker">ANNUAIRE</p>
              <h1>Comptes</h1>
              <p className="page-description">Gérez les accès, les rôles et le rattachement des responsables.</p>
            </div>
            <button className="button button-primary add-button" type="button" onClick={() => setEditor('create')}>
              <Icon name="plus" /> Ajouter un compte
            </button>
          </div>

          <div className="directory-toolbar">
            <search>
              <form className="search-form" onSubmit={search}>
                <Icon name="search" />
                <input
                  aria-label="Rechercher un compte"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Nom, e-mail, téléphone, entité…"
                />
                {searchDraft && (
                  <button
                    className="clear-search"
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
                <button className="search-submit" type="submit">
                  Rechercher
                </button>
              </form>
            </search>
            <span className="result-count">
              {total} {total === 1 ? 'compte' : 'comptes'}
            </span>
          </div>

          {notice && (
            <p className="admin-alert admin-alert-success" role="status">
              {notice}
            </p>
          )}
          {error && (
            <div className="admin-alert admin-alert-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void load()}>
                Réessayer
              </button>
            </div>
          )}

          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Rôle</th>
                  <th>Entité / groupe</th>
                  <th>Responsabilités</th>
                  <th>Statut</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="table-state">
                      Chargement des comptes…
                    </td>
                  </tr>
                )}
                {!loading && !error && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table-state empty-state">
                      <span className="empty-icon">
                        <Icon name="users" />
                      </span>
                      <strong>{query ? 'Aucun résultat' : 'Aucun compte pour le moment'}</strong>
                      <span>
                        {query
                          ? 'Essayez un autre nom, e-mail ou entité.'
                          : 'Ajoutez un compte pour inviter un responsable.'}
                      </span>
                    </td>
                  </tr>
                )}
                {!loading &&
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar">{user.accountName.trim().charAt(0).toLocaleUpperCase()}</span>
                          <span>
                            <strong>{user.accountName}</strong>
                            <small>{user.email ?? user.phone ?? 'Coordonnée absente'}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="role-list">
                          {user.roles.map((role) => (
                            <span className="role-chip" key={role}>
                              {roleLabels[role] ?? role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {user.entity ? (
                          <span>
                            {user.entity.name}
                            <small className="table-subline">{user.group?.name ?? '—'}</small>
                          </span>
                        ) : (
                          <span className="muted">Non rattaché</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="responsibility-cell"
                          title={user.responsibilities.map((item) => item.name).join(', ')}
                        >
                          {user.responsibilities.length
                            ? user.responsibilities.map((item) => item.name).join(', ')
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge user={user} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            type="button"
                            title="Modifier le compte"
                            aria-label={`Modifier ${user.accountName}`}
                            onClick={() => setEditor(user)}
                          >
                            <Icon name="edit" />
                          </button>
                          {!user.isActive && !user.activatedAt && (
                            <button
                              className="icon-button"
                              type="button"
                              title="Renvoyer l’invitation"
                              aria-label={`Renvoyer l’invitation à ${user.accountName}`}
                              disabled={busyId === user.id}
                              onClick={() =>
                                void mutate(
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
                              className="icon-button"
                              type="button"
                              title={user.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                              aria-label={`${user.isActive ? 'Désactiver' : 'Réactiver'} ${user.accountName}`}
                              disabled={busyId === user.id}
                              onClick={() =>
                                void mutate(
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
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <footer className="table-footer">
            <span>
              {total === 0
                ? 'Aucun compte'
                : `Affichage de ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total}`}
            </span>
            <div className="pagination-controls">
              <button
                className="button button-page"
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
                className="button button-page"
                type="button"
                disabled={pageCount === 0 || page >= pageCount || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </button>
            </div>
          </footer>
        </section>
      </main>
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
    </div>
  );
}

function StatusBadge({ user }: { user: AdminUser }) {
  if (user.isActive)
    return (
      <span className="status-badge status-active">
        <i /> Actif
      </span>
    );
  if (!user.activatedAt)
    return (
      <span className="status-badge status-pending">
        <i /> Invitation en attente
      </span>
    );
  return (
    <span className="status-badge status-inactive">
      <i /> Désactivé
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
    <div className="modal-backdrop">
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="modal-heading">
          <div>
            <p className="page-kicker">GESTION DES ACCÈS</p>
            <h2 id="editor-title">{account ? 'Modifier le compte' : 'Ajouter un compte'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <form className="account-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Nom complet
              <input name="accountName" defaultValue={account?.accountName ?? ''} maxLength={120} required />
            </label>
            <label>
              E-mail
              <input name="email" type="email" defaultValue={account?.email ?? ''} maxLength={320} required />
            </label>
            <label>
              Téléphone <span className="optional-label">Facultatif</span>
              <input name="phone" type="tel" defaultValue={account?.phone ?? ''} maxLength={40} />
            </label>
          </div>
          <fieldset>
            <legend>Rattachement</legend>
            <div className="form-grid">
              <label>
                Entité
                <select
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
              <label>
                Groupe
                <select
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
            <p className="form-note">Un responsable ne peut être rattaché qu’à une seule entité et à un seul groupe.</p>
          </fieldset>
          <fieldset>
            <legend>Rôles</legend>
            <div className="choice-grid">
              {Object.entries(roleLabels).map(([role, label]) => (
                <label className="choice" key={role}>
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() =>
                      setRoles((current) =>
                        current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {roles.length === 0 && <small className="inline-error">Choisissez au moins un rôle.</small>}
          </fieldset>
          <fieldset>
            <legend>Responsabilités officielles</legend>
            {responsibilities.length ? (
              <div className="choice-grid">
                {responsibilities
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <label className="choice" key={item.id}>
                      <input
                        type="checkbox"
                        checked={responsibilityIds.includes(item.id)}
                        onChange={() =>
                          setResponsibilityIds((current) =>
                            current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
                          )
                        }
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
              </div>
            ) : (
              <p className="form-note">Aucune responsabilité active n’est configurée.</p>
            )}
            {responsibilityIds.length === 0 && (
              <small className="inline-error">Choisissez au moins une responsabilité.</small>
            )}
          </fieldset>
          {error && (
            <p className="notice error-notice" role="alert">
              {error}
            </p>
          )}
          <footer className="modal-actions">
            <button className="button button-outline" type="button" onClick={onClose}>
              Annuler
            </button>
            <button
              className="button button-primary"
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

function Icon({
  name,
}: {
  name: 'users' | 'logout' | 'plus' | 'search' | 'edit' | 'mail' | 'pause' | 'check' | 'close';
}) {
  const paths: Record<typeof name, string> = {
    users:
      'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M10 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
    plus: 'M12 5v14m-7-7h14',
    search: 'm21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm18 3-10 7L2 7',
    pause: 'M10 5H6v14h4zm8 0h-4v14h4z',
    check: 'm5 12 4 4L19 6',
    close: 'm18 6-12 12M6 6l12 12',
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
    >
      <path d={paths[name]} />
    </svg>
  );
}
