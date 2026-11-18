import type { PersonalCv } from './auth-api';

export function readCvResponse(response: Response, allowMissing: true): Promise<PersonalCv | null>;
export function readCvResponse(response: Response, allowMissing: false): Promise<PersonalCv>;
export async function readCvResponse(response: Response, allowMissing: boolean): Promise<PersonalCv | null> {
  const text = await response.text();
  // Nest sends an empty body when the optional GET result is null.
  if (allowMissing && !text.trim()) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Valin-teny tsy araka ny tokony ho izy avy amin’ny mpizara. Andramo indray.');
  }
  if (allowMissing && payload === null) return null;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Valin-teny tsy araka ny tokony ho izy avy amin’ny mpizara. Andramo indray.');
  }
  return payload as PersonalCv;
}
