import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UserIdParamDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do usuário (UUID)',
  })
  @IsUUID()
  id: string;
}
