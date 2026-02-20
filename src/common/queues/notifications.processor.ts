import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE_NAME } from './queue.constants';

export interface NotificationJobPayload {
  type: string;
  userId?: string;
  email?: string;
  subject?: string;
  body?: string;
  [key: string]: unknown;
}

@Processor(NOTIFICATIONS_QUEUE_NAME)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<NotificationJobPayload, unknown, string>): Promise<unknown> {
    this.logger.log(`Processing job ${job.id} (${job.name}) type=${job.data?.type}`);
    try {
      switch (job.name) {
        case 'email':
          return this.handleEmail(job);
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
          return { ok: true, skipped: true };
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed`, error);
      throw error;
    }
  }

  private async handleEmail(job: Job<NotificationJobPayload>): Promise<{ ok: boolean }> {
    const { email, subject, body } = job.data;
    if (!email) {
      this.logger.warn('Email job missing email');
      return { ok: false };
    }
    // Delegate to EmailService when needed; for now just log (inject EmailService if you want to send)
    this.logger.log(`[Email] to=${email} subject=${subject ?? '(none)'}`);
    return { ok: true };
  }
}
