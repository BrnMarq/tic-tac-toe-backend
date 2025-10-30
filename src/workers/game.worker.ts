import { parentPort, workerData } from "worker_threads";
import { GameRoom } from "../models/GameRoom";
import { checkWinner, isBoardFull } from "../utils/gameLogic";
import { GameState, GameStatus, Player } from "../types/game";

if (!parentPort) throw new Error("This script must be run as a worker thread.");

const { roomId, roomName, creatorId } = workerData as {
	roomId: string;
	roomName: string;
	creatorId: string;
};

const room = new GameRoom(roomId, roomName, creatorId);

const postMessage = (type: string, payload: unknown) => {
	parentPort?.postMessage({ type, payload });
};

parentPort.on(
	"message",
	(message: {
		type: string;
		payload: { playerId?: string; position?: number };
	}) => {
		const { type, payload } = message;

		try {
			switch (type) {
				case "join":
					if (payload.playerId) {
						room.addPlayer(payload.playerId);
						postMessage("player-joined", room.toJSON());
						if (room.isFull()) {
							room.startGame();
							postMessage("game-started", room.gameState);
						}
					}
					break;

				case "leave":
					if (payload.playerId) {
						const remainingPlayers = room.removePlayer(payload.playerId);
						postMessage("player-left", {
							remainingPlayers,
							isEmpty: remainingPlayers === 0,
						});
					}
					break;

				case "make-move":
					if (payload.playerId === undefined || payload.position === undefined)
						return;

					const gameState = room.gameState;
					const playerSymbol = room.players[0] === payload.playerId ? "X" : "O";

					// Validations
					if (
						gameState.board[payload.position] ||
						gameState.status !== "playing" ||
						gameState.currentPlayer !== playerSymbol
					) {
						postMessage("error", {
							playerId: payload.playerId,
							message: "Invalid move.",
						});
						return;
					}

					// Apply move
					const newBoard = [...gameState.board];
					newBoard[payload.position] = playerSymbol;

					// Check for winner or draw
					const { winner, line } = checkWinner(newBoard);
					let newStatus: GameStatus = "playing";
					let newWinner: Player | "draw" | null = null;

					if (winner) {
						newStatus = "finished";
						newWinner = winner;
					} else if (isBoardFull(newBoard)) {
						newStatus = "finished";
						newWinner = "draw";
					}

					// Update state
					const newGameState: GameState = {
						...gameState,
						board: newBoard,
						currentPlayer: playerSymbol === "X" ? "O" : "X",
						status: newStatus,
						winner: newWinner,
						winningLine: line,
					};

					room.updateGameState(newGameState);
					postMessage("state-update", newGameState);

					if (newStatus === "finished") {
						postMessage("game-over", {
							winner: newWinner,
							winningLine: line,
						});
					}
					break;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "An unknown error occurred.";
			postMessage("error", {
				playerId: payload.playerId,
				message: errorMessage,
			});
		}
	}
);

// Initial state ready message
postMessage("room-created", room.toJSON());
