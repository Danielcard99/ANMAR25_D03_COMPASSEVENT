import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and get access token' })
  @ApiBody({ 
    type: LoginDto,
    description: 'User credentials',
    examples: {
      standard: {
        summary: 'Standard login example',
        value: {
          email: 'user@example.com',
          password: 'StrongP@ss123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data format' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('confirm-email')
  @ApiOperation({ summary: 'Confirm user email address' })
  @ApiQuery({ 
    name: 'token', 
    required: true, 
    description: 'Email confirmation token sent to user email'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Email successfully confirmed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email successfully confirmed' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Token is required' })
  @ApiResponse({ status: 404, description: 'Invalid or expired token' })
  async confirmEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    const user = await this.usersService.findByConfirmationToken(token);

    if (!user) {
      throw new NotFoundException('Invalid or expired token');
    }
    await this.usersService.confirmEmail(user.id);
    return { message: 'Email successfully confirmed' };
  }
}
