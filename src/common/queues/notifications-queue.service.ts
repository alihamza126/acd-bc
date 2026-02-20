import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE_NAME } from './queue.constants';
import type { NotificationJobPayload } from './notifications.processor';

@Injectable()
export class NotificationsQueueService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  /** Add an email notification job. */
  async addEmailJob(data: {
    email: string;
    subject?: string;
    body?: string;
    userId?: string;
  }): Promise<string> {
    const job = await this.queue.add(
      'email',
      {
        type: 'email',
        email: data.email,
        subject: data.subject,
        body: data.body,
        userId: data.userId,
      } as NotificationJobPayload,
      { removeOnComplete: { count: 1000 } },
    );
    return job.id ?? '';
  }

  /** Add a generic notification job by name. */
  async addJob(name: string, data: NotificationJobPayload): Promise<string> {
    const job = await this.queue.add(name, data, {
      removeOnComplete: { count: 1000 },
    });
    return job.id ?? '';
  }
}
