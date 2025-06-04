import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiBody, 
  ApiOperation, 
  ApiParam, 
  ApiQuery, 
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from '../common/interfaces/auth-request.interface';
import { FilterRegistrationDto } from './dto/filter-registration.dto';

@ApiBearerAuth()
@ApiTags('registrations')
@Controller('registrations')
@UsePipes(new ValidationPipe())
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new registration for an event' })
  @ApiBody({ 
    type: CreateRegistrationDto,
    description: 'Event registration data',
    examples: {
      standard: {
        summary: 'Standard registration example',
        value: {
          eventId: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Registration created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        eventId: { type: 'string' },
        participantId: { type: 'string' },
        status: { type: 'string', example: 'active' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 409, description: 'User already registered for this event' })
  async create(@Body() data: CreateRegistrationDto, @Req() req: AuthRequest) {
    const participantId = req.user.userId;
    return this.registrationsService.createRegistration(participantId, data);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all registrations for the current user' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['active', 'canceled'],
    description: 'Filter registrations by status'
  })
  @ApiQuery({ 
    name: 'eventId', 
    required: false, 
    type: String,
    description: 'Filter registrations by event ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of registrations',
    schema: {
      type: 'object',
      properties: {
        registrations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              eventId: { type: 'string' },
              participantId: { type: 'string' },
              status: { type: 'string', enum: ['active', 'canceled'] },
              createdAt: { type: 'string', format: 'date-time' },
              event: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  imageUrl: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Req() req: AuthRequest,
    @Query() filter: FilterRegistrationDto,
  ) {
    const participantId = req.user.userId;
    return this.registrationsService.listRegistrations(participantId, filter);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cancel a registration' })
  @ApiParam({ name: 'id', description: 'Registration ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Registration successfully canceled',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', example: 'canceled' },
        message: { type: 'string', example: 'Registration successfully canceled' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not registration owner' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async softDelete(@Req() req: AuthRequest, @Param('id') id: string) {
    const participantId = req.user.userId;
    return this.registrationsService.cancelRegistration(id, participantId);
  }
}
