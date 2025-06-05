import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { CreateEventDto, EventStatus } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventsDto } from './dto/filter-event.dto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createMockAuthRequest, createMockFile } from '../common/testing/mock-factory';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;

  const mockEventsService = {
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createEventDto: CreateEventDto = {
      name: 'Test Event',
      description: 'Test Description',
      date: '2023-12-31T00:00:00.000Z',
    };

    const mockFile = createMockFile({
      originalname: 'event.jpg',
      mimetype: 'image/jpeg',
    });

    const mockRequest = createMockAuthRequest({
      userId: 'organizer-id',
      role: 'organizer',
      emailConfirmed: true,
      email: 'organizer@example.com'
    });

    it('should create an event successfully', async () => {
      const expectedResult = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test Description',
        date: '2023-12-31T00:00:00.000Z',
        organizerId: 'organizer-id',
        status: EventStatus.ACTIVE,
      };

      mockEventsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(mockFile, createEventDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createEventDto, mockFile, 'organizer-id');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateEvent', () => {
    const updateEventDto: UpdateEventDto = {
      name: 'Updated Event Name',
      description: 'Updated Description',
    };

    const mockRequest = createMockAuthRequest({
      userId: 'organizer-id',
      role: 'organizer',
      emailConfirmed: true,
      email: 'organizer@example.com'
    });

    it('should update an event successfully', async () => {
      const expectedResult = {
        id: 'event-id',
        name: 'Updated Event Name',
        description: 'Updated Description',
        organizerId: 'organizer-id',
      };

      mockEventsService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateEvent(updateEventDto, mockRequest, 'event-id');

      expect(service.update).toHaveBeenCalledWith(
        'event-id',
        updateEventDto,
        'organizer-id',
        false
      );
      expect(result).toEqual(expectedResult);
    });

    it('should update an event as admin', async () => {
      const adminRequest = createMockAuthRequest({
        userId: 'admin-id',
        role: 'admin',
        emailConfirmed: true,
        email: 'admin@example.com'
      });

      const expectedResult = {
        id: 'event-id',
        name: 'Updated Event Name',
        description: 'Updated Description',
      };

      mockEventsService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateEvent(updateEventDto, adminRequest, 'event-id');

      expect(service.update).toHaveBeenCalledWith(
        'event-id',
        updateEventDto,
        'admin-id',
        true
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    const filterDto: FilterEventsDto = {
      name: 'test',
      page: 1,
      limit: 10,
    };

    it('should return paginated events', async () => {
      const expectedResult = {
        total: 1,
        page: 1,
        limit: 10,
        data: [
          {
            id: 'event-id',
            name: 'Test Event',
            description: 'Test Description',
            date: '2023-12-31T00:00:00.000Z',
          },
        ],
      };

      mockEventsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(filterDto);

      expect(service.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      const expectedEvent = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test Description',
        date: '2023-12-31T00:00:00.000Z',
      };

      mockEventsService.findOne.mockResolvedValue(expectedEvent);

      const result = await controller.findOne('event-id');

      expect(service.findOne).toHaveBeenCalledWith('event-id');
      expect(result).toEqual(expectedEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.findOne.mockRejectedValue(new NotFoundException('Event not found'));

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    const mockRequest = createMockAuthRequest({
      userId: 'organizer-id',
      role: 'organizer',
      emailConfirmed: true,
      email: 'organizer@example.com'
    });

    it('should soft delete an event', async () => {
      const expectedResult = {
        id: 'event-id',
        status: EventStatus.INACTIVE,
      };

      mockEventsService.softDelete.mockResolvedValue(expectedResult);

      const result = await controller.softDelete('event-id', mockRequest);

      expect(service.softDelete).toHaveBeenCalledWith('event-id', 'organizer-id', 'organizer');
      expect(result).toEqual(expectedResult);
    });

    it('should throw ForbiddenException if not authorized', async () => {
      mockEventsService.softDelete.mockRejectedValue(
        new ForbiddenException('You do not have permission to delete this event')
      );

      await expect(controller.softDelete('event-id', mockRequest)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});