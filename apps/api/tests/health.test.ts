import { describe, expect, it, mock } from 'bun:test';
import { HealthService } from '../src/modules/health/health.service.js';

describe('API readiness', () => {
  it('reports database availability after a successful query', async () => {
    const prisma = { $queryRaw: mock(async () => 1) };
    expect(await new HealthService(prisma as never).isDatabaseReady()).toBe(true);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable when the database query fails', async () => {
    const prisma = {
      $queryRaw: mock(async () => {
        throw new Error('database offline');
      }),
    };
    expect(await new HealthService(prisma as never).isDatabaseReady()).toBe(false);
  });
});
