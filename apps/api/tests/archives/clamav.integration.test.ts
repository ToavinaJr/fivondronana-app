import { describe, expect, it } from 'bun:test';
import { ClamAvScanner } from '../../src/modules/archives/clamav.scanner.js';

const scannerPort = process.env.CLAMAV_PORT;
describe.skipIf(!scannerPort)('ClamAV INSTREAM protocol', () => {
  it('accepts clean content and blocks the harmless EICAR antivirus test signature', async () => {
    const previousHost = process.env.CLAMAV_HOST;
    const previousPort = process.env.CLAMAV_PORT;
    process.env.CLAMAV_HOST = '127.0.0.1';
    process.env.CLAMAV_PORT = scannerPort;
    try {
      const scanner = new ClamAvScanner();
      await expect(scanner.scan(Buffer.from('clean Arisiva test content'))).resolves.toBeUndefined();
      const eicar = String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`;
      await expect(scanner.scan(Buffer.from(eicar))).rejects.toThrow('votoaty mampidi-doza');
    } finally {
      if (previousHost === undefined) delete process.env.CLAMAV_HOST;
      else process.env.CLAMAV_HOST = previousHost;
      if (previousPort === undefined) delete process.env.CLAMAV_PORT;
      else process.env.CLAMAV_PORT = previousPort;
    }
  });
});
