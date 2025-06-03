import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateEventDto } from './dto/create-event.dto';
import { AuthRequest } from '../common/interfaces/auth-request.interface';
import { EventsService } from './events.service';

@Controller('events')
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
    if (!file) {
      throw new BadRequestException('Image is required');
    }

    return this.eventsService.create(data, file, req.user.userId);
  }
}
