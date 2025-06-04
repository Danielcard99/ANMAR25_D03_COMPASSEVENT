import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { FilterRegistrationDto } from './dto/filter-registration.dto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RegistrationStatus } from './enums/registration-status.enum';
import { Request } from 'express';

describe('RegistrationsController', () => {
  let controller: RegistrationsController;
  let service: RegistrationsService;

  const mockRegistrationsService = {
    createRegistration: jest.fn(),
    listRegistrations: jest.fn(),
    cancelRegistration: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [
        {
          provide: RegistrationsService,
          useValue: mockRegistrationsService,
        },
      ],
    }).compile();

    controller = module.get<RegistrationsController>(RegistrationsController);
    service = module.get<RegistrationsService>(RegistrationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createRegistrationDto: CreateRegistrationDto = {
      eventId: 'event-id',
    };

    const mockRequest = {
      user: {
        userId: 'participant-id',
        role: 'participant',
        emailConfirmed: true,
      },
    } as Request;

    it('should create a registration successfully', async () => {
      const expectedResult = {
        id: 'registration-id',
        participantId: 'participant-id',
        eventId: 'event-id',
        status: RegistrationStatus.ACTIVE,
        createdAt: '2023-01-01T00:00:00.000Z',
      };

      mockRegistrationsService.createRegistration.mockResolvedValue(expectedResult);

      const result = await controller.create(createRegistrationDto, mockRequest);

      expect(service.createRegistration).toHaveBeenCalledWith('participant-id', createRegistrationDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if event is not active', async () => {
      mockRegistrationsService.createRegistration.mockRejectedValue(
        new BadRequestException('Event is not active')
      );

      await expect(controller.create(createRegistrationDto, mockRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if registration already exists', async () => {
      mockRegistrationsService.createRegistration.mockRejectedValue(
        new BadRequestException('Registration already exists')
      );

      await expect(controller.create(createRegistrationDto, mockRequest)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findAll', () => {
    const filterDto: FilterRegistrationDto = {
      page: 1,
      limit: 10,
    };

    const mockRequest = {
      user: {
        userId: 'participant-id',
        role: 'participant',
        emailConfirmed: true,
      },
    } as Request;

    it('should return paginated registrations', async () => {
      const expectedResult = {
        total: 1,
        page: 1,
        limit: 10,
        data: [
          {
            id: 'registration-id',
            participantId: 'participant-id',
            eventId: 'event-id',
            status: RegistrationStatus.ACTIVE,
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      };

      mockRegistrationsService.listRegistrations.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockRequest, filterDto);

      expect(service.listRegistrations).toHaveBeenCalledWith('participant-id', filterDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('softDelete', () => {
    const mockRequest = {
      user: {
        userId: 'participant-id',
        role: 'participant',
        emailConfirmed: true,
      },
    } as Request;

    it('should cancel a registration', async () => {
      const expectedResult = {
        message: 'Registration canceled successfully',
      };

      mockRegistrationsService.cancelRegistration.mockResolvedValue(expectedResult);

      const result = await controller.softDelete(mockRequest, 'registration-id');

      expect(service.cancelRegistration).toHaveBeenCalledWith('registration-id', 'participant-id');
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException if registration not found', async () => {
      mockRegistrationsService.cancelRegistration.mockRejectedValue(
        new NotFoundException('Registration not found')
      );

      await expect(controller.softDelete(mockRequest, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if not registration owner', async () => {
      mockRegistrationsService.cancelRegistration.mockRejectedValue(
        new ForbiddenException('You can only cancel your own registration')
      );

      await expect(controller.softDelete(mockRequest, 'other-registration-id')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException if registration already canceled', async () => {
      mockRegistrationsService.cancelRegistration.mockRejectedValue(
        new BadRequestException('Registration already canceled')
      );

      await expect(controller.softDelete(mockRequest, 'canceled-registration-id')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});