import { Injectable, Logger } from '@nestjs/common';
import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';
import { generateICalEvent } from './utils/ical-generator.util';
import { createConfirmationEmail } from './templates/confirmation.template';
import { Event } from '../events/entities/event.entity';

@Injectable()
export class MailService {
  private readonly sesClient: SESClient | null;
  private readonly logger = new Logger(MailService.name);
  private readonly emailFrom: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_SES_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SES_SECRET_ACCESS_KEY',
    );
    const sessionToken = this.configService.get<string>('AWS_SESSION_TOKEN');
    const region = this.configService.get<string>('AWS_SES_REGION');

    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    if (!emailFrom) {
      throw new Error('EMAIL_FROM not configured in environment variables');
    }
    this.emailFrom = emailFrom;

    if (accessKeyId && secretAccessKey && region) {
      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        },
      });
    } else {
      this.sesClient = null;
      this.logger.warn('SES: Missing credentials. Emails will be skipped.');
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.sesClient) return;

    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
      Source: this.emailFrom,
    });

    await this.sesClient.send(command);
  }

  async sendEmailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachment: { filename: string; content: string; contentType: string },
  ) {
    if (!this.sesClient) return;

    const boundary = 'NextPart';

    const rawMessage = [
      `From: ${this.emailFrom}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html,
      ``,
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Buffer.from(attachment.content).toString('base64'),
      `--${boundary}--`,
    ].join('\r\n');

    await this.sesClient.send(
      new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawMessage),
        },
      }),
    );
  }

  async sendAccountDeleted(email: string, userName: string) {
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !this.sesClient
    ) {
      console.log(
        'Skipping email send - AWS credentials or SES client not configured',
      );
      return;
    }

    const params = {
      Destination: { ToAddresses: [email] },
      Message: {
        Body: {
          Text: {
            Data: `Hello ${userName}, your account has been deactivated. If this wasn't you, please contact us.`,
          },
        },
        Subject: { Data: 'Account Deactivated' },
      },
      Source: this.emailFrom,
    };

    await this.sesClient.send(new SendEmailCommand(params));
  }

  async sendEventDeleted(email: string, event: Event) {
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !this.sesClient
    ) {
      console.log('Skipping email send - AWS credentials not configured');
      return;
    }

    const params = {
      Destination: { ToAddresses: [email] },
      Message: {
        Body: {
          Text: {
            Data: `The event "${event.name}" has been canceled. If you have any questions, please contact us.`,
          },
        },
        Subject: { Data: 'Event Canceled' },
      },
      Source: this.emailFrom,
    };

    await this.sesClient.send(new SendEmailCommand(params));
  }

  async sendConfirmationEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      this.logger.warn(
        'FRONTEND_URL is not configured. Verification link will not be generated.',
      );
      return;
    }

    const link = `${frontendUrl}/auth/confirm-email?token=${token}`;
    const html = createConfirmationEmail(link);
    await this.sendEmail(email, 'Email Confirmation', html);
  }

  async sendEventCreated(email: string, event: Event) {
    const html = `<p>The event <strong>${event.name}</strong> has been created!</p>`;
    await this.sendEmail(email, 'New Event Created', html);
  }

  async sendEventSubscription(email: string, event: Event) {
    const icalData = generateICalEvent(event);
    const html = `<p>You have successfully subscribed to the event <strong>${event.name}</strong></p>`;

    await this.sendEmailWithAttachment(
      email,
      'Event Subscription Confirmed',
      html,
      {
        filename: 'evento.ics',
        content: icalData,
        contentType: 'text/calendar',
      },
    );
  }

  async sendEventSubscriptionCanceled(email: string, event: Event) {
    if (!this.sesClient) {
      this.logger.warn('SES client not configured. Email will not be sent.');
      return;
    }

    const html = `
    <p>You have canceled your subscription to the event <strong>${event.name}</strong>.</p>
    <p><strong>Data:</strong> ${new Date(event.date).toLocaleString()}</p>
    <p><strong>Description:</strong> ${event.description}</p>
  `;

    await this.sendEmail(
      email,
      `Subscription canceled for the event: ${event.name}`,
      html,
    );
  }
}
