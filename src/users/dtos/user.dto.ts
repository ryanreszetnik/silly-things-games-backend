import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class UserDto {
  @ApiProperty()
  @IsDefined()
  @IsString()
  uid!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  gid?: string;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  createdAt!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
