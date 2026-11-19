export function formatArchiveSize(size: number): string {
  if (size < 1024) return `${size} octets`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}
