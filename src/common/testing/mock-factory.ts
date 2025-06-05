import { ExecutionContext } from '@nestjs/common';
import { AuthRequest } from '../interfaces/auth-request.interface';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { UserRole } from '../../users/dto/create-user.dto';
import { EventStatus } from '../../events/dto/create-event.dto';
import { RegistrationStatus } from '../../registrations/enums/registration-status.enum';

/**
 * Creates a mock execution context for testing guards and interceptors
 */
export function createMockExecutionContext(data: any): ExecutionContext {
  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(data),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  return mockExecutionContext;
}

/**
 * Creates a mock AuthRequest for testing controllers and guards
 */
export function createMockAuthRequest(user?: {
  userId?: string;
  email?: string;
  role?: 'admin' | 'organizer' | 'participant';
  emailConfirmed?: boolean;
}): AuthRequest {
  return {
    user: {
      userId: user?.userId || 'user-id',
      email: user?.email || 'user@example.com',
      role: user?.role || 'participant',
      emailConfirmed: user?.emailConfirmed !== undefined ? user.emailConfirmed : true,
    },
  } as AuthRequest;
}

/**
 * Creates a mock User for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    phone: '+5511999999999',
    role: UserRole.PARTICIPANT,
    profileImageUrl: 'https://example.com/image.jpg',
    createdAt: '2023-01-01T00:00:00.000Z',
    isActive: true,
    emailConfirmed: true,
    emailConfirmationToken: 'confirmation-token',
    ...overrides,
  };
}

/**
 * Creates a mock Event for testing
 */
export function createMockEvent(overrides?: Partial<Event>): Event {
  return {
    id: 'event-id',
    name: 'Test Event',
    description: 'Test Description',
    date: '2023-12-31T00:00:00.000Z',
    imageUrl: 'https://example.com/event.jpg',
    organizerId: 'organizer-id',
    status: EventStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates a mock Registration for testing
 */
export function createMockRegistration(overrides?: Partial<Registration>): Registration {
  return {
    id: 'registration-id',
    participantId: 'user-id',
    eventId: 'event-id',
    status: RegistrationStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates a mock file for testing file uploads
 */
export function createMockFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  };
}

/**
 * Creates mock AWS DynamoDB responses
 */
export function createMockDynamoResponse(type: 'get' | 'query' | 'scan' | 'put' | 'update', data: any) {
  switch (type) {
    case 'get':
      return { Item: data };
    case 'query':
    case 'scan':
      return { Items: data, Count: Array.isArray(data) ? data.length : 0 };
    case 'put':
    case 'update':
      return { Attributes: data };
    default:
      return {};
  }
}

/**
 * Creates a mock ConfigService for testing
 */
export function createMockConfigService(config: Record<string, any> = {}) {
  const defaultConfig = {
    AWS_REGION: 'us-east-1',
    AWS_S3_BUCKET_NAME: 'test-bucket',
    AWS_ACCESS_KEY_ID: 'test-access-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
    AWS_SESSION_TOKEN: 'test-session-token',
    EMAIL_FROM: 'noreply@example.com',
    FRONTEND_URL: 'https://example.com',
    JWT_SECRET: 'test-secret',
    USERS_TABLE_NAME: 'users-table',
    EVENTS_TABLE_NAME: 'events-table',
    REGISTRATIONS_TABLE_NAME: 'registrations-table',
  };

  return {
    get: jest.fn((key: string) => {
      return config[key] !== undefined ? config[key] : defaultConfig[key];
    }),
  };
}