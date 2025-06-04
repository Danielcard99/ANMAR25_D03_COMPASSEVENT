import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (must be strong with uppercase, lowercase, numbers and special characters)',
    example: 'StrongP@ss123',
    format: 'password'
  })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
