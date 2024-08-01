import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, ValidateNested } from 'class-validator';
import { GameVariation } from 'src/shared/models/stratego-game.interface';
import { StrategoGameDto } from './stratego-game.dto';
import { Type } from 'class-transformer';

export class NewGameRequest {
  @ApiProperty({ enum: GameVariation })
  @IsDefined()
  @IsEnum(GameVariation)
  variation: GameVariation;
}

export class NewGameResponse {
  @ApiProperty({ type: StrategoGameDto })
  @IsDefined()
  @Type(() => StrategoGameDto)
  @ValidateNested()
  game: StrategoGameDto;
}
