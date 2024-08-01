import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DynamoDBService } from 'src/dynamodb/dynamodb.service';
import { TableNames } from 'src/shared/interfaces/db.interface';
import {
  GameState,
  GameVariation,
  Move,
  StrategoGame,
} from 'src/shared/models/stratego-game.interface';
import { UserGame } from 'src/shared/models/user-games.interface';
import { getCurrentEpoch } from 'src/utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import { PieceDto } from './dtos/stratego-game.dto';
import { didAttackerDie, getAvailableMoves } from './utils/piece-moves.utils';

@Injectable()
export class StrategoService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}
  public async createNewGame(
    uid: string,
    variation: GameVariation,
  ): Promise<StrategoGame> {
    const now = getCurrentEpoch();
    const newGame: StrategoGame = {
      createdAt: now,
      updatedAt: now,
      gameId: uuidv4(),
      pieces: [],
      numTurns: 0,
      currentTurn: Math.random() > 0.5 ? 1 : 0,
      state: GameState.WAITING,
      variation: variation,
      previousMove: undefined,
      playerUids: [uid],
    };

    const userGame: UserGame = {
      uid,
      gameId: newGame.gameId,
      isFinished: false,
    };
    await this.dynamoDBService.putItem(TableNames.StrategoGames, newGame);
    await this.dynamoDBService.putItem(TableNames.UserGames, userGame);
    return newGame;
  }

  public async deleteGame(uid: string, gameId: string): Promise<void> {
    const game = await this.dynamoDBService.getItem(TableNames.StrategoGames, {
      gameId,
    });
    if (!game.playerUids.includes(uid)) {
      throw new UnauthorizedException('Not your game bud');
    }
    await this.dynamoDBService.batchDeleteItems(
      TableNames.UserGames,
      game.playerUids.map((id) => ({
        uid: id,
        gameId,
      })),
    );
    await this.dynamoDBService.deleteItem(TableNames.StrategoGames, {
      gameId,
    });
  }

  public async getOpenGames(): Promise<StrategoGame[]> {
    const userGames = await this.dynamoDBService.getAllItems(
      TableNames.StrategoGames,
      {
        filter: {
          field: 'state',
          value: GameState.WAITING,
          operator: 'eq',
        },
      },
    );
    return userGames.items;
  }

  public async getUserGames(uid: string): Promise<StrategoGame[]> {
    const userGames = await this.dynamoDBService.queryPK(TableNames.UserGames, {
      uid,
    });
    const gameIds = userGames.items.map((userGame) => ({
      gameId: userGame.gameId,
    }));
    const games = await this.dynamoDBService.batchGetItems(
      TableNames.StrategoGames,
      gameIds,
    );
    return games;
  }

  private async saveGame(game: StrategoGame) {
    return this.dynamoDBService.putItem(TableNames.StrategoGames, game);
  }

  public async joinGame(uid: string, gameId: string): Promise<StrategoGame> {
    const game = await this.dynamoDBService.getItem(TableNames.StrategoGames, {
      gameId,
    });
    if (!game) {
      throw new Error('Game not found');
    }
    if (game.playerUids.includes(uid)) {
      return game;
    }
    if (game.state !== GameState.WAITING || game.playerUids.length === 2) {
      throw new Error('Game is not waiting for players');
    }
    game.playerUids.push(uid);
    game.state = GameState.SETUP;
    const userGame: UserGame = {
      uid,
      gameId,
      isFinished: false,
    };
    await this.dynamoDBService.putItem(TableNames.UserGames, userGame);
    await this.saveGame(game);
    return game;
  }

  public async confirmSetup(
    uid: string,
    gameId: string,
    pieces: PieceDto[],
  ): Promise<StrategoGame> {
    const game = await this.dynamoDBService.getItem(TableNames.StrategoGames, {
      gameId,
    });
    if (!game) {
      throw new Error('Game not found');
    }
    if (!game.playerUids.includes(uid)) {
      throw new Error('User not in game');
    }
    if (game.state !== GameState.SETUP) {
      throw new Error('Not in setup phase');
    }
    const playerNumber = game.playerUids.indexOf(uid);
    if (game.pieces.some((p) => p.team === playerNumber)) {
      throw new Error('Already setup');
    }
    const isOntoNext = game.pieces.length > 0;
    game.pieces.push(
      ...pieces.map((p) => {
        p.team = playerNumber;
        p.originalTeam = playerNumber;
        return p;
      }),
    );
    //save the game
    game.state = isOntoNext ? GameState.PLAYING : GameState.SETUP;
    await this.saveGame(game);
    return game;
  }

  public async playMove(
    uid: string,
    gameId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): Promise<StrategoGame> {
    const game = await this.dynamoDBService.getItem(TableNames.StrategoGames, {
      gameId,
    });
    if (!game) {
      throw new Error('Game not found');
    }
    if (!game.playerUids.includes(uid)) {
      throw new Error('User not in game');
    }
    if (game.state !== GameState.PLAYING) {
      throw new Error('Not in playing phase');
    }
    const playerNumber = game.playerUids.indexOf(uid);
    if (game.currentTurn !== playerNumber) {
      throw new Error('Not your turn');
    }
    const fromPiece = game.pieces.find(
      (p) => p.x === from.x && p.y === from.y && p.team === playerNumber,
    );
    if (!fromPiece) {
      throw new Error('No piece found');
    }
    if (fromPiece.team !== playerNumber) {
      throw new Error('Not your piece');
    }
    const toPiece = game.pieces.find(
      (p) => p.x === to.x && p.y === to.y && p.team !== playerNumber,
    );
    if (toPiece && toPiece.team == fromPiece.team) {
      throw new Error('Cannot attack your own piece');
    }
    if (from.x === to.x && from.y === to.y) {
      throw new Error('Have to move');
    }
    const availableMoves = getAvailableMoves(
      playerNumber,
      game.pieces,
      game.variation,
      from.x,
      from.y,
    );
    if (!availableMoves.some((m) => m.x === to.x && m.y === to.y)) {
      throw new Error('Invalid move');
    }
    if (toPiece && toPiece.number === 0) {
      //game over
      game.state = GameState.FINISHED;
    }
    if (toPiece) {
      //attack
      const fromPieceDie = didAttackerDie(fromPiece.number, toPiece.number);
      const toPieceDie = didAttackerDie(toPiece.number, fromPiece.number);
      const move: Move = {
        piece: {
          before: {
            ...fromPiece,
          },
          after: {
            ...fromPiece,
            x: to.x,
            y: to.y,
          },
          revealed: true,
          killed: fromPieceDie,
        },
        piecesAffected: [
          {
            before: {
              ...toPiece,
            },
            after: {
              ...toPiece,
            },
            revealed: true,
            killed: toPieceDie,
          },
        ],
      };
      game.previousMove = move;
      game.pieces = game.pieces
        .map((p) => {
          if (p.x === from.x && p.y === from.y) {
            if (fromPieceDie) {
              return null;
            }
            return { ...p, x: to.x, y: to.y };
          }
          if (p.x === to.x && p.y === to.y) {
            if (toPieceDie) {
              return null;
            }
          }
          return p;
        })
        .filter((p) => p);
    } else {
      const move: Move = {
        piece: {
          before: {
            ...fromPiece,
          },
          after: {
            ...fromPiece,
            x: to.x,
            y: to.y,
          },
          revealed: false,
          killed: false,
        },
        piecesAffected: [],
      };
      game.previousMove = move;
      game.pieces = game.pieces.map((p) =>
        p.x === from.x && p.y === from.y ? { ...p, x: to.x, y: to.y } : p,
      );
    }

    game.numTurns++;
    game.currentTurn = 1 - game.currentTurn;
    await this.saveGame(game);
    return game;
  }
}
