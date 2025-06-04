import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/dto/create-event.dto';
import { generateICalEvent } from './utils/ical-generator.util';

// Mock AWS SDK
jest.mock('@aws-sdk/client-ses', () => {
  return {
    SESClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    SendEmailCommand: jest.fn(),
    SendRawEmailCommand: jest.fn(),
  };
});

// Mock ical-generator
jest.mock('./utils/ical-generator.util', () => ({
  generateICalEvent: jest.fn().mockReturnValue('mock-ical-data'),
}));

// Mock confirmation template
jest.mock('./templates/confirmation.template', () => ({
  createConfirmationEmail: jest.fn().mockReturnValue('<html>Confirmation Email</html>'),
}));

describe('MailService', () => {
  let service: MailService;
  let configService: ConfigService;
  let sesClientSendMock: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AWS_SES_ACCESS_KEY_ID: 'test-access-key',
        AWS_SES_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_SESSION_TOKEN: 'test-session-token',
        AWS_SES_REGION: 'us-east-1',
        EMAIL_FROM: 'noreply@example.com',
        FRONTEND_URL: 'https://example.com',
      };
      return config[key];
    }),
  };

  const mockEvent: Event = {
    id: 'event-id',
    name: 'Test Event',
    description: 'Test Description',
    date: '2023-12-31T00:00:00.000Z',
    imageUrl: 'https://example.com/event.jpg',
    organizerId: 'organizer-id',
    status: EventStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    sesClientSendMock = jest.fn().mockResolvedValue({});
    (SESClient as jest.Mock).mockImplementation(() => ({
      send: sesClientSendMock,
    }));
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MailService,
          useFactory: () => {
            return new MailService(mockConfigService as unknown as ConfigService);
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      await service.sendEmail('recipient@example.com', 'Test Subject', '<p>Test Body</p>');
      
      expect(SendEmailCommand).toHaveBeenCalledWith({
        Destination: { ToAddresses: ['recipient@example.com'] },
        Message: {
          Subject: { Data: 'Test Subject', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Test Body</p>', Charset: 'UTF-8' },
          },
        },
        Source: 'noreply@example.com',
      });
      
      expect(sesClientSendMock).toHaveBeenCalled();
    });

    it('should not send email if SES client is not initialized', async () => {
      // Override the sesClient property
      Object.defineProperty(service, 'sesClient', { value: null });
      
      await service.sendEmail('recipient@example.com', 'Test Subject', '<p>Test Body</p>');
      
      expect(SendEmailCommand).not.toHaveBeenCalled();
      expect(sesClientSendMock).not.toHaveBeenCalled();
    });
  });

  describe('sendEmailWithAttachment', () => {
    it('should send email with attachment successfully', async () => {
      await service.sendEmailWithAttachment(
        'recipient@example.com',
        'Test Subject',
        '<p>Test Body</p>',
        {
          filename: 'test.txt',
          content: 'test content',
          contentType: 'text/plain',
        }
      );
      
      expect(SendRawEmailCommand).toHaveBeenCalledWith({
        RawMessage: {
          Data: expect.any(Buffer),
        },
      });
      
      expect(sesClientSendMock).toHaveBeenCalled();
    });

    it('should not send email if SES client is not initialized', async () => {
      // Override the sesClient property
      Object.defineProperty(service, 'sesClient', { value: null });
      
      await service.sendEmailWithAttachment(
        'recipient@example.com',
        'Test Subject',
        '<p>Test Body</p>',
        {
          filename: 'test.txt',
          content: 'test content',
          contentType: 'text/plain',
        }
      );
      
      expect(SendRawEmailCommand).not.toHaveBeenCalled();
      expect(sesClientSendMock).not.toHaveBeenCalled();
    });
  });

  describe('sendAccountDeleted', () => {
    it('should send account deleted email', async () => {
      // Set up environment variables
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      
      await service.sendAccountDeleted('user@example.com', 'John Doe');
      
      expect(SendEmailCommand).toHaveBeenCalledWith({
        Destination: { ToAddresses: ['user@example.com'] },
        Message: {
          Body: {
            Text: {
              Data: expect.stringContaining('John Doe'),
            },
          },
          Subject: { Data: 'Account Deactivated' },
        },
        Source: 'noreply@example.com',
      });
    });

    it('should not send email if AWS credentials are missing', async () => {
      // Remove environment variables
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      
      await service.sendAccountDeleted('user@example.com', 'John Doe');
      
      expect(SendEmailCommand).not.toHaveBeenCalled();
      
      // Restore environment variables
      process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
    });
  });

  describe('sendEventDeleted', () => {
    it('should send event deleted email', async () => {
      // Set up environment variables
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      
      await service.sendEventDeleted('user@example.com', mockEvent);
      
      expect(SendEmailCommand).toHaveBeenCalledWith({
        Destination: { ToAddresses: ['user@example.com'] },
        Message: {
          Body: {
            Text: {
              Data: expect.stringContaining('Test Event'),
            },
          },
          Subject: { Data: 'Event Canceled' },
        },
        Source: 'noreply@example.com',
      });
    });

    it('should not send email if AWS credentials are missing', async () => {
      // Remove environment variables
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      
      await service.sendEventDeleted('user@example.com', mockEvent);
      
      expect(SendEmailCommand).not.toHaveBeenCalled();
      
      // Restore environment variables
      process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
    });
  });

  describe('sendConfirmationEmail', () => {
    it('should send confirmation email with verification link', async () => {
      await service.sendConfirmationEmail('user@example.com', 'test-token');
      
      expect(SendEmailCommand).toHaveBeenCalled();
    });

    it('should not send email if FRONTEND_URL is not configured', async () => {
      jest.spyOn(mockConfigService, 'get').mockImplementation((key) => {
        if (key === 'FRONTEND_URL') return undefined;
        return 'some-value';
      });
      
      await service.sendConfirmationEmail('user@example.com', 'test-token');
      
      expect(SendEmailCommand).not.toHaveBeenCalled();
    });
  });

  describe('sendEventCreated', () => {
    it('should send event created email', async () => {
      await service.sendEventCreated('user@example.com', mockEvent);
      
      expect(SendEmailCommand).toHaveBeenCalledWith(expect.objectContaining({
        Destination: { ToAddresses: ['user@example.com'] },
        Message: expect.objectContaining({
          Subject: { Data: 'New Event Created' },
        }),
      }));
    });
  });

  describe('sendEventSubscription', () => {
    it('should send event subscription email with iCal attachment', async () => {
      await service.sendEventSubscription('user@example.com', mockEvent);
      
      expect(generateICalEvent).toHaveBeenCalledWith(mockEvent);
      expect(SendRawEmailCommand).toHaveBeenCalled();
    });
  });

  describe('sendEventSubscriptionCanceled', () => {
    it('should send event subscription canceled email', async () => {
      await service.sendEventSubscriptionCanceled('user@example.com', mockEvent);
      
      expect(SendEmailCommand).toHaveBeenCalledWith(expect.objectContaining({
        Destination: { ToAddresses: ['user@example.com'] },
        Message: expect.objectContaining({
          Subject: { Data: expect.stringContaining('Subscription canceled') },
        }),
      }));
    });

    it('should not send email if SES client is not initialized', async () => {
      // Override the sesClient property
      Object.defineProperty(service, 'sesClient', { value: null });
      
      await service.sendEventSubscriptionCanceled('user@example.com', mockEvent);
      
      expect(SendEmailCommand).not.toHaveBeenCalled();
    });
  });
});