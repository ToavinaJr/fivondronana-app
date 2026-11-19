import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Socket } from 'node:net';
import type { VirusScanner } from './file-storage.js';

const MAX_SCAN_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ClamAvScanner implements VirusScanner {
  async scan(data: Uint8Array): Promise<void> {
    if (data.byteLength > MAX_SCAN_BYTES) throw new UnprocessableEntityException('Ny rakitra dia mihoatra ny 5 Mo.');
    const host = process.env.CLAMAV_HOST ?? '127.0.0.1';
    const port = Number(process.env.CLAMAV_PORT ?? 3310);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new ServiceUnavailableException('Tsy voarindra ny scanner antivirus.');

    const result = await new Promise<string>((resolve, reject) => {
      const socket = new Socket();
      const chunks: Buffer[] = [];
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(error);
      };
      socket.setTimeout(15_000, () => fail(new Error('ClamAV timeout')));
      socket.on('error', fail);
      socket.on('data', (chunk) => chunks.push(chunk));
      socket.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim());
      });
      socket.connect(port, host, () => {
        socket.write('zINSTREAM\0');
        for (let offset = 0; offset < data.byteLength; offset += 64 * 1024) {
          const chunk = Buffer.from(data.subarray(offset, Math.min(offset + 64 * 1024, data.byteLength)));
          const length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.byteLength);
          socket.write(length);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
        socket.end();
      });
    }).catch(() => {
      throw new ServiceUnavailableException('Tsy afaka nanamarina ny rakitra ny scanner antivirus.');
    });

    if (result.endsWith(' FOUND'))
      throw new UnprocessableEntityException('Nahitana votoaty mampidi-doza ilay rakitra.');
    if (!result.endsWith(' OK'))
      throw new ServiceUnavailableException('Tsy nahazo valiny azo antoka avy amin’ny scanner antivirus.');
  }
}
