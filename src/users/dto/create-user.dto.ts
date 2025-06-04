import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export enum UserRole {
  ORGANIZER = 'organizer',
  PARTICIPANT = 'participant',
  ADMIN = 'admin',
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    minLength: 3,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email address (must be unique)',
    example: 'john.doe@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'Password (must be strong with uppercase, lowercase, numbers and special characters)',
    format: 'password',
    example: 'StrongP@ss123'
  })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ 
    description: 'Phone number in international format',
    example: '+5511999999999' 
  })
  @IsPhoneNumber('BR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ 
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.PARTICIPANT
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ 
    description: 'Profile image file (optional)',
    type: 'string', 
    format: 'binary', 
    required: false 
  })
  @IsOptional()
  file?: Express.Multer.File;
}
