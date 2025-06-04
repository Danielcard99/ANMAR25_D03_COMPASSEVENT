import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from '../common/interfaces/auth-request.interface';

@ApiBearerAuth()
@Controller('registrations')
@UsePipes(new ValidationPipe())
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new registration' })
  async create(@Body() data: CreateRegistrationDto, @Req() req: AuthRequest) {
    const participantId = req.user.userId;
    return this.registrationsService.createRegistration(participantId, data);
  }
}
