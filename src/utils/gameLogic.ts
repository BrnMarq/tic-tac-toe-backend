import { Player } from '../types/game';

export const checkWinner = (board: Player[]): { winner: Player; line: number[] | null } => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
};

export const createInitialGameState = () => ({
  board: Array(9).fill(null),
  currentPlayer: 'X' as Player,
  status: 'waiting' as const,
  winner: null,
  winningLine: null
});

export const isBoardFull = (board: Player[]): boolean => {
  return board.every(cell => cell !== null);
};