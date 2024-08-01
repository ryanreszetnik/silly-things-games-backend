import { GameVariation } from 'src/shared/models/stratego-game.interface';
import { PieceDto } from '../dtos/stratego-game.dto';

export const getAvailableMoves = (
  team: number,
  pieces: PieceDto[],
  gameMode: GameVariation,
  x: number,
  y: number,
): { x: number; y: number }[] => {
  const piece = pieces.find((p) => p.x === x && p.y === y && p.team === team);

  if (!piece) {
    console.log('No piece found');
    return [];
  }
  console.log('Found piece', piece.number);
  if (piece.number == 11 || piece.number == 0) {
    return [];
  }
  const moves: { x: number; y: number }[] = [];
  const directions = [
    { dx: 0, dy: 1 }, // up
    { dx: 0, dy: -1 }, // down
    { dx: 1, dy: 0 }, // right
    { dx: -1, dy: 0 }, // left
  ];

  // Scout can move any number of empty spaces
  const isScout = piece.number === 2;

  for (const { dx, dy } of directions) {
    let newX = x + dx;
    let newY = y + dy;

    while (isValidPosition(newX, newY)) {
      const targetPiece = pieces.find((p) => p.x === newX && p.y === newY);

      if (!targetPiece) {
        moves.push({ x: newX, y: newY });
        if (!isScout) break; // Non-scout pieces can only move one space
      } else {
        if (targetPiece.team !== team) {
          moves.push({ x: newX, y: newY }); // Can attack enemy piece
        }
        break; // Can't move through pieces
      }

      newX += dx;
      newY += dy;
    }
  }

  return moves;
};

// Helper function to check if a position is valid on the board
const isValidPosition = (x: number, y: number): boolean => {
  return x >= 0 && x < 10 && y >= 0 && y < 10 && !isLake(x, y);
};

// Helper function to check if a position is a lake
export const isLake = (x: number, y: number): boolean => {
  const lakes = [
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 6, y: 4 },
    { x: 7, y: 4 },
    { x: 6, y: 5 },
    { x: 7, y: 5 },
  ];
  return lakes.some((lake) => lake.x === x && lake.y === y);
};

export const didAttackerDie = (attacker: number, defender: number): boolean => {
  // 3 kills bomb
  if (attacker === 3 && defender === 11) {
    return false;
  }
  if (attacker === 11 && defender === 3) {
    return true;
  }

  //slayer kills dragon
  if (attacker === 1 && defender === 10) {
    return false;
  }
  if (attacker === 10 && defender === 1) {
    return true;
  }

  //equal match - both die
  if (attacker === defender) {
    return true;
  }

  //if attacker is weaker, attacker dies
  return attacker < defender;
};
