import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { type AdminResponsibility, type AdminUser, adminRequest, type PageResult } from './admin-client';
import { type AdminPage, AdminShell, Icon, iconButtonClass, Required } from './admin-shell';
import { MembersDashboard } from './members-dashboard';
import { buttonOutlineClass, buttonPrimaryClass, fieldClass, fieldLabelClass, noticeErrorClass } from './ui-classes';

export function ResponsibilitiesPage({
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
  const [responsibilities, setResponsibilities] = useState<AdminResponsibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState<AdminResponsibility | 'new' | null>(null);
  const [viewingMembers, setViewingMembers] = useState<AdminResponsibility | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResponsibilities(await adminRequest<AdminResponsibility[]>('responsibilities', { csrfToken }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les responsabilités.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(responsibility: AdminResponsibility) {
    if (!window.confirm(`Supprimer définitivement « ${responsibility.name} » ?`)) return;
    setBusyId(responsibility.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`responsibilities/${responsibility.id}`, { method: 'DELETE', csrfToken });
      setNotice('Responsabilité supprimée.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La suppression a échoué.');
    } finally {
      setBusyId('');
    }
  }

  if (viewingMembers)
    return (
      <ResponsibilityMembersPage
        account={account}
        csrfToken={csrfToken}
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        responsibility={viewingMembers}
        onBack={() => setViewingMembers(null)}
      />
    );

  return (
    <AdminShell
      account={account}
      page={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      kicker="ANNUAIRE"
      title="Andraikitra"
      description="Gérez le référentiel des responsabilités officielles attribuables aux mpiandraikitra."
      actions={
        <button className={buttonPrimaryClass} type="button" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Ajouter une responsabilité
        </button>
      }
    >
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

      <ResponsibilitiesTable
        responsibilities={responsibilities}
        loading={loading}
        error={error}
        busyId={busyId}
        onOpen={setViewingMembers}
        onEdit={setEditing}
        onRemove={remove}
      />

      {editing && (
        <ResponsibilityFormModal
          responsibility={editing === 'new' ? null : editing}
          csrfToken={csrfToken}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            setEditing(null);
            setNotice(message);
            await load();
          }}
        />
      )}
    </AdminShell>
  );
}

function ResponsibilitiesTable({
  responsibilities,
  loading,
  error,
  busyId,
  onOpen,
  onEdit,
  onRemove,
}: {
  responsibilities: AdminResponsibility[];
  loading: boolean;
  error: string;
  busyId: string;
  onOpen: (responsibility: AdminResponsibility) => void;
  onEdit: (responsibility: AdminResponsibility) => void;
  onRemove: (responsibility: AdminResponsibility) => Promise<void>;
}) {
  const emptyState = (
    <>
      <strong className="mt-2 block text-sm text-[#393a37]">Aucune responsabilité pour le moment</strong>
      <span className="mt-1 block text-xs text-[#777973]">Ajoutez une responsabilité pour commencer.</span>
    </>
  );

  return (
    <>
      <div className="hidden overflow-auto rounded-[10px] border border-[#e2e3df] bg-white sm:block">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr>
              <th className="h-11 border-b border-[#ecece9] bg-[#fafaf9] px-4 text-[10px] font-bold tracking-[0.035em] text-[#777973]">
                Responsabilité
              </th>
              <th className="h-11 border-b border-[#ecece9] bg-[#fafaf9] px-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={2} className="!h-[150px] !text-center text-[#777973]">
                  Chargement des responsabilités…
                </td>
              </tr>
            )}
            {!loading && !error && responsibilities.length === 0 && (
              <tr>
                <td colSpan={2} className="!h-[150px] !text-center text-[#777973]">
                  <div className="mx-auto flex max-w-xs flex-col items-center">{emptyState}</div>
                </td>
              </tr>
            )}
            {!loading &&
              responsibilities.map((responsibility) => (
                <tr key={responsibility.id} className="[&:last-child>td]:border-b-0">
                  <td className="h-[60px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    <button
                      type="button"
                      className="font-semibold text-[#30312e] hover:underline"
                      onClick={() => onOpen(responsibility)}
                    >
                      {responsibility.name}
                    </button>
                  </td>
                  <td className="h-[60px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    <div className="flex justify-end gap-0.5">
                      <button
                        className={iconButtonClass}
                        type="button"
                        title="Modifier"
                        aria-label={`Modifier ${responsibility.name}`}
                        disabled={busyId === responsibility.id}
                        onClick={() => onEdit(responsibility)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className={iconButtonClass}
                        type="button"
                        title="Supprimer"
                        aria-label={`Supprimer ${responsibility.name}`}
                        disabled={busyId === responsibility.id}
                        onClick={() => void onRemove(responsibility)}
                      >
                        <Icon name="trash" />
                      </button>
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
            Chargement des responsabilités…
          </div>
        )}
        {!loading && !error && responsibilities.length === 0 && (
          <div className="flex flex-col items-center rounded-[10px] border border-[#e2e3df] bg-white p-7 text-center">
            {emptyState}
          </div>
        )}
        {!loading &&
          responsibilities.map((responsibility) => (
            <div key={responsibility.id} className="rounded-[10px] border border-[#e2e3df] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs font-semibold text-[#30312e] hover:underline"
                  onClick={() => onOpen(responsibility)}
                >
                  {responsibility.name}
                </button>
              </div>
              <div className="mt-3 flex justify-end gap-0.5 border-t border-[#eeeeeb] pt-3">
                <button
                  className={iconButtonClass}
                  type="button"
                  title="Modifier"
                  aria-label={`Modifier ${responsibility.name}`}
                  disabled={busyId === responsibility.id}
                  onClick={() => onEdit(responsibility)}
                >
                  <Icon name="edit" />
                </button>
                <button
                  className={iconButtonClass}
                  type="button"
                  title="Supprimer"
                  aria-label={`Supprimer ${responsibility.name}`}
                  disabled={busyId === responsibility.id}
                  onClick={() => void onRemove(responsibility)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

function ResponsibilityFormModal({
  responsibility,
  csrfToken,
  onClose,
  onSaved,
}: {
  responsibility: AdminResponsibility | null;
  csrfToken: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(responsibility);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    try {
      if (responsibility) {
        await adminRequest(`responsibilities/${responsibility.id}`, { method: 'PATCH', body: { name }, csrfToken });
        await onSaved('Responsabilité mise à jour.');
      } else {
        await adminRequest('responsibilities', { method: 'POST', body: { name }, csrfToken });
        await onSaved('Responsabilité ajoutée.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer cette responsabilité.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgb(25,27,24)]/50 p-5 sm:p-6">
      <section
        className="w-full max-w-[460px] rounded-xl bg-white shadow-[0_24px_80px_rgb(0_0_0/0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsibility-title"
      >
        <header className="flex items-start justify-between border-b border-[#ededeb] px-[19px] py-[21px] sm:px-7 sm:py-6">
          <div>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.1em] text-[#858782]">
              {editing ? 'MODIFIER LA RESPONSABILITÉ' : 'NOUVELLE RESPONSABILITÉ'}
            </p>
            <h2 id="responsibility-title" className="m-0 text-xl tracking-[-0.03em] sm:text-[23px]">
              {editing ? 'Modifier la responsabilité' : 'Ajouter une responsabilité'}
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
          <label className={fieldLabelClass}>
            <span>
              Nom
              <Required />
            </span>
            <input className={fieldClass} name="name" maxLength={100} defaultValue={responsibility?.name} required />
          </label>
          {error && <p className={noticeErrorClass}>{error}</p>}
          <footer className="flex justify-end gap-2.5 border-t border-[#ededeb] pt-4">
            <button className={`${buttonOutlineClass} !min-h-10 !text-xs`} type="button" onClick={onClose}>
              Annuler
            </button>
            <button className={`${buttonPrimaryClass} !min-h-10 !text-xs`} type="submit" disabled={busy}>
              {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ResponsibilityMembersPage({
  account,
  csrfToken,
  activePage,
  onNavigate,
  onLogout,
  responsibility,
  onBack,
}: {
  account: string;
  csrfToken: string;
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  responsibility: AdminResponsibility;
  onBack: () => void;
}) {
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const page = await adminRequest<PageResult<AdminUser>>(
        `users?responsibilityId=${responsibility.id}&pageSize=100`,
        { csrfToken },
      );
      setMembers(page.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les comptes.');
    } finally {
      setLoading(false);
    }
  }, [responsibility.id, csrfToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMember(user: AdminUser) {
    await adminRequest(`users/${user.id}/responsibilities/${responsibility.id}`, { method: 'POST', csrfToken });
    setMembers((current) => (current.some((member) => member.id === user.id) ? current : [...current, user]));
  }

  async function removeMember(userId: string) {
    await adminRequest(`users/${userId}/responsibilities/${responsibility.id}`, { method: 'DELETE', csrfToken });
    setMembers((current) => current.filter((member) => member.id !== userId));
  }

  return (
    <AdminShell
      account={account}
      page={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      kicker="ANDRAIKITRA"
      title={responsibility.name}
      description="Comptes des mpiandraikitra ayant cette responsabilité officielle."
      actions={
        <button className={buttonOutlineClass} type="button" onClick={onBack}>
          <Icon name="back" className="h-4 w-4" /> Retour
        </button>
      }
    >
      <MembersDashboard
        members={members}
        loading={loading}
        error={error}
        csrfToken={csrfToken}
        onAdd={addMember}
        onRemove={removeMember}
      />
    </AdminShell>
  );
}
