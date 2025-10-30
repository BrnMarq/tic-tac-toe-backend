import { Server, Socket } from "socket.io";
import { Worker } from "worker_threads";
import path from "path";
import { randomUUID } from "crypto";
import {
	ClientToServerEvents,
	ServerToClientEvents,
	Room,
} from "../types/game";

// Maps to keep track of workers and room metadata
const roomWorkers = new Map<string, Worker>();
const roomData = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

export class GameSocketHandler {
	initialize(io: Server<ClientToServerEvents, ServerToClientEvents>) {
		io.on("connection", (socket: Socket) => {
			console.log(" Nuevo cliente conectado:", socket.id);

			// Enviar lista inicial de salas
			socket.emit("rooms-updated", Array.from(roomData.values()));

			// Crear sala
			socket.on("create-room", (roomName: string) => {
				const roomId = randomUUID();
				const worker = new Worker(
					path.resolve(__dirname, "../workers/game.worker.ts"),
					{
						workerData: {
							roomId,
							roomName,
							creatorId: socket.id,
						},
					}
				);

				roomWorkers.set(roomId, worker);
				socketToRoom.set(socket.id, roomId);

				worker.on("message", (message) => {
					const { type, payload } = message;
					const currentRoom = roomData.get(roomId);
					if (!currentRoom) return;

					switch (type) {
						case "room-created":
							roomData.set(roomId, payload);
							socket.join(roomId);
							socket.emit("room-joined", { ...payload, playerSymbol: "X" });
							io.emit("rooms-updated", Array.from(roomData.values()));
							break;

						case "player-joined":
							roomData.set(roomId, payload);
							io.emit("rooms-updated", Array.from(roomData.values()));
							break;

						case "game-started":
							io.to(roomId).emit("game-started", payload);
							break;

						case "state-update":
							io.to(roomId).emit("opponent-moved", payload);
							break;

						case "game-over":
							setTimeout(() => io.to(roomId).emit("game-over", payload), 1000);
							break;

						case "player-left":
							if (payload.isEmpty) {
								worker.terminate();
								roomWorkers.delete(roomId);
								roomData.delete(roomId);
							} else {
								socket.to(roomId).emit("player-left");
							}
							io.emit("rooms-updated", Array.from(roomData.values()));
							break;

						case "error":
							// Find the specific socket to send the error to, if available
							const targetSocket = io.sockets.sockets.get(payload.playerId);
							if (targetSocket) {
								targetSocket.emit("error", payload.message);
							} else {
								// Fallback to room broadcast if specific player socket not found
								io.to(roomId).emit("error", payload.message);
							}
							break;
					}
				});

				worker.on("error", (err) => {
					console.error(`Worker error in room ${roomId}:`, err);
					io.to(roomId).emit(
						"error",
						"A critical error occurred in the game room."
					);
				});

				worker.on("exit", (code) => {
					if (code !== 0) {
						console.error(
							`Worker for room ${roomId} stopped with exit code ${code}`
						);
					}
				});
			});

			// Unirse a sala
			socket.on("join-room", (roomId: string) => {
				const worker = roomWorkers.get(roomId);
				const room = roomData.get(roomId);

				if (!worker || !room) {
					return socket.emit("error", "Room not found or is full.");
				}

				socket.join(roomId);
				socketToRoom.set(socket.id, roomId);

				// The creator is 'X', the joiner is 'O'
				socket.emit("room-joined", { ...room, playerSymbol: "O" });

				worker.postMessage({ type: "join", payload: { playerId: socket.id } });
			});

			// Hacer movimiento
			socket.on("make-move", (data: { position: number }) => {
				const roomId = socketToRoom.get(socket.id);
				if (roomId) {
					const worker = roomWorkers.get(roomId);
					worker?.postMessage({
						type: "make-move",
						payload: { playerId: socket.id, position: data.position },
					});
				}
			});

			const handleLeave = () => {
				const roomId = socketToRoom.get(socket.id);
				if (roomId) {
					const worker = roomWorkers.get(roomId);
					worker?.postMessage({
						type: "leave",
						payload: { playerId: socket.id },
					});
					socket.leave(roomId);
					socketToRoom.delete(socket.id);
				}
			};

			// Salir de sala
			socket.on("leave-room", handleLeave);

			// Desconexión
			socket.on("disconnect", () => {
				console.log("🔌 Cliente desconectado:", socket.id);
				handleLeave();
			});
		});
	}
}
