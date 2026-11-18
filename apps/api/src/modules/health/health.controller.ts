import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: 'ok' }> {
    if (!(await this.health.isDatabaseReady())) {
      throw new ServiceUnavailableException({ status: 'unavailable', dependency: 'database' });
    }
    return { status: 'ok' };
  }
}
