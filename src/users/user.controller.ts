import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  Patch,
  UseGuards,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { UpdatePatchUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FilterUsersDto } from './dto/filter-users.dto';
import { UserIdParamDto } from './dto/User-id-params.dto';
import { SelfOrAdminGuard } from '../common/guards/self-or-admin.guard';

@Controller('users')
@UsePipes(new ValidationPipe())
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() data: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.create(file, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async update(
    @Body() data: UpdatePatchUserDto,
    @User('userId') userId: string,
  ) {
    return this.usersService.update(data, userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async findAll(@Query() filterDto: FilterUsersDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), SelfOrAdminGuard)
  async findOne(@Param() params: UserIdParamDto) {
    const user = await this.usersService.findById(params.id);
    return { user };
  }
}
