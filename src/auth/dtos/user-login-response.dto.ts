import { IsBoolean, IsDefined, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from 'src/users/dtos/user.dto';

export class UserLoginResponseDto {
  @ApiProperty()
  @IsDefined()
  @IsString()
  accessToken!: string;

  @ApiProperty()
  @IsDefined()
  user: UserDto;

  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  isNewUser!: boolean;
}
