import {
  Body,
  Controller,
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

@Controller('events')
@UsePipes(new ValidationPipe())
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'organizer')
  @UseInterceptors(FileInterceptor('image'))
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
  async findAll(@Query() filter: FilterEventsDto) {
    return this.eventsService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}
