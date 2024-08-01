export type PiecePosition = {
  number: number;
  x: number;
  y: number;
};

export type Piece = {
  team: number; //0 or 1
  originalTeam: number; //0 or 1
} & PiecePosition;

export type AffectedPiece = {
  before: Piece;
  after: Piece;
  revealed: boolean;
  killed: boolean;
};

export type Move = {
  piece: AffectedPiece;
  piecesAffected: AffectedPiece[];
};

export enum GameState {
  WAITING = 'WAITING',
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
}

export enum GameVariation {
  DRAGON = 'DRAGON',
  CLASSIC = 'CLASSIC',
}

export type StrategoGame = {
  variation: GameVariation;
  gameId: string;
  pieces: Piece[];
  previousMove: Move | null;
  currentTurn: number; //0 or 1
  playerUids: string[];
  state: GameState;
  numTurns: number;
  createdAt: number;
  updatedAt: number;
};
