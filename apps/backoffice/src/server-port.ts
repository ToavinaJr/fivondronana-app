const DEFAULT_BACKOFFICE_PORT = 5173;

export function resolveBackofficePort(backofficeUrl: string | undefined): number {
  const value = backofficeUrl?.trim();
  if (!value) return DEFAULT_BACKOFFICE_PORT;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    const explicitPort = value.match(/\/\/[^/?#]*:(\d+)(?:$|[/?#])/u)?.[1];
    if (explicitPort && Number(explicitPort) > 65535)
      throw new Error('Le port de BACKOFFICE_URL doit être compris entre 1 et 65535.');
    throw new Error('BACKOFFICE_URL doit être une URL HTTP(S) valide.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw new Error('BACKOFFICE_URL doit être une URL HTTP(S) valide.');

  if (!parsed.port) return DEFAULT_BACKOFFICE_PORT;
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Le port de BACKOFFICE_URL doit être compris entre 1 et 65535.');
  return port;
}
