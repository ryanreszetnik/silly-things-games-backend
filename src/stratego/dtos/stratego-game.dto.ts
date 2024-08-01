import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  GameState,
  GameVariation,
} from 'src/shared/models/stratego-game.interface';

export class PieceDto {
  @ApiProperty()
  @IsDefined()
  @IsNumber()
  team!: number; //0 or 1

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  originalTeam!: number; //0 or 1

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  number!: number;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  x!: number;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  y!: number;
}

export class AffectedPieceDto {
  @ApiProperty({ type: PieceDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PieceDto)
  before!: PieceDto;

  @ApiProperty({ type: PieceDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PieceDto)
  after!: PieceDto;

  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  revealed!: boolean;

  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  killed!: boolean;
}

export class MoveDto {
  @ApiProperty({ type: AffectedPieceDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AffectedPieceDto)
  piece!: AffectedPieceDto;

  @ApiProperty({ type: AffectedPieceDto, isArray: true })
  @IsDefined()
  @ValidateNested({ each: true })
  @Type(() => AffectedPieceDto)
  piecesAffected!: AffectedPieceDto[];
}

export class StrategoGameDto {
  @ApiProperty({ enum: () => GameVariation })
  @IsDefined()
  @IsEnum(() => GameVariation)
  variation!: GameVariation;

  @ApiProperty()
  @IsDefined()
  @IsString()
  gameId!: string;

  @ApiProperty({ type: PieceDto, isArray: true })
  @IsDefined()
  @ValidateNested({ each: true })
  @Type(() => PieceDto)
  pieces!: PieceDto[];

  @ApiProperty({ type: MoveDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MoveDto)
  previousMove?: MoveDto;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  currentTurn!: number; //0 or 1

  @ApiProperty({ type: String, isArray: true })
  @IsDefined()
  @IsArray()
  @Type(() => String)
  playerUids!: string[];

  @ApiProperty({ enum: () => GameState })
  @IsDefined()
  @IsEnum(() => GameState)
  state!: GameState;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  numTurns!: number;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  createdAt!: number;

  @ApiProperty()
  @IsDefined()
  @IsNumber()
  updatedAt!: number;
}
