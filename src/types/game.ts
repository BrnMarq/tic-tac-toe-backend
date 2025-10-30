export type Player = "X" | "O" | null;
export type GameStatus = "waiting" | "playing" | "finished";
export type WinnerStatus = "X" | "O" | "draw" | null;
export type RoomStatus = "waiting" | "full" | "playing";

export interface Room {
	id: string;
	name: string;
	players: string[];
	maxPlayers: number;
	status: RoomStatus;
	gameState: GameState;
}

export interface GameState {
	board: Player[];
	currentPlayer: Player;
	status: GameStatus;
	winner: WinnerStatus;
	winningLine: number[] | null;
}

export interface ClientToServerEvents {
	"create-room": (roomName: string) => void;
	"join-room": (roomId: string) => void;
	"leave-room": () => void;
	"make-move": (data: { position: number }) => void;
	"restart-game": () => void;
}

export interface ServerToClientEvents {
	"rooms-updated": (rooms: Room[]) => void;
	"room-joined": (room: Room & { playerSymbol: Player }) => void;
	"game-started": (gameState: GameState & { playerSymbol: Player }) => void;
	"opponent-moved": (gameState: GameState) => void;
	"game-over": (result: {
		winner: WinnerStatus;
		winningLine: number[] | null;
	}) => void;
	error: (error: string) => void;
	"player-joined": (playersCount: number) => void;
	"player-left": (playersCount: number) => void;
}
