import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRegistrationDto {
  @ApiProperty({
    description: 'ID of the event to register for',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  eventId: string;
}
