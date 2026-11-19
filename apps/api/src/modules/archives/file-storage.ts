export type StoredFile = { data: Uint8Array; size: number; sha256: string };

export interface FileStorage {
  put(key: string, file: StoredFile): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface VirusScanner {
  scan(data: Uint8Array): Promise<void>;
}

export const VIRUS_SCANNER = Symbol('VIRUS_SCANNER');
