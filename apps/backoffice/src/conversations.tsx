import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { type AdminConversation, type AdminEntity, type AdminUser, adminRequest } from './admin-client';
import { type AdminPage, AdminShell, Icon, iconButtonClass, Required } from './admin-shell';
import { MemberPicker } from './member-picker';
import { MembersDashboard } from './members-dashboard';
import { buttonOutlineClass, buttonPrimaryClass, fieldClass, fieldLabelClass, noticeErrorClass } from './ui-classes';

export function ConversationsPage({
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
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [entities, setEntities] = useState<AdminEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState<AdminConversation | 'new' | null>(null);
  const [viewingMembers, setViewingMembers] = useState<AdminConversation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [conversationList, entityList] = await Promise.all([
        adminRequest<AdminConversation[]>('conversations', { csrfToken }),
        adminRequest<AdminEntity[]>('entities', { csrfToken }),
      ]);
      setConversations(conversationList);
      setEntities(entityList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les Hafatra.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(conversation: AdminConversation) {
    setBusyId(conversation.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`conversations/${conversation.id}/active`, {
        method: 'PATCH',
        body: { isActive: !conversation.isActive },
        csrfToken,
      });
      setNotice(conversation.isActive ? 'Hafatra désactivé.' : 'Hafatra réactivé.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La modification a échoué.');
    } finally {
      setBusyId('');
    }
  }

  async function remove(conversation: AdminConversation) {
    if (!window.confirm(`Supprimer définitivement « ${conversation.title} » ?`)) return;
    setBusyId(conversation.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`conversations/${conversation.id}/custom`, { method: 'DELETE', csrfToken });
      setNotice('Hafatra supprimé.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La suppression a échoué.');
    } finally {
      setBusyId('');
    }
  }

  if (viewingMembers)
    return (
      <ConversationMembersPage
        account={account}
        csrfToken={csrfToken}
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        conversation={viewingMembers}
        onBack={() => setViewingMembers(null)}
      />
    );

  return (
    <AdminShell
      account={account}
      page={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      kicker="MESSAGERIE"
      title="Hafatra"
      description="Créez des espaces de discussion pour une ou plusieurs entités, et/ou ajoutez des personnes précises."
      actions={
        <button className={buttonPrimaryClass} type="button" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Créer un Hafatra
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

      <ConversationsTable
        conversations={conversations}
        loading={loading}
        error={error}
        busyId={busyId}
        onOpen={setViewingMembers}
        onEdit={setEditing}
        onToggleActive={toggleActive}
        onRemove={remove}
      />

      {editing && (
        <ConversationFormModal
          conversation={editing === 'new' ? null : editing}
          entities={entities}
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

function scopeLabel(conversation: AdminConversation): string {
  if (conversation.kind === 'GENERAL') return 'Tout le monde';
  if (conversation.kind === 'ENTITY') return conversation.entities[0]?.entity.name ?? '—';
  const parts: string[] = [];
  if (conversation.entities.length) parts.push(`${conversation.entities.length} vondrona`);
  if (conversation.members.length) parts.push(`${conversation.members.length} olona`);
  return parts.length ? parts.join(' + ') : '—';
}

function kindLabel(kind: AdminConversation['kind']): string {
  return kind === 'GENERAL' ? 'Ankapobeny' : kind === 'ENTITY' ? 'Vondrona' : 'Personnalisé';
}

function ConversationsTable({
  conversations,
  loading,
  error,
  busyId,
  onOpen,
  onEdit,
  onToggleActive,
  onRemove,
}: {
  conversations: AdminConversation[];
  loading: boolean;
  error: string;
  busyId: string;
  onOpen: (conversation: AdminConversation) => void;
  onEdit: (conversation: AdminConversation) => void;
  onToggleActive: (conversation: AdminConversation) => Promise<void>;
  onRemove: (conversation: AdminConversation) => Promise<void>;
}) {
  const emptyState = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1ef] text-[#9c211a]">
        <Icon name="messages" className="h-5 w-5" />
      </span>
      <strong className="mt-2 block text-sm text-[#393a37]">Aucun Hafatra pour le moment</strong>
    </>
  );

  return (
    <>
      <div className="hidden overflow-auto rounded-[10px] border border-[#e2e3df] bg-white sm:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr>
              {['Titre', 'Type', 'Portée', 'Statut'].map((heading) => (
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
                <td colSpan={5} className="!h-[170px] !text-center text-[#777973]">
                  Chargement des Hafatra…
                </td>
              </tr>
            )}
            {!loading && !error && conversations.length === 0 && (
              <tr>
                <td colSpan={5} className="!h-[170px] !text-center text-[#777973]">
                  <div className="mx-auto flex max-w-xs flex-col items-center">{emptyState}</div>
                </td>
              </tr>
            )}
            {!loading &&
              conversations.map((conversation) => (
                <tr key={conversation.id} className="[&:last-child>td]:border-b-0">
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    {conversation.kind === 'CUSTOM' ? (
                      <button
                        type="button"
                        className="font-semibold text-[#30312e] hover:underline"
                        onClick={() => onOpen(conversation)}
                      >
                        {conversation.title}
                      </button>
                    ) : (
                      <span className="font-semibold text-[#30312e]">{conversation.title}</span>
                    )}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {kindLabel(conversation.kind)}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {scopeLabel(conversation)}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <ActiveBadge isActive={conversation.isActive} />
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    <div className="flex justify-end gap-0.5">
                      {conversation.kind === 'CUSTOM' && (
                        <>
                          <button
                            className={iconButtonClass}
                            type="button"
                            title="Modifier"
                            aria-label={`Modifier ${conversation.title}`}
                            disabled={busyId === conversation.id}
                            onClick={() => onEdit(conversation)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className={iconButtonClass}
                            type="button"
                            title="Supprimer"
                            aria-label={`Supprimer ${conversation.title}`}
                            disabled={busyId === conversation.id}
                            onClick={() => void onRemove(conversation)}
                          >
                            <Icon name="trash" />
                          </button>
                        </>
                      )}
                      <button
                        className={iconButtonClass}
                        type="button"
                        title={conversation.isActive ? 'Désactiver' : 'Réactiver'}
                        aria-label={`${conversation.isActive ? 'Désactiver' : 'Réactiver'} ${conversation.title}`}
                        disabled={busyId === conversation.id}
                        onClick={() => void onToggleActive(conversation)}
                      >
                        <Icon name={conversation.isActive ? 'pause' : 'check'} />
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
            Chargement des Hafatra…
          </div>
        )}
        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center rounded-[10px] border border-[#e2e3df] bg-white p-7 text-center">
            {emptyState}
          </div>
        )}
        {!loading &&
          conversations.map((conversation) => (
            <div key={conversation.id} className="rounded-[10px] border border-[#e2e3df] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                {conversation.kind === 'CUSTOM' ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-xs font-semibold text-[#30312e] hover:underline"
                    onClick={() => onOpen(conversation)}
                  >
                    {conversation.title}
                  </button>
                ) : (
                  <strong className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                    {conversation.title}
                  </strong>
                )}
                <ActiveBadge isActive={conversation.isActive} />
              </div>
              <small className="mt-1 block text-[11px] text-[#858680]">
                {kindLabel(conversation.kind)} · {scopeLabel(conversation)}
              </small>
              <div className="mt-3 flex justify-end gap-0.5 border-t border-[#eeeeeb] pt-3">
                {conversation.kind === 'CUSTOM' && (
                  <>
                    <button
                      className={iconButtonClass}
                      type="button"
                      title="Modifier"
                      aria-label={`Modifier ${conversation.title}`}
                      disabled={busyId === conversation.id}
                      onClick={() => onEdit(conversation)}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      className={iconButtonClass}
                      type="button"
                      title="Supprimer"
                      aria-label={`Supprimer ${conversation.title}`}
                      disabled={busyId === conversation.id}
                      onClick={() => void onRemove(conversation)}
                    >
                      <Icon name="trash" />
                    </button>
                  </>
                )}
                <button
                  className={iconButtonClass}
                  type="button"
                  title={conversation.isActive ? 'Désactiver' : 'Réactiver'}
                  aria-label={`${conversation.isActive ? 'Désactiver' : 'Réactiver'} ${conversation.title}`}
                  disabled={busyId === conversation.id}
                  onClick={() => void onToggleActive(conversation)}
                >
                  <Icon name={conversation.isActive ? 'pause' : 'check'} />
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold';
  const dot = 'inline-block h-1.5 w-1.5 rounded-full bg-current';
  return isActive ? (
    <span className={`${base} bg-[#eaf5ee] text-[#18704c]`}>
      <i className={dot} /> Actif
    </span>
  ) : (
    <span className={`${base} bg-[#f0f0ee] text-[#777973]`}>
      <i className={dot} /> Inactif
    </span>
  );
}

function ConversationFormModal({
  conversation,
  entities,
  csrfToken,
  onClose,
  onSaved,
}: {
  conversation: AdminConversation | null;
  entities: AdminEntity[];
  csrfToken: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [entityIds, setEntityIds] = useState<string[]>(
    () => conversation?.entities.map((link) => link.entity.id) ?? [],
  );
  const [members, setMembers] = useState<{ id: string; accountName: string }[]>(
    () => conversation?.members.map((link) => link.user) ?? [],
  );
  const editing = Boolean(conversation);

  function toggleEntity(entityId: string) {
    setEntityIds((current) =>
      current.includes(entityId) ? current.filter((id) => id !== entityId) : [...current, entityId],
    );
  }

  function addMember(user: AdminUser) {
    setMembers((current) => (current.some((member) => member.id === user.id) ? current : [...current, user]));
  }

  function removeMember(userId: string) {
    setMembers((current) => current.filter((member) => member.id !== userId));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (entityIds.length === 0 && members.length === 0) {
      setError('Sélectionnez au moins une entité ou une personne.');
      return;
    }
    setBusy(true);
    const title = String(new FormData(event.currentTarget).get('title') ?? '').trim();
    const body = { title, entityIds, memberUserIds: members.map((member) => member.id) };
    try {
      if (conversation) {
        await adminRequest(`conversations/${conversation.id}/custom`, { method: 'PATCH', body, csrfToken });
        await onSaved('Hafatra mis à jour.');
      } else {
        await adminRequest('conversations/custom', { method: 'POST', body, csrfToken });
        await onSaved('Hafatra créé.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer ce Hafatra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgb(25,27,24)]/50 p-5 sm:p-6">
      <section
        className="max-h-[95vh] w-full max-w-[600px] overflow-auto rounded-xl bg-white shadow-[0_24px_80px_rgb(0_0_0/0.22)] sm:max-h-[min(92vh,900px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-title"
      >
        <header className="flex items-start justify-between border-b border-[#ededeb] px-[19px] py-[21px] sm:px-7 sm:py-6">
          <div>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.1em] text-[#858782]">
              {editing ? 'MODIFIER LE HAFATRA' : 'NOUVEAU HAFATRA'}
            </p>
            <h2 id="conversation-title" className="m-0 text-xl tracking-[-0.03em] sm:text-[23px]">
              {editing ? 'Modifier le Hafatra' : 'Créer un Hafatra'}
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
              Titre
              <Required />
            </span>
            <input className={fieldClass} name="title" maxLength={160} defaultValue={conversation?.title} required />
          </label>

          {!editing && (
            <>
              <div className={fieldLabelClass}>
                <span>Entités (tous les membres de ces entités verront ce Hafatra)</span>
                <div className="grid max-h-[160px] gap-1.5 overflow-auto rounded-[7px] border border-[#dfe0dc] p-2.5">
                  {entities.length === 0 && <span className="px-1.5 py-1 text-xs text-[#858680]">Aucune entité.</span>}
                  {entities.map((entity) => (
                    <label key={entity.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px]">
                      <input
                        className="accent-brand-red"
                        type="checkbox"
                        checked={entityIds.includes(entity.id)}
                        onChange={() => toggleEntity(entity.id)}
                      />
                      <span className={entity.isActive ? '' : 'text-[#aaa]'}>{entity.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <MemberPicker csrfToken={csrfToken} members={members} onAdd={addMember} onRemove={removeMember} />
            </>
          )}

          {error && <p className={noticeErrorClass}>{error}</p>}
          <footer className="sticky -bottom-[19px] -mx-[19px] -mb-[19px] flex justify-end gap-2.5 border-t border-[#ededeb] bg-white px-[19px] py-[13px] sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1">
            <button className={`${buttonOutlineClass} !min-h-10 !text-xs`} type="button" onClick={onClose}>
              Annuler
            </button>
            <button className={`${buttonPrimaryClass} !min-h-10 !text-xs`} type="submit" disabled={busy}>
              {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ConversationMembersPage({
  account,
  csrfToken,
  activePage,
  onNavigate,
  onLogout,
  conversation,
  onBack,
}: {
  account: string;
  csrfToken: string;
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  conversation: AdminConversation;
  onBack: () => void;
}) {
  const [members, setMembers] = useState<AdminUser[]>(
    () => conversation.members.map((link) => link.user) as AdminUser[],
  );
  const [error, setError] = useState('');

  async function save(nextMembers: AdminUser[]) {
    await adminRequest(`conversations/${conversation.id}/custom`, {
      method: 'PATCH',
      body: {
        title: conversation.title,
        entityIds: conversation.entities.map((link) => link.entity.id),
        memberUserIds: nextMembers.map((member) => member.id),
      },
      csrfToken,
    });
  }

  async function addMember(user: AdminUser) {
    setError('');
    const next = members.some((member) => member.id === user.id) ? members : [...members, user];
    try {
      await save(next);
      setMembers(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’ajouter ce compte.');
    }
  }

  async function removeMember(userId: string) {
    setError('');
    const next = members.filter((member) => member.id !== userId);
    try {
      await save(next);
      setMembers(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de retirer ce compte.');
    }
  }

  return (
    <AdminShell
      account={account}
      page={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      kicker="HAFATRA"
      title={conversation.title}
      description="Comptes ajoutés directement à ce Hafatra."
      actions={
        <button className={buttonOutlineClass} type="button" onClick={onBack}>
          <Icon name="back" className="h-4 w-4" /> Retour
        </button>
      }
    >
      <MembersDashboard
        members={members}
        loading={false}
        error={error}
        csrfToken={csrfToken}
        onAdd={addMember}
        onRemove={removeMember}
      />
    </AdminShell>
  );
}
