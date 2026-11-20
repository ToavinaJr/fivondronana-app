import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { type AdminArchive, adminRequest } from './admin-client';
import { type AdminPage, AdminShell, Icon, iconButtonClass } from './admin-shell';
import { buttonOutlineClass, buttonPrimaryClass, noticeErrorClass } from './ui-classes';

const ACCEPTED_EXTENSIONS = '.pdf,.docx';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ArchivesPage({
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
  const [archives, setArchives] = useState<AdminArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setArchives(await adminRequest<AdminArchive[]>('archives', { csrfToken }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les archives.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublished(archive: AdminArchive) {
    setBusyId(archive.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`archives/${archive.id}/published`, {
        method: 'PATCH',
        body: { isPublished: !archive.isPublished },
        csrfToken,
      });
      setNotice(archive.isPublished ? 'Archive dépubliée.' : 'Archive publiée et visible dans l’application.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La modification a échoué.');
    } finally {
      setBusyId('');
    }
  }

  async function remove(archive: AdminArchive) {
    if (!window.confirm(`Supprimer définitivement « ${archive.title} » ?`)) return;
    setBusyId(archive.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`archives/${archive.id}`, { method: 'DELETE', csrfToken });
      setNotice('Archive supprimée.');
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
      kicker="DOCUMENTS"
      title="Arisiva"
      description="Ajoutez des documents PDF ou Word et publiez-les pour qu’ils apparaissent dans l’application."
      actions={
        <button className={buttonPrimaryClass} type="button" onClick={() => setUploading(true)}>
          <Icon name="upload" /> Ajouter une archive
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

      <ArchivesTable
        archives={archives}
        loading={loading}
        error={error}
        busyId={busyId}
        onTogglePublished={togglePublished}
        onRemove={remove}
      />

      {uploading && (
        <ArchiveUploadModal
          csrfToken={csrfToken}
          onClose={() => setUploading(false)}
          onUploaded={async (message) => {
            setUploading(false);
            setNotice(message);
            await load();
          }}
        />
      )}
    </AdminShell>
  );
}

function ArchivesTable({
  archives,
  loading,
  error,
  busyId,
  onTogglePublished,
  onRemove,
}: {
  archives: AdminArchive[];
  loading: boolean;
  error: string;
  busyId: string;
  onTogglePublished: (archive: AdminArchive) => Promise<void>;
  onRemove: (archive: AdminArchive) => Promise<void>;
}) {
  const emptyState = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1ef] text-[#9c211a]">
        <Icon name="archive" className="h-5 w-5" />
      </span>
      <strong className="mt-2 block text-sm text-[#393a37]">Aucune archive pour le moment</strong>
      <span className="mt-1 block text-xs text-[#777973]">Ajoutez un document PDF ou Word pour commencer.</span>
    </>
  );

  return (
    <>
      <div className="hidden overflow-auto rounded-[10px] border border-[#e2e3df] bg-white sm:block">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr>
              {['Document', 'Catégorie', 'Année', 'Taille', 'Statut'].map((heading) => (
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
                  Chargement des archives…
                </td>
              </tr>
            )}
            {!loading && !error && archives.length === 0 && (
              <tr>
                <td colSpan={6} className="!h-[170px] !text-center text-[#777973]">
                  <div className="mx-auto flex max-w-xs flex-col items-center">{emptyState}</div>
                </td>
              </tr>
            )}
            {!loading &&
              archives.map((archive) => (
                <tr key={archive.id} className="[&:last-child>td]:border-b-0">
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <div className="flex min-w-[170px] items-center gap-2.5">
                      <ArchiveIcon contentType={archive.contentType} />
                      <span className="grid min-w-0 gap-1">
                        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                          {archive.title}
                        </strong>
                        <small className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#858680]">
                          {archive.fileName}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {archive.category}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {archive.year ?? '—'}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    {formatSize(archive.size)}
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs text-[#41423e]">
                    <PublishedBadge isPublished={archive.isPublished} />
                  </td>
                  <td className="h-[70px] border-b border-[#eeeeeb] px-4 align-middle text-xs">
                    <div className="flex justify-end gap-0.5">
                      <RowActions
                        archive={archive}
                        busyId={busyId}
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
            Chargement des archives…
          </div>
        )}
        {!loading && !error && archives.length === 0 && (
          <div className="flex flex-col items-center rounded-[10px] border border-[#e2e3df] bg-white p-7 text-center">
            {emptyState}
          </div>
        )}
        {!loading &&
          archives.map((archive) => (
            <div key={archive.id} className="rounded-[10px] border border-[#e2e3df] bg-white p-4">
              <div className="flex items-center gap-2.5">
                <ArchiveIcon contentType={archive.contentType} />
                <div className="min-w-0 flex-1">
                  <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#30312e]">
                    {archive.title}
                  </strong>
                  <small className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#858680]">
                    {archive.fileName}
                  </small>
                </div>
                <PublishedBadge isPublished={archive.isPublished} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-[11px]">
                <div>
                  <dt className="mb-1 text-[#858782]">Catégorie</dt>
                  <dd>{archive.category}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[#858782]">Année</dt>
                  <dd>{archive.year ?? '—'}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[#858782]">Taille</dt>
                  <dd>{formatSize(archive.size)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-end gap-0.5 border-t border-[#eeeeeb] pt-3">
                <RowActions
                  archive={archive}
                  busyId={busyId}
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

function ArchiveIcon({ contentType }: { contentType: string }) {
  const label = contentType === 'application/pdf' ? 'PDF' : 'DOCX';
  return (
    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg bg-[#f0f1ee] text-[9px] font-bold text-[#565a55]">
      {label}
    </span>
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
  archive,
  busyId,
  onTogglePublished,
  onRemove,
}: {
  archive: AdminArchive;
  busyId: string;
  onTogglePublished: (archive: AdminArchive) => Promise<void>;
  onRemove: (archive: AdminArchive) => Promise<void>;
}) {
  const busy = busyId === archive.id;
  return (
    <>
      <button
        className={iconButtonClass}
        type="button"
        title={archive.isPublished ? 'Dépublier' : 'Publier'}
        aria-label={`${archive.isPublished ? 'Dépublier' : 'Publier'} ${archive.title}`}
        disabled={busy}
        onClick={() => void onTogglePublished(archive)}
      >
        <Icon name={archive.isPublished ? 'eye-off' : 'eye'} />
      </button>
      <button
        className={iconButtonClass}
        type="button"
        title="Supprimer"
        aria-label={`Supprimer ${archive.title}`}
        disabled={busy}
        onClick={() => void onRemove(archive)}
      >
        <Icon name="trash" />
      </button>
    </>
  );
}

function ArchiveUploadModal({
  csrfToken,
  onClose,
  onUploaded,
}: {
  csrfToken: string;
  onClose: () => void;
  onUploaded: (message: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldClass =
    'h-[42px] w-full rounded-[7px] border border-[#dfe0dc] px-[11px] text-[13px] font-normal text-[#2e2f2b] outline-none focus:border-brand-teal focus:shadow-[0_0_0_3px_rgb(8_127_123/0.11)]';
  const fieldLabelClass = 'grid gap-[7px] text-xs font-bold text-[#454641]';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choisissez un fichier PDF ou Word à ajouter.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Le fichier ne doit pas dépasser 5 Mo.');
      return;
    }
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    const form = new FormData();
    form.append('title', String(fields.get('title') ?? '').trim());
    form.append('category', String(fields.get('category') ?? '').trim());
    const description = String(fields.get('description') ?? '').trim();
    if (description) form.append('description', description);
    const year = String(fields.get('year') ?? '').trim();
    if (year) form.append('year', year);
    form.append('file', file);
    try {
      await adminRequest('archives', { method: 'POST', body: form, csrfToken });
      await onUploaded('Archive ajoutée en brouillon. Publiez-la pour la rendre visible dans l’application.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’ajouter cette archive.');
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
        aria-labelledby="upload-title"
      >
        <header className="flex items-start justify-between border-b border-[#ededeb] px-[19px] py-[21px] sm:px-7 sm:py-6">
          <div>
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.1em] text-[#858782]">NOUVELLE ARCHIVE</p>
            <h2 id="upload-title" className="m-0 text-xl tracking-[-0.03em] sm:text-[23px]">
              Ajouter une archive
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
            Titre
            <input className={fieldClass} name="title" maxLength={160} required />
          </label>
          <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 sm:gap-4">
            <label className={fieldLabelClass}>
              Catégorie
              <input className={fieldClass} name="category" maxLength={80} required />
            </label>
            <label className={fieldLabelClass}>
              Année <span className="text-[10px] font-normal text-[#898a84]">Facultatif</span>
              <input className={fieldClass} name="year" type="number" min={1900} max={2200} />
            </label>
          </div>
          <label className={fieldLabelClass}>
            Description <span className="text-[10px] font-normal text-[#898a84]">Facultatif</span>
            <textarea
              className="min-h-[84px] w-full resize-y rounded-[7px] border border-[#dfe0dc] px-[11px] py-2.5 text-[13px] text-[#2e2f2b] outline-none focus:border-brand-teal focus:shadow-[0_0_0_3px_rgb(8_127_123/0.11)]"
              name="description"
              maxLength={2000}
            />
          </label>
          <label className={fieldLabelClass}>
            Fichier (PDF ou Word, 5 Mo maximum)
            <input
              ref={fileInputRef}
              className="text-[13px] text-[#2e2f2b] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1ee] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#565a55]"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              required
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
            />
            {fileName && <span className="text-[11px] text-[#797a75]">{fileName}</span>}
          </label>
          {error && <p className={noticeErrorClass}>{error}</p>}
          <footer className="sticky -bottom-[19px] -mx-[19px] -mb-[19px] flex justify-end gap-2.5 border-t border-[#ededeb] bg-white px-[19px] py-[13px] sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:pt-1">
            <button className={`${buttonOutlineClass} !min-h-10 !text-xs`} type="button" onClick={onClose}>
              Annuler
            </button>
            <button className={`${buttonPrimaryClass} !min-h-10 !text-xs`} type="submit" disabled={busy}>
              {busy ? 'Envoi…' : 'Ajouter'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
