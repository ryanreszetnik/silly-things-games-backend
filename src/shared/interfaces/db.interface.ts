import { User } from '../models/user.interface';
import { GoogleUser } from '../models/google-user.interface';
import { StrategoGame } from '../models/stratego-game.interface';
import { GameSession } from '../models/game-session.interface';
import { UserGame } from '../models/user-games.interface';

export enum GSITables {
  GameSessionsSocketIdIndex = `game-sessions:socketId-gameId-index`,
}

export enum TableNames {
  User = 'users',
  GoogleUser = 'google-users',
  StrategoGames = 'stratego-games',
  GameSessions = 'game-sessions',
  UserGames = 'user-games',
}

export interface TableItem {
  [TableNames.User]: User;
  [TableNames.GoogleUser]: GoogleUser;
  [TableNames.StrategoGames]: StrategoGame;
  [TableNames.GameSessions]: GameSession;
  [GSITables.GameSessionsSocketIdIndex]: GameSession;
  [TableNames.UserGames]: UserGame;
}

export interface PrimaryKeys {
  [TableNames.User]: { uid: string };
  [TableNames.GoogleUser]: { gid: string };
  [TableNames.StrategoGames]: { gameId: string };
  [TableNames.GameSessions]: { gameId: string };
  [GSITables.GameSessionsSocketIdIndex]: { socketId: string };
  [TableNames.UserGames]: { uid: string };
}

type TableKeyMap = {
  [key in TableNames | GSITables]: object;
};

export interface SortKeys extends TableKeyMap {
  [TableNames.GameSessions]: { socketId: string };
  [GSITables.GameSessionsSocketIdIndex]: { gameId: string };
  [TableNames.UserGames]: { gameId: string };
}

export type TableKeys = {
  [K in TableNames | GSITables]: PrimaryKeys[K] & SortKeys[K];
};

type TableKeyValues = {
  [key in TableNames | GSITables]: string[];
};

export const TableKeyValues: TableKeyValues = {
  [TableNames.User]: ['uid'],
  [TableNames.GoogleUser]: ['gid'],
  [TableNames.GameSessions]: ['gameId', 'socketId'],
  [TableNames.StrategoGames]: ['gameId'],
  [GSITables.GameSessionsSocketIdIndex]: ['socketId', 'gameId'],
  [TableNames.UserGames]: ['uid', 'gameId'],
};
