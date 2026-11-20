function isDocx(buffer: Buffer): boolean {
  if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return false;
  const searchStart = Math.max(0, buffer.length - 65_557);
  let endRecord = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endRecord = offset;
      break;
    }
  }
  if (endRecord < 0) return false;
  const entryCount = buffer.readUInt16LE(endRecord + 10);
  let cursor = buffer.readUInt32LE(endRecord + 16);
  const entries = new Set<string>();
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) return false;
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    if (cursor + 46 + nameLength + extraLength + commentLength > buffer.length) return false;
    entries.add(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8'));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries.has('[Content_Types].xml') && entries.has('word/document.xml');
}

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export const ATTACHMENT_TYPES = {
  '.pdf': { mime: 'application/pdf', signature: (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-', kind: 'FILE' },
  '.doc': {
    mime: 'application/msword',
    signature: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    kind: 'FILE',
  },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: isDocx,
    kind: 'FILE',
  },
  '.jpg': {
    mime: 'image/jpeg',
    signature: (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
    kind: 'IMAGE',
  },
  '.jpeg': {
    mime: 'image/jpeg',
    signature: (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
    kind: 'IMAGE',
  },
  '.png': {
    mime: 'image/png',
    signature: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    kind: 'IMAGE',
  },
  '.mp4': {
    mime: 'video/mp4',
    signature: (b: Buffer) => b.length > 11 && b.subarray(4, 8).toString() === 'ftyp',
    kind: 'VIDEO',
  },
} as const;

export type AttachmentExtension = keyof typeof ATTACHMENT_TYPES;
