import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdatePatchUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { UserIdParamDto } from './dto/User-id-params.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockAuthRequest, createMockFile } from '../common/testing/mock-factory';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongP@ss123',
      phone: '+5511999999999',
      role: UserRole.PARTICIPANT,
    };

    const mockFile = createMockFile();

    it('should create a user successfully', async () => {
      const expectedResult = {
        user: {
          id: 'user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: UserRole.PARTICIPANT,
        },
      };

      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto, mockFile);

      expect(service.create).toHaveBeenCalledWith(mockFile, createUserDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdatePatchUserDto = {
      name: 'Updated Name',
    };

    it('should update a user successfully', async () => {
      const expectedResult = {
        user: {
          id: 'user-id',
          name: 'Updated Name',
          email: 'test@example.com',
        },
      };

      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(updateUserDto, 'user-id');

      expect(service.update).toHaveBeenCalledWith(updateUserDto, 'user-id');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    const filterDto: FilterUsersDto = {
      name: 'test',
      page: 1,
      limit: 10,
    };

    it('should return paginated users', async () => {
      const expectedResult = {
        total: 1,
        page: 1,
        limit: 10,
        data: [
          {
            id: 'user-id',
            name: 'Test User',
            email: 'test@example.com',
          },
        ],
      };

      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(filterDto);

      expect(service.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    const params: UserIdParamDto = { id: 'user-id' };

    it('should return a user by id', async () => {
      const expectedUser = {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockUsersService.findById.mockResolvedValue(expectedUser);

      const result = await controller.findOne(params);

      expect(service.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ user: expectedUser });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findById.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne(params)).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    const params: UserIdParamDto = { id: 'user-id' };
    const mockRequest = createMockAuthRequest({
      userId: 'admin-id',
      role: 'admin',
      emailConfirmed: true,
      email: 'admin@example.com'
    });

    it('should soft delete a user', async () => {
      const expectedResult = {
        id: 'user-id',
        isActive: false,
      };

      mockUsersService.softDelete.mockResolvedValue(expectedResult);

      const result = await controller.softDelete(params, mockRequest);

      expect(service.softDelete).toHaveBeenCalledWith('user-id', mockRequest.user);
      expect(result).toEqual(expectedResult);
    });
  });
});