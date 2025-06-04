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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  description: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  date: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: true,
  })
  @IsOptional()
  image?: Express.Multer.File;
}
