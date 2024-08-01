import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NewGameRequest, NewGameResponse } from './dtos/new-game.dto';
import { JWTRequest } from 'src/shared/interfaces/jwt-request.interface';
import { StrategoService } from './stratego.service';
import { GetMyGamesResponse } from './dtos/get-my-games.dto';
import { JwtAccessTokenAuthGuard } from 'src/auth/guards/jwt-access-token-auth.guard';
import { GetOpenGamesResponse } from './dtos/get-open-games.dto';

@Controller('stratego')
@ApiTags('Stratego')
@ApiBearerAuth('jwt-access-token')
@UseGuards(JwtAccessTokenAuthGuard)
export class StrategoController {
  constructor(private readonly strategoService: StrategoService) {}

  @Post('/new-game')
  @ApiOkResponse({ type: NewGameResponse })
  @ApiOperation({ summary: 'Get all users.' })
  async newGame(
    @Request() req: JWTRequest,
    @Body() body: NewGameRequest,
  ): Promise<NewGameResponse> {
    const newGame = await this.strategoService.createNewGame(
      req.user.uid,
      body.variation,
    );
    return { game: newGame };
  }

  @Get('/my-games')
  @ApiOkResponse({ type: GetMyGamesResponse })
  @ApiOperation({ summary: 'Get my games.' })
  async myGames(@Request() req: JWTRequest): Promise<GetMyGamesResponse> {
    const games = await this.strategoService.getUserGames(req.user.uid);
    return { games };
  }

  @Get('/open-games')
  @ApiOkResponse({ type: GetOpenGamesResponse })
  @ApiOperation({ summary: 'Get open games.' })
  async openGames(): Promise<GetOpenGamesResponse> {
    const games = await this.strategoService.getOpenGames();
    return { games };
  }

  @Delete('/game/:id')
  @ApiOperation({ summary: 'Delete a game by id' })
  async deleteGame(@Param('id') id: string, @Request() req: JWTRequest) {
    await this.strategoService.deleteGame(req.user.uid, id);
  }
}
