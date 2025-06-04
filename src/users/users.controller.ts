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
  Delete,
  Request,
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
import { AuthRequest } from '../common/interfaces/auth-request.interface';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('users')
@UsePipes(new ValidationPipe())
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  async create(
    @Body() data: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.create(file, data);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "Update current user's data" })
  @ApiBody({ type: UpdatePatchUserDto })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  async update(
    @Body() data: UpdatePatchUserDto,
    @User('userId') userId: string,
  ) {
    return this.usersService.update(data, userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() filterDto: FilterUsersDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), SelfOrAdminGuard)
  @ApiOperation({ summary: 'Find user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param() params: UserIdParamDto) {
    const user = await this.usersService.findById(params.id);
    return { user };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), SelfOrAdminGuard)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deactivated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async softDelete(
    @Param() params: UserIdParamDto,
    @Request() req: AuthRequest,
  ) {
    return this.usersService.softDelete(params.id, req.user);
  }
}
