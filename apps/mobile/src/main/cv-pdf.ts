import type { PersonalCv } from '../access/auth-api';

export function createCvHtml(cv: PersonalCv): string {
  const escapeHtml = (value: string | null | undefined) =>
    (value ?? '').replace(
      /[&<>"']/g,
      (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character,
    );
  const row = (label: string, value: string | null | undefined) =>
    `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</p>`;
  const branches = cv.branches
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)} · ${escapeHtml(item.group)}${item.project ? ` — ${escapeHtml(item.project)}` : ''}</li>`,
    )
    .join('');
  const activities = cv.activities
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)}${item.responsibility ? ` — ${escapeHtml(item.responsibility)}` : ''}${item.description ? `: ${escapeHtml(item.description)}` : ''}${item.date ? ` (${escapeHtml(item.date)})` : ''}</li>`,
    )
    .join('');
  const extraPersonal = cv.extraPersonal
    .filter(Boolean)
    .map((value, index) => row(`Fanampiny ${index + 1}`, value))
    .join('');
  const extraContact = cv.extraContact
    .filter(Boolean)
    .map((value, index) => row(`Fifandraisana fanampiny ${index + 1}`, value))
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#171717;padding:28px;line-height:1.45}h1{color:#B8170F;font-size:24px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:5px;margin-top:22px}p,li{font-size:13px}</style></head><body><h1>FIVONDRONANA — CV</h1><h2>Fampahafantarana ny tena</h2>${row('Anarana', `${cv.firstName} ${cv.lastName}`)}${row('Adiresy', cv.address)}${row('Daty nahaterahana', cv.birthDate)}${row('Toerana nahaterahana', cv.birthPlace)}${extraPersonal}<h2>Fifandraisana</h2>${row('Finday', cv.phone)}${row('Mailaka', cv.email)}${row('Facebook', cv.facebook)}${extraContact}<h2>Fampahafantarana ny maha skoto</h2>${row('Faritany', cv.province)}${row('Faritra', cv.area)}${row('Fivondronana', cv.fivondronana)}<h2>Sampana</h2><ul>${branches}</ul><h2>Hetsika</h2><ul>${activities}</ul></body></html>`;
}
