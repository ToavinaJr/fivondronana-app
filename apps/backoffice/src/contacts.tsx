import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { type AdminContact, adminRequest } from './admin-client';
import { type AdminPage, AdminShell, Icon, iconButtonClass, Required } from './admin-shell';
import { buttonOutlineClass, buttonPrimaryClass, fieldClass, fieldLabelClass, noticeErrorClass } from './ui-classes';

export function ContactsPage({
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
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState<AdminContact | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setContacts(await adminRequest<AdminContact[]>('contacts', { csrfToken }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les contacts.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublished(contact: AdminContact) {
    setBusyId(contact.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`contacts/${contact.id}/published`, {
        method: 'PATCH',
        body: { isPublished: !contact.isPublished },
        csrfToken,
      });
      setNotice(contact.isPublished ? 'Contact dépublié.' : 'Contact publié et visible dans l’application.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La modification a échoué.');
    } finally {
      setBusyId('');
    }
  }

  async function remove(contact: AdminContact) {
    if (!window.confirm(`Supprimer définitivement « ${contact.name} » ?`)) return;
    setBusyId(contact.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`contacts/${contact.id}`, { method: 'DELETE', csrfToken });
      setNotice('Contact supprimé.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La suppression a échoué.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AdminShell
      account={account}
      page={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      kicker="ANNUAIRE"
      title="Fifandraisana"
      description="Gérez les contacts internes et externes visibles par tous les utilisateurs de l’application."
      actions={
        <button className={buttonPrimaryClass} type="button" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Ajouter un contact
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

      <ContactsTable
        contacts={contacts}
        loading={loading}
        error={error}
        busyId={busyId}
        onEdit={setEditing}
        onTogglePublished={togglePublished}
        onRemove={remove}
      />

      {editing && (
        <ContactFormModal
          contact={editing === 'new' ? null : editing}
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

function ContactsTable({
  contacts,
  loading,
  error,
  busyId,
  onEdit,
  onTogglePublished,
  onRemove,
}: {
  contacts: AdminContact[];
  loading: boolean;
  error: string;
  busyId: string;
  onEdit: (contact: AdminContact) => void;
  onTogglePublished: (contact: AdminContact) => Promise<void>;
  onRemove: (contact: AdminContact) => Promise<void>;
}) {
  const emptyState = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1ef] text-[#9c211a]">
        <Icon name="contacts" className="h-5 w-5" />
      </span>
      <strong className="mt-2 block text-sm text-[#393a37]">Aucun contact pour le moment</strong>
      <span className="mt-1 block text-xs text-[#777973]">Ajoutez un contact interne ou externe pour commencer.</span>
    </>
  );

  return (
    <>
      <div className="hidden overflow-auto rounded-[10px] border border-[#e2e3df] bg-white sm:block">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr>
              {['Contact', 'Andraikitra', 'Vondrona', 'Téléphone / e-mail', 'Statut'].map((heading) => (
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
                  Chargement des contacts…
                </td>
              </tr>
            )}
            {!loading && !error && contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="!h-[170px] !text-center text-[#777973]">
                  <div className="mx-auto flex max-w-xs flex-col items-center">{emptyState}</div>
                </td>
              </tr>
            )}
            {!loading &&
              contacts.map((contact) => (
                <tr key={contact.id} className="[&:last-child>td]:border-b-0">
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <span className="grid min-w-[170px] gap-1">
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                        {contact.name}
                      </strong>
                      <small className="block text-[11px] text-[#858680]">
                        {contact.kind === 'INTERNAL' ? 'Interne' : 'Externe'}
                      </small>
                    </span>
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {contact.responsibility}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {contact.groupLabel}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <span className="grid gap-0.5">
                      <span>{contact.phone}</span>
                      <small className="text-[11px] text-[#858680]">{contact.email}</small>
                    </span>
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <PublishedBadge isPublished={contact.isPublished} />
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    <div className="flex justify-end gap-0.5">
                      <RowActions
                        contact={contact}
                        busyId={busyId}
                        onEdit={onEdit}
                        onTogglePublished={onTogglePublished}
                        onRemove={onRemove}
                      />
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
            Chargement des contacts…
          </div>
        )}
        {!loading && !error && contacts.length === 0 && (
          <div className="flex flex-col items-center rounded-[10px] border border-[#e2e3df] bg-white p-7 text-center">
            {emptyState}
          </div>
        )}
        {!loading &&
          contacts.map((contact) => (
            <div key={contact.id} className="rounded-[10px] border border-[#e2e3df] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                    {contact.name}
                  </strong>
                  <small className="block text-[11px] text-[#858680]">
                    {contact.kind === 'INTERNAL' ? 'Interne' : 'Externe'} · {contact.responsibility}
                  </small>
                </div>
                <PublishedBadge isPublished={contact.isPublished} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div>
                  <dt className="mb-1 text-[#858782]">Vondrona</dt>
                  <dd>{contact.groupLabel}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[#858782]">Téléphone</dt>
                  <dd>{contact.phone}</dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-end gap-0.5 border-t border-[#eeeeeb] pt-3">
                <RowActions
                  contact={contact}
                  busyId={busyId}
                  onEdit={onEdit}
                  onTogglePublished={onTogglePublished}
                  onRemove={onRemove}
                />
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

function PublishedBadge({ isPublished }: { isPublished: boolean }) {
  const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold';
  const dot = 'inline-block h-1.5 w-1.5 rounded-full bg-current';
  return isPublished ? (
    <span className={`${base} bg-[#eaf5ee] text-[#18704c]`}>
      <i className={dot} /> Publié
    </span>
  ) : (
    <span className={`${base} bg-[#f0f0ee] text-[#777973]`}>
      <i className={dot} /> Brouillon
    </span>
  );
}

function RowActions({
  contact,
  busyId,
  onEdit,
  onTogglePublished,
  onRemove,
}: {
  contact: AdminContact;
  busyId: string;
  onEdit: (contact: AdminContact) => void;
  onTogglePublished: (contact: AdminContact) => Promise<void>;
  onRemove: (contact: AdminContact) => Promise<void>;
}) {
  const busy = busyId === contact.id;
  return (
    <>
      <button
        className={iconButtonClass}
        type="button"
        title="Modifier"
        aria-label={`Modifier ${contact.name}`}
        disabled={busy}
        onClick={() => onEdit(contact)}
      >
        <Icon name="edit" />
      </button>
      <button
        className={iconButtonClass}
        type="button"
        title={contact.isPublished ? 'Dépublier' : 'Publier'}
        aria-label={`${contact.isPublished ? 'Dépublier' : 'Publier'} ${contact.name}`}
        disabled={busy}
        onClick={() => void onTogglePublished(contact)}
      >
        <Icon name={contact.isPublished ? 'eye-off' : 'eye'} />
      </button>
      <button
        className={iconButtonClass}
        type="button"
        title="Supprimer"
        aria-label={`Supprimer ${contact.name}`}
        disabled={busy}
        onClick={() => void onRemove(contact)}
      >
        <Icon name="trash" />
      </button>
    </>
  );
}

function ContactFormModal({
  contact,
  csrfToken,
  onClose,
  onSaved,
}: {
  contact: AdminContact | null;
  csrfToken: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(contact);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    const body = {
      name: String(fields.get('name') ?? '').trim(),
      responsibility: String(fields.get('responsibility') ?? '').trim(),
      groupLabel: String(fields.get('groupLabel') ?? '').trim(),
      address: String(fields.get('address') ?? '').trim(),
      phone: String(fields.get('phone') ?? '').trim(),
      email: String(fields.get('email') ?? '').trim(),
      description: String(fields.get('description') ?? '').trim(),
      kind: String(fields.get('kind') ?? 'INTERNAL') as 'INTERNAL' | 'EXTERNAL',
    };
    try {
      if (contact) {
        await adminRequest(`contacts/${contact.id}`, { method: 'PATCH', body, csrfToken });
        await onSaved('Contact mis à jour.');
      } else {
        await adminRequest('contacts', { method: 'POST', body, csrfToken });
        await onSaved('Contact ajouté en brouillon. Publiez-le pour le rendre visible dans l’application.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer ce contact.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgb(25,27,24)]/50 p-5 sm:p-6">
      <section
        className="max-h-[95vh] w-full max-w-[560px] overflow-auto rounded-xl bg-white shadow-[0_24px_80px_rgb(0_0_0/0.22)] sm:max-h-[min(92vh,900px)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
      >
        <header className="flex items-start justify-between border-b border-[#ededeb] px-[19px] py-[21px] sm:px-7 sm:py-6">
          <div>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.1em] text-[#858782]">
              {editing ? 'MODIFIER LE CONTACT' : 'NOUVEAU CONTACT'}
            </p>
            <h2 id="contact-title" className="m-0 text-xl tracking-[-0.03em] sm:text-[23px]">
              {editing ? 'Modifier le contact' : 'Ajouter un contact'}
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
              <span>
                Nom
                <Required />
              </span>
              <input className={fieldClass} name="name" maxLength={150} defaultValue={contact?.name} required />
            </label>
            <label className={fieldLabelClass}>
              <span>
                Type
                <Required />
              </span>
              <select className={fieldClass} name="kind" defaultValue={contact?.kind ?? 'INTERNAL'} required>
                <option value="INTERNAL">Interne</option>
                <option value="EXTERNAL">Externe</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 sm:gap-4">
            <label className={fieldLabelClass}>
              <span>
                Andraikitra (fonction)
                <Required />
              </span>
              <input
                className={fieldClass}
                name="responsibility"
                maxLength={150}
                defaultValue={contact?.responsibility}
                required
              />
            </label>
            <label className={fieldLabelClass}>
              <span>
                Vondrona (groupe)
                <Required />
              </span>
              <input
                className={fieldClass}
                name="groupLabel"
                maxLength={150}
                defaultValue={contact?.groupLabel}
                required
              />
            </label>
          </div>
          <label className={fieldLabelClass}>
            <span>
              Adresse
              <Required />
            </span>
            <input className={fieldClass} name="address" maxLength={250} defaultValue={contact?.address} required />
          </label>
          <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 sm:gap-4">
            <label className={fieldLabelClass}>
              <span>
                Téléphone
                <Required />
              </span>
              <input className={fieldClass} name="phone" maxLength={40} defaultValue={contact?.phone} required />
            </label>
            <label className={fieldLabelClass}>
              <span>
                E-mail
                <Required />
              </span>
              <input
                className={fieldClass}
                name="email"
                type="email"
                maxLength={250}
                defaultValue={contact?.email}
                required
              />
            </label>
          </div>
          <label className={fieldLabelClass}>
            <span>
              Description
              <Required />
            </span>
            <textarea
              className="min-h-[84px] w-full resize-y rounded-[7px] border border-[#dfe0dc] px-[11px] py-2.5 text-[13px] text-[#2e2f2b] outline-none focus:border-brand-teal focus:shadow-[0_0_0_3px_rgb(8_127_123/0.11)]"
              name="description"
              maxLength={1000}
              defaultValue={contact?.description}
              required
            />
          </label>
          {error && <p className={noticeErrorClass}>{error}</p>}
          <footer className="sticky -bottom-[19px] -mx-[19px] -mb-[19px] flex justify-end gap-2.5 border-t border-[#ededeb] bg-white px-[19px] py-[13px] sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1">
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
