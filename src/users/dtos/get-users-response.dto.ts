import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import { UserDto } from './user.dto';
import { Type } from 'class-transformer';

export class GetUsersResponseDto {
  @ApiProperty({ type: [UserDto] })
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  users!: UserDto[];
}
