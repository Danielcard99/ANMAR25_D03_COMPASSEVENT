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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmailConfirmedGuard } from '../common/guards/email-confirmed.guard';

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
@UsePipes(new ValidationPipe())
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ 
    type: CreateUserDto,
    description: 'User data with optional profile image',
    examples: {
      participant: {
        summary: 'Participant user example',
        value: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'StrongP@ss123',
          phone: '+5511999999999',
          role: 'participant'
        }
      },
      organizer: {
        summary: 'Organizer user example',
        value: {
          name: 'Event Manager',
          email: 'manager@example.com',
          password: 'StrongP@ss123',
          phone: '+5511888888888',
          role: 'organizer'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        role: { type: 'string', example: 'participant' },
        profileImageUrl: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(
    @Body() data: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.create(file, data);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'), EmailConfirmedGuard)
  @ApiOperation({ summary: "Update current user's data" })
  @ApiBody({ type: UpdatePatchUserDto })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Email not confirmed' })
  async update(
    @Body() data: UpdatePatchUserDto,
    @User('userId') userId: string,
  ) {
    return this.usersService.update(data, userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), EmailConfirmedGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({ 
    name: 'role', 
    required: false, 
    description: 'Filter users by role',
    enum: ['admin', 'organizer', 'participant']
  })
  @ApiQuery({ 
    name: 'isActive', 
    required: false, 
    type: Boolean,
    description: 'Filter users by active status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of users',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        total: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll(@Query() filterDto: FilterUsersDto) {
    return this.usersService.findAll(filterDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), EmailConfirmedGuard, SelfOrAdminGuard)
  @ApiOperation({ summary: 'Find user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param() params: UserIdParamDto) {
    const user = await this.usersService.findById(params.id);
    return { user };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), EmailConfirmedGuard, SelfOrAdminGuard)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async softDelete(
    @Param() params: UserIdParamDto,
    @Request() req: AuthRequest,
  ) {
    return this.usersService.softDelete(params.id, req.user);
  }
}
