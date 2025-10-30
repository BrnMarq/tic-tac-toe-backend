import { Room, GameState, RoomStatus } from "../types/game";
import { createInitialGameState } from "../utils/gameLogic";

export class GameRoom implements Room {
	id: string;
	name: string;
	players: string[] = [];
	maxPlayers: number = 2;
	status: RoomStatus = "waiting";
	gameState: GameState;

	constructor(id: string, name: string, creatorId: string) {
		this.id = id;
		this.name = name;
		this.gameState = createInitialGameState();
		this.addPlayer(creatorId);
	}

	addPlayer(playerId: string): void {
		if (this.isFull()) {
			throw new Error("Room is full.");
		}
		if (!this.players.includes(playerId)) {
			this.players.push(playerId);
		}
	}

	removePlayer(playerId: string): number {
		this.players = this.players.filter((id) => id !== playerId);

		if (this.players.length < 2 && this.status === "playing") {
			// If a player leaves mid-game, reset the room state
			this.status = "waiting";
			this.gameState = createInitialGameState();
		}

		return this.players.length;
	}

	isFull(): boolean {
		return this.players.length >= this.maxPlayers;
	}

	startGame(): void {
		if (this.isFull() && this.status !== "playing") {
			this.status = "playing";
			this.gameState.status = "playing";
			// The first player to join is always 'X'
			this.gameState.currentPlayer = "X";
		}
	}

	updateGameState(newGameState: GameState): void {
		this.gameState = newGameState;
		if (newGameState.status === "finished") {
			this.status = "finished";
		}
	}

	/**
	 * Returns a plain object representation of the room, suitable for sending over the wire.
	 */
	toJSON(): Room {
		return {
			id: this.id,
			name: this.name,
			players: this.players,
			maxPlayers: this.maxPlayers,
			status: this.status,
			gameState: this.gameState,
		};
	}
}
