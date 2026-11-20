export type DownloadResponse = { setHeader(name: string, value: string): void; send(data: Uint8Array): void };

export function sendArchiveFile(
  response: DownloadResponse,
  archive: { id: string; contentType: string; fileName: string },
  data: Uint8Array,
): void {
  response.setHeader('Content-Type', archive.contentType);
  response.setHeader('Content-Length', String(data.byteLength));
  response.setHeader(
    'Content-Disposition',
    `inline; filename="archive-${archive.id}${archive.fileName.slice(archive.fileName.lastIndexOf('.'))}"`,
  );
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.send(data);
}
