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
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  file?: Express.Multer.File;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ format: 'password' })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '+55XXXXXXXXXXX' })
  @IsPhoneNumber('BR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
