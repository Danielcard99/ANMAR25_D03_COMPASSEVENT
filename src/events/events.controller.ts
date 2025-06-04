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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';

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
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiResponse({ status: 200, description: 'List of events' })
  async findAll(@Query() filter: FilterEventsDto) {
    return this.eventsService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Soft delete an event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async softDelete(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    return this.eventsService.softDelete(id, userId, userRole);
  }
}
