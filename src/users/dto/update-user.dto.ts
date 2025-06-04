import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { UserRole } from './create-user.dto';

export class UpdatePatchUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ format: 'password' })
  @IsStrongPassword()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: '+55XXXXXXXXXXX' })
  @IsPhoneNumber('BR')
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
