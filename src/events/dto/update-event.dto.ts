import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Organizer ID cannot be empty' })
  @Transform(({ value }: { value: string }) => value.trim())
  organizerId?: string;
}
