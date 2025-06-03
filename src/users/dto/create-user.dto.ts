import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsPhoneNumber('BR')
  phone: string;

  @IsEnum(UserRole)
  role: UserRole;
}
