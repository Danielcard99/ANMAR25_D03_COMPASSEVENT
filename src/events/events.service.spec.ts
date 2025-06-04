import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { S3Service } from '../s3/s3.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEventDto, EventStatus } from './dto/create-event.dto';
import { Event } from './entities/event.entity';
import { UpdateEventDto } from './dto/update-event.dto';
import { DateDirection, FilterEventsDto } from './dto/filter-event.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/dto/create-user.dto';

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
    ScanCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

describe('EventsService', () => {
  let service: EventsService;
  let s3Service: S3Service;
  let mailService: MailService;
  let usersService: UsersService;

  const mockS3Service = {
    uploadImage: jest.fn(),
  };

  const mockMailService = {
    sendEventCreated: jest.fn(),
    sendEventDeleted: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
    findAllParticipants: jest.fn(),
  };

  const mockDynamoSend = jest.fn();
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

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup the mock implementation for DynamoDBDocumentClient.from().send()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from().send = mockDynamoSend;

    process.env.EVENTS_TABLE_NAME = 'events-table';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: S3Service, useValue: mockS3Service },
        { provide: MailService, useValue: mockMailService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    s3Service = module.get<S3Service>(S3Service);
    mailService = module.get<MailService>(MailService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockFile = {
      originalname: 'event.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const createEventDto: CreateEventDto = {
      name: 'Test Event',
      description: 'Test Description',
      date: '2023-12-31T00:00:00.000Z',
    };

    it('should create an event successfully', async () => {
      // Mock dependencies
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 0 });
        }
        return Promise.resolve({});
      });

      mockS3Service.uploadImage.mockResolvedValue('https://example.com/event.jpg');
      mockUsersService.findById.mockResolvedValue({ ...mockUser, id: 'organizer-id' });
      mockUsersService.findAllParticipants.mockResolvedValue([mockUser]);

      // Call the method
      const result = await service.create(createEventDto, mockFile, 'organizer-id');

      // Assertions
      expect(mockS3Service.uploadImage).toHaveBeenCalledWith(mockFile, 'events');
      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // checkIfEventNameExists and PutCommand
      expect(mockUsersService.findById).toHaveBeenCalledWith('organizer-id');
      expect(mockMailService.sendEventCreated).toHaveBeenCalledTimes(2); // Once for organizer, once for participant
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(createEventDto.name);
      expect(result.description).toBe(createEventDto.description);
      expect(result.date).toBe(createEventDto.date);
      expect(result.organizerId).toBe('organizer-id');
      expect(result.status).toBe(EventStatus.ACTIVE);
    });

    it('should throw BadRequestException if no file is provided', async () => {
      await expect(service.create(createEventDto, null as any, 'organizer-id')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if event name already exists', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 1 });
        }
        return Promise.resolve({});
      });

      await expect(service.create(createEventDto, mockFile, 'organizer-id')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw InternalServerErrorException if S3 upload fails', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 0 });
        }
        return Promise.resolve({});
      });

      mockS3Service.uploadImage.mockResolvedValue(null);

      await expect(service.create(createEventDto, mockFile, 'organizer-id')).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('update', () => {
    const updateEventDto: UpdateEventDto = {
      name: 'Updated Event Name',
      description: 'Updated Description',
    };

    it('should update an event successfully as owner', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 0 });
        }
        return Promise.resolve({});
      });

      const result = await service.update('event-id', updateEventDto, 'owner-id', false);

      expect(mockDynamoSend).toHaveBeenCalledTimes(3); // GetCommand, QueryCommand for name check, PutCommand
      expect(result).toHaveProperty('name', 'Updated Event Name');
      expect(result).toHaveProperty('description', 'Updated Description');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should update an event successfully as admin', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 0 });
        }
        return Promise.resolve({});
      });

      const result = await service.update('event-id', updateEventDto, 'admin-id', true);

      expect(mockDynamoSend).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty('name', 'Updated Event Name');
    });

    it('should throw BadRequestException if request body is empty', async () => {
      await expect(service.update('event-id', {}, 'owner-id', false)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException if event not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.update('non-existent-id', updateEventDto, 'owner-id', false)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if not owner or admin', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        return Promise.resolve({});
      });

      await expect(service.update('event-id', updateEventDto, 'other-id', false)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException if new name already exists', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 1 });
        }
        return Promise.resolve({});
      });

      await expect(service.update('event-id', { name: 'Existing Name' }, 'owner-id', false)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated events', async () => {
      const events = [
        { ...mockEvent, id: '1' },
        { ...mockEvent, id: '2' },
        { ...mockEvent, id: '3' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: events });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({});

      expect(result).toHaveProperty('total', 3);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(3);
    });

    it('should filter events by name', async () => {
      const events = [
        { ...mockEvent, id: '1', name: 'Conference A' },
        { ...mockEvent, id: '2', name: 'Workshop B' },
        { ...mockEvent, id: '3', name: 'Conference C' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: events });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ name: 'Conference' });

      expect(result).toHaveProperty('total', 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toContain('Conference');
      expect(result.data[1].name).toContain('Conference');
    });

    it('should filter events by date before', async () => {
      const events = [
        { ...mockEvent, id: '1', date: '2023-01-01T00:00:00.000Z' },
        { ...mockEvent, id: '2', date: '2023-06-01T00:00:00.000Z' },
        { ...mockEvent, id: '3', date: '2023-12-01T00:00:00.000Z' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: events });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ 
        date: '2023-07-01T00:00:00.000Z',
        dateDirection: DateDirection.BEFORE
      });

      expect(result).toHaveProperty('total', 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('1');
      expect(result.data[1].id).toBe('2');
    });

    it('should filter events by date after', async () => {
      const events = [
        { ...mockEvent, id: '1', date: '2023-01-01T00:00:00.000Z' },
        { ...mockEvent, id: '2', date: '2023-06-01T00:00:00.000Z' },
        { ...mockEvent, id: '3', date: '2023-12-01T00:00:00.000Z' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: events });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ 
        date: '2023-05-01T00:00:00.000Z',
        dateDirection: DateDirection.AFTER
      });

      expect(result).toHaveProperty('total', 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('2');
      expect(result.data[1].id).toBe('3');
    });

    it('should filter events by status', async () => {
      const events = [
        { ...mockEvent, id: '1', status: EventStatus.ACTIVE },
        { ...mockEvent, id: '2', status: EventStatus.INACTIVE },
        { ...mockEvent, id: '3', status: EventStatus.ACTIVE },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: events });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ status: EventStatus.ACTIVE });

      expect(result).toHaveProperty('total', 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe(EventStatus.ACTIVE);
      expect(result.data[1].status).toBe(EventStatus.ACTIVE);
    });

    it('should paginate results correctly', async () => {
      const events = Array(15).fill(null).map((_, i) => ({
        ...mockEvent,
        id: `event-${i}`,
      }));

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: events });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(result).toHaveProperty('total', 15);
      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 5);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].id).toBe('event-5');
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: mockEvent });
        }
        return Promise.resolve({});
      });

      const result = await service.findOne('event-id');

      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockDynamoSend.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.findOne('event-id')).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete an event as owner', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        return Promise.resolve({});
      });

      mockUsersService.findById.mockResolvedValue({ ...mockUser, id: 'owner-id' });
      mockUsersService.findAllParticipants.mockResolvedValue([mockUser]);

      const result = await service.softDelete('event-id', 'owner-id', 'organizer');

      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // GetCommand and PutCommand
      expect(result).toHaveProperty('status', EventStatus.INACTIVE);
      expect(mockMailService.sendEventDeleted).toHaveBeenCalledTimes(2); // Once for organizer, once for participant
    });

    it('should soft delete an event as admin', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        return Promise.resolve({});
      });

      mockUsersService.findById.mockResolvedValue({ ...mockUser, id: 'owner-id' });
      mockUsersService.findAllParticipants.mockResolvedValue([mockUser]);

      const result = await service.softDelete('event-id', 'admin-id', 'admin');

      expect(result).toHaveProperty('status', EventStatus.INACTIVE);
    });

    it('should throw NotFoundException if event not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.softDelete('non-existent-id', 'owner-id', 'organizer')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if not owner or admin', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockEvent, organizerId: 'owner-id' } });
        }
        return Promise.resolve({});
      });

      await expect(service.softDelete('event-id', 'other-id', 'participant')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('checkIfEventNameExists', () => {
    it('should return true if event name exists', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 1 });
        }
        return Promise.resolve({});
      });

      const result = await service.checkIfEventNameExists('Existing Event');

      expect(result).toBe(true);
    });

    it('should return false if event name does not exist', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Count: 0 });
        }
        return Promise.resolve({});
      });

      const result = await service.checkIfEventNameExists('New Event');

      expect(result).toBe(false);
    });
  });
});