import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import { StrategoGameDto } from './stratego-game.dto';
import { Type } from 'class-transformer';

export class GetMyGamesResponse {
  @ApiProperty({ type: StrategoGameDto, isArray: true })
  @IsDefined()
  @IsArray()
  @Type(() => StrategoGameDto)
  @ValidateNested({ each: true })
  games: StrategoGameDto[];
}
