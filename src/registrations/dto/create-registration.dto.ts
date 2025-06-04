import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  eventId: string;
}
