import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { UserDto } from './user.dto';
import { Type } from 'class-transformer';

export class GetUserResponseDto {
  @ApiProperty({ type: UserDto })
  @IsOptional()
  @Type(() => UserDto)
  user?: UserDto;
}
