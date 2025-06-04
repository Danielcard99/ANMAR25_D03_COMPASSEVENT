import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum EventStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateEventDto {
  @ApiProperty({
    description: 'Name of the event',
    example: 'AWS Summit 2023',
    minLength: 3,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @ApiProperty({
    description: 'Detailed description of the event',
    example: 'Join us for the annual AWS Summit with keynotes, workshops, and networking opportunities.',
    minLength: 10
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  description: string;

  @ApiProperty({
    description: 'Date and time of the event in ISO format',
    example: '2023-12-15T14:00:00Z',
    format: 'date-time'
  })
  @IsDateString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  date: string;

  @ApiProperty({
    description: 'Event cover image (optional)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  image?: Express.Multer.File;
}
