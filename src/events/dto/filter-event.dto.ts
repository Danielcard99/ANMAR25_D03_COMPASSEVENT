import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { EventStatus } from './create-event.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DateDirection {
  BEFORE = 'before',
  AFTER = 'after',
}

export class FilterEventsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DateDirection)
  dateDirection?: DateDirection;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(EventStatus)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  @Min(1)
  limit?: number;
}
