import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserRole } from './create-user.dto';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterUsersDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'Filter users by name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'john@email.com',
    description: 'Filter users by email',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filter users by role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
