import {
  PieceDto,
  StrategoGameDto,
} from '../../stratego/dtos/stratego-game.dto';

export enum SocketRequestEvent {
  STRATEGO_JOIN_GAME = 'stratego-join-game',
  STRATEGO_CONFIRM_SETUP = 'stratego-confirm-setup',
  STRATEGO_PLAY_MOVE = 'stratego-play-move',
}

export type StrategoConfirmSetupRequest = {
  pieces: PieceDto[];
  gameId: string;
};

export type JoinStrategoGameRequest = {
  gameId: string;
};

export type PlayStrategoMoveRequest = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  gameId: string;
};

export interface SocketIncomingEventMap {
  [SocketRequestEvent.STRATEGO_JOIN_GAME]: JoinStrategoGameRequest;
  [SocketRequestEvent.STRATEGO_CONFIRM_SETUP]: StrategoConfirmSetupRequest;
  [SocketRequestEvent.STRATEGO_PLAY_MOVE]: PlayStrategoMoveRequest;
}

// ============================== OUTGOING EVENTS ==============================

export enum SocketResponseEvent {
  STRATEGO_GAME_UPDATED = 'stratego-game-updated',
}

export interface SocketOutgoingEventMap {
  [SocketResponseEvent.STRATEGO_GAME_UPDATED]: StrategoGameDto;
}
