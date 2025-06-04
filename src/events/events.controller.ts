import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateEventDto } from './dto/create-event.dto';
import { AuthRequest } from '../common/interfaces/auth-request.interface';
import { EventsService } from './events.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventsDto } from './dto/filter-event.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('events')
@Controller('events')
@UsePipes(new ValidationPipe())
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'organizer')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new event' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: CreateEventDto,
    description: 'Event data with optional image',
    examples: {
      workshop: {
        summary: 'Workshop event example',
        value: {
          name: 'NestJS Workshop',
          description: 'Learn how to build APIs with NestJS',
          date: '2023-12-15T14:00:00Z'
        }
      },
      conference: {
        summary: 'Conference event example',
        value: {
          name: 'AWS Conference 2023',
          description: 'Annual AWS conference with latest updates',
          date: '2023-11-28T09:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Event created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        name: { type: 'string', example: 'NestJS Workshop' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        imageUrl: { type: 'string', nullable: true },
        organizerId: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateEventDto,
    @Req() req: AuthRequest,
  ) {
    return this.eventsService.create(data, file, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update an event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiBody({ 
    type: UpdateEventDto,
    description: 'Event data to update'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Event updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event organizer or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateEvent(
    @Body() data: UpdateEventDto,
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.eventsService.update(
      id,
      data,
      req.user.userId,
      req.user.role === 'admin',
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List all events' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['active', 'inactive'],
    description: 'Filter events by status'
  })
  @ApiQuery({ 
    name: 'date', 
    required: false, 
    type: String,
    description: 'Filter events by date (format: YYYY-MM-DD)'
  })
  @ApiQuery({ 
    name: 'organizerId', 
    required: false, 
    type: String,
    description: 'Filter events by organizer ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of events',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              imageUrl: { type: 'string', nullable: true },
              status: { type: 'string' },
              organizerId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() filter: FilterEventsDto) {
    return this.eventsService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Event found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        imageUrl: { type: 'string', nullable: true },
        status: { type: 'string' },
        organizerId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        organizer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Soft delete an event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Event successfully deleted',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', example: 'inactive' },
        message: { type: 'string', example: 'Event successfully deleted' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event organizer or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async softDelete(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    return this.eventsService.softDelete(id, userId, userRole);
  }
}
