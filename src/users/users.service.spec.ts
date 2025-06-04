import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { S3Service } from '../s3/s3.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UpdatePatchUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { AuthRequest } from '../common/interfaces/auth-request.interface';

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
jest.mock('./utils/hash.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let s3Service: S3Service;
  let mailService: MailService;

  const mockS3Service = {
    uploadImage: jest.fn(),
  };

  const mockMailService = {
    sendConfirmationEmail: jest.fn(),
    sendAccountDeleted: jest.fn(),
  };

  const mockDynamoSend = jest.fn();
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
    emailConfirmed: false,
    emailConfirmationToken: 'confirmation-token',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup the mock implementation for DynamoDBDocumentClient.from().send()
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from().send = mockDynamoSend;

    process.env.USERS_TABLE_NAME = 'users-table';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: S3Service, useValue: mockS3Service },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    s3Service = module.get<S3Service>(S3Service);
    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongP@ss123',
      phone: '+5511999999999',
      role: UserRole.PARTICIPANT,
    };

    it('should create a user successfully', async () => {
      // Mock findByEmail to return undefined (no existing user)
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        return Promise.resolve({});
      });

      mockS3Service.uploadImage.mockResolvedValue('https://example.com/image.jpg');

      const result = await service.create(mockFile, createUserDto);

      expect(mockS3Service.uploadImage).toHaveBeenCalledWith(mockFile);
      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // findByEmail and PutCommand
      expect(mockMailService.sendConfirmationEmail).toHaveBeenCalledWith(
        createUserDto.email,
        expect.any(String)
      );
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user.name).toBe(createUserDto.name);
      expect(result.user.email).toBe(createUserDto.email);
    });

    it('should throw BadRequestException if no file is provided', async () => {
      await expect(service.create(null as any, createUserDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [mockUser] });
        }
        return Promise.resolve({});
      });

      await expect(service.create(mockFile, createUserDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdatePatchUserDto = {
      name: 'Updated Name',
    };

    it('should update a user successfully', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: mockUser });
        }
        return Promise.resolve({});
      });

      const result = await service.update(updateUserDto, 'user-id');

      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // GetCommand and PutCommand
      expect(result).toHaveProperty('user');
      expect(result.user.name).toBe(updateUserDto.name);
    });

    it('should throw BadRequestException if request body is empty', async () => {
      await expect(service.update({}, 'user-id')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.update(updateUserDto, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException if updating email to one that already exists', async () => {
      const existingUser = { ...mockUser, id: 'user-id' };
      const anotherUser = { ...mockUser, id: 'another-id' };
      
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: existingUser });
        }
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [anotherUser] });
        }
        return Promise.resolve({});
      });

      await expect(
        service.update({ email: 'existing@example.com' }, 'user-id')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [
        { ...mockUser, id: '1' },
        { ...mockUser, id: '2' },
        { ...mockUser, id: '3' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: users });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({});

      expect(result).toHaveProperty('total', 3);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).not.toHaveProperty('password');
    });

    it('should filter users by name', async () => {
      const users = [
        { ...mockUser, id: '1', name: 'John Doe' },
        { ...mockUser, id: '2', name: 'Jane Smith' },
        { ...mockUser, id: '3', name: 'John Smith' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: users });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ name: 'John' });

      expect(result).toHaveProperty('total', 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toContain('John');
      expect(result.data[1].name).toContain('John');
    });

    it('should filter users by email', async () => {
      const users = [
        { ...mockUser, id: '1', email: 'john@example.com' },
        { ...mockUser, id: '2', email: 'jane@example.com' },
        { ...mockUser, id: '3', email: 'john@gmail.com' },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: users });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ email: 'gmail' });

      expect(result).toHaveProperty('total', 1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('john@gmail.com');
    });

    it('should filter users by role', async () => {
      const users = [
        { ...mockUser, id: '1', role: UserRole.ADMIN },
        { ...mockUser, id: '2', role: UserRole.ORGANIZER },
        { ...mockUser, id: '3', role: UserRole.PARTICIPANT },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: users });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ role: UserRole.ADMIN });

      expect(result).toHaveProperty('total', 1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe(UserRole.ADMIN);
    });

    it('should paginate results correctly', async () => {
      const users = Array(15).fill(null).map((_, i) => ({
        ...mockUser,
        id: `user-${i}`,
      }));

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: users });
        }
        return Promise.resolve({});
      });

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(result).toHaveProperty('total', 15);
      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 5);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].id).toBe('user-5');
    });
  });

  describe('findById', () => {
    it('should return a user by id without password', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: mockUser });
        }
        return Promise.resolve({});
      });

      const result = await service.findById('user-id');

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(mockUser.id);
      expect(result.name).toBe(mockUser.name);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('softDelete', () => {
    const mockRequester: AuthRequest['user'] = {
      userId: 'admin-id',
      email: 'admin@example.com',
      role: 'admin',
      emailConfirmed: true
    };

    it('should soft delete a user as admin', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: mockUser });
        }
        return Promise.resolve({});
      });

      const result = await service.softDelete('user-id', mockRequester);

      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // GetCommand and PutCommand
      expect(result).toHaveProperty('isActive', false);
      expect(mockMailService.sendAccountDeleted).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name
      );
    });

    it('should soft delete own user', async () => {
      const selfRequester: AuthRequest['user'] = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        emailConfirmed: true
      };

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: mockUser });
        }
        return Promise.resolve({});
      });

      const result = await service.softDelete('user-id', selfRequester);

      expect(result).toHaveProperty('isActive', false);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.softDelete('non-existent-id', mockRequester)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if not admin or self', async () => {
      const nonAdminRequester: AuthRequest['user'] = {
        userId: 'other-id',
        email: 'other@example.com',
        role: 'participant',
        emailConfirmed: true
      };

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: mockUser });
        }
        return Promise.resolve({});
      });

      await expect(service.softDelete('user-id', nonAdminRequester)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [mockUser] });
        }
        return Promise.resolve({});
      });

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return undefined if no user found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        return Promise.resolve({});
      });

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findByConfirmationToken', () => {
    it('should return a user by confirmation token', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [mockUser] });
        }
        return Promise.resolve({});
      });

      const result = await service.findByConfirmationToken('confirmation-token');

      expect(result).toEqual(mockUser);
    });

    it('should return undefined if no user found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        return Promise.resolve({});
      });

      const result = await service.findByConfirmationToken('invalid-token');

      expect(result).toBeUndefined();
    });
  });

  describe('confirmEmail', () => {
    it('should confirm user email', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: { ...mockUser } });
        }
        return Promise.resolve({});
      });

      const result = await service.confirmEmail('user-id');

      expect(result).toHaveProperty('emailConfirmed', true);
      expect(result).not.toHaveProperty('emailConfirmationToken');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({ Item: null });
        }
        return Promise.resolve({});
      });

      await expect(service.confirmEmail('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findAllParticipants', () => {
    it('should return all active and confirmed users', async () => {
      const users = [
        { ...mockUser, id: '1', isActive: true, emailConfirmed: true },
        { ...mockUser, id: '2', isActive: false, emailConfirmed: true },
        { ...mockUser, id: '3', isActive: true, emailConfirmed: false },
        { ...mockUser, id: '4', isActive: true, emailConfirmed: true },
      ];

      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'ScanCommand') {
          return Promise.resolve({ Items: users });
        }
        return Promise.resolve({});
      });

      const result = await service.findAllParticipants();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('4');
    });
  });

  describe('createUserWithoutImage', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongP@ss123',
      phone: '+5511999999999',
      role: UserRole.PARTICIPANT,
    };

    it('should create a user without image', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        return Promise.resolve({});
      });

      process.env.DEFAULT_PROFILE_IMAGE_URL = 'https://default-image.jpg';

      const result = await service.createUserWithoutImage(createUserDto);

      expect(mockDynamoSend).toHaveBeenCalledTimes(2); // findByEmail and PutCommand
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user.profileImageUrl).toBe('https://default-image.jpg');
    });

    it('should use provided profileImageUrl', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [] });
        }
        return Promise.resolve({});
      });

      const result = await service.createUserWithoutImage({
        ...createUserDto,
        profileImageUrl: 'https://custom-image.jpg',
      });

      expect(result.user.profileImageUrl).toBe('https://custom-image.jpg');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockDynamoSend.mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [mockUser] });
        }
        return Promise.resolve({});
      });

      await expect(service.createUserWithoutImage(createUserDto)).rejects.toThrow(
        ConflictException
      );
    });
  });
});