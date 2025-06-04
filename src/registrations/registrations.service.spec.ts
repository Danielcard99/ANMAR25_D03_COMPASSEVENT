import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsService } from './registrations.service';
import { EventsService } from '../events/events.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { Registration } from './entities/registration.entity';
import { RegistrationStatus } from './enums/registration-status.enum';
import { Event } from '../events/entities/event.entity';
import { EventStatus } from '../events/dto/create-event.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/dto/create-user.dto';
import { FilterRegistrationDto } from './dto/filter-registration.dto';

// Mock the AWS SDK
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const originalModule = jest.requireActual('@aws-sdk/lib-dynamodb');
  return {
    ...originalModule,
    DynamoDBDocumentClient: {
      from: jest.fn().mockReturnValue({
        send: jest.fn(),
      }),
    },
    PutCommand: jest.fn(),
    GetCommand: jest.fn(),
    QueryCommand: jest.fn(),
    UpdateCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let eventsService: EventsService;
  let mailService: MailService;
  let usersService: UsersService;

  const mockEventsService = {
    findOne: jest.fn(),
  };

  const mockMailService = {
    sendEventSubscription: jest.fn(),
    sendEventSubscriptionCanceled: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockDynamoSend = jest.fn();
  
  // Create a future date for testing
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1); // One year in the future
  
  const mockEvent: Event = {
    id: 'event-id',
    name: 'Test Event',
    description: 'Test Description',
    date: futureDate.toISOString(), // Use future date to avoid "Event has already occurred" error
    imageUrl: 'https://example.com/event.jpg',
    organizerId: 'organizer-id',
    status: EventStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  const mockUser: User = {
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
  };

  const mockRegistration: Registration = {
    id: 'registration-id',
    participantId: 'user-id',
    eventId: 'event-id',
    status: RegistrationStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup the mock implementation for DynamoDBDocumentClient.from().send()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from().send = mockDynamoSend;

    process.env.REGISTRATIONS_TABLE_NAME = 'registrations-table';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: EventsService, useValue: mockEventsService },
        { provide: MailService, useValue: mockMailService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    eventsService = module.get<EventsService>(EventsService);
    mailService = module.get<MailService>(MailService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRegistration', () => {
    const createRegistrationDto: CreateRegistrationDto = {
      eventId: 'event-id',
    };

    it('should create a registration successfully', async () => {
      // Mock dependencies
      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        return Promise.resolve({});
      });
      mockUsersService.findById.mockResolvedValue(mockUser);

      // Call the method
      const result = await service.createRegistration('user-id', createRegistrationDto);

      // Assertions
      expect(mockEventsService.findOne).toHaveBeenCalledWith('event-id');
      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // checkExistingRegistration and PutCommand
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-id');
      expect(mockMailService.sendEventSubscription).toHaveBeenCalledWith('test@example.com', mockEvent);
      expect(result).toHaveProperty('id');
      expect(result.participantId).toBe('user-id');
      expect(result.eventId).toBe('event-id');
      expect(result.status).toBe(RegistrationStatus.ACTIVE);
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.findOne.mockResolvedValue(null);

      await expect(service.createRegistration('user-id', createRegistrationDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if event is not active', async () => {
      mockEventsService.findOne.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.INACTIVE,
      });

      await expect(service.createRegistration('user-id', createRegistrationDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if event has already occurred', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday
      
      mockEventsService.findOne.mockResolvedValue({
        ...mockEvent,
        date: pastDate.toISOString(),
      });

      await expect(service.createRegistration('user-id', createRegistrationDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if registration already exists', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [{ ...mockRegistration, status: 'active' }] });
        }
        return Promise.resolve({});
      });

      await expect(service.createRegistration('user-id', createRegistrationDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockEventsService.findOne.mockResolvedValue(mockEvent);
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        if (command.constructor.name === 'PutCommand') {
          throw new Error('Unexpected error');
        }
        return Promise.resolve({});
      });

      await expect(service.createRegistration('user-id', createRegistrationDto)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('listRegistrations', () => {
    const filterDto: FilterRegistrationDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated registrations', async () => {
      const registrations = [
        { ...mockRegistration, id: '1' },
        { ...mockRegistration, id: '2' },
        { ...mockRegistration, id: '3' },
      ];

      mockDynamoSend.mockResolvedValue({ Items: registrations });

      const result = await service.listRegistrations('user-id', filterDto);

      expect(result).toHaveProperty('total', 3);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(3);
    });

    it('should throw BadRequestException if page or limit is invalid', async () => {
      await expect(service.listRegistrations('user-id', { page: 0, limit: 10 })).rejects.toThrow(
        BadRequestException
      );
      await expect(service.listRegistrations('user-id', { page: 1, limit: 0 })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should paginate results correctly', async () => {
      const registrations = Array(15).fill(null).map((_, i) => ({
        ...mockRegistration,
        id: `registration-${i}`,
      }));

      mockDynamoSend.mockResolvedValue({ Items: registrations });

      const result = await service.listRegistrations('user-id', { page: 2, limit: 5 });

      expect(result).toHaveProperty('total', 15);
      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 5);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].id).toBe('registration-5');
    });

    it('should handle empty results', async () => {
      mockDynamoSend.mockResolvedValue({ Items: [] });

      const result = await service.listRegistrations('user-id', filterDto);

      expect(result).toHaveProperty('total', 0);
      expect(result.data).toHaveLength(0);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockDynamoSend.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.listRegistrations('user-id', filterDto)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('cancelRegistration', () => {
    it('should cancel a registration successfully', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockRegistration, participantId: 'user-id' } });
        }
        return Promise.resolve({});
      });

      mockUsersService.findById.mockResolvedValue(mockUser);
      mockEventsService.findOne.mockResolvedValue(mockEvent);

      const result = await service.cancelRegistration('registration-id', 'user-id');

      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // GetCommand and UpdateCommand
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-id');
      expect(mockEventsService.findOne).toHaveBeenCalledWith('event-id');
      expect(mockMailService.sendEventSubscriptionCanceled).toHaveBeenCalledWith('test@example.com', mockEvent);
      expect(result).toHaveProperty('message', 'Registration canceled successfully');
    });

    it('should throw NotFoundException if registration not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.cancelRegistration('non-existent-id', 'user-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if not registration owner', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockRegistration, participantId: 'other-id' } });
        }
        return Promise.resolve({});
      });

      await expect(service.cancelRegistration('registration-id', 'user-id')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException if registration already canceled', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ 
            Item: { 
              ...mockRegistration, 
              participantId: 'user-id',
              status: RegistrationStatus.CANCELED 
            } 
          });
        }
        return Promise.resolve({});
      });

      await expect(service.cancelRegistration('registration-id', 'user-id')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockDynamoSend.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.cancelRegistration('registration-id', 'user-id')).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('checkExistingRegistration', () => {
    it('should return registration if it exists', async () => {
      mockDynamoSend.mockResolvedValue({ Items: [mockRegistration] });

      const result = await service['checkExistingRegistration']('user-id', 'event-id');

      expect(result).toEqual(mockRegistration);
    });

    it('should return null if registration does not exist', async () => {
      mockDynamoSend.mockResolvedValue({ Items: [] });

      const result = await service['checkExistingRegistration']('user-id', 'event-id');

      expect(result).toBeNull();
    });
  });
});