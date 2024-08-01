import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined } from 'class-validator';
import { UserDto } from 'src/users/dtos/user.dto';

export class UpdateUserResponseDto {
  @ApiProperty({ type: UserDto })
  @IsDefined()
  @Type(() => UserDto)
  user!: UserDto;
}
