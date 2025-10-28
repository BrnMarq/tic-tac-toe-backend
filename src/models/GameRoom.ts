import { Room, GameState } from '../types/game';
import { createInitialGameState } from '../utils/gameLogic';

export class GameRoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(roomName: string, creatorSocketId: string): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newRoom: Room = {
      id: roomId,
      name: roomName,
      players: [creatorSocketId],
      maxPlayers: 2,
      status: 'waiting',
      gameState: createInitialGameState()
    };

    this.rooms.set(roomId, newRoom);
    console.log(` Sala creada: ${roomName} (${roomId})`);
    return newRoom;
  }

    joinRoom(roomId: string, socketId: string): Room | null {
    const room = this.rooms.get(roomId);
    
    if (!room) {
        console.log(` Sala ${roomId} no encontrada`);
        return null;
    }

    if (room.players.length >= room.maxPlayers) {
        console.log(` Sala ${roomId} llena. Jugadores: ${room.players.length}`);
        return null;
    }

    console.log(` Uniendo usuario probando ${socketId} a sala ${room.name}`);
    room.players.push(socketId);
    room.status = room.players.length >= room.maxPlayers ? 'full' : 'waiting';

    if (room.players.length === room.maxPlayers) {
        console.log(` Sala ${room.name} COMPLETA - Iniciando juego`);
        room.gameState.status = 'playing';
        room.status = 'playing';
    }

    this.rooms.set(roomId, room);
    console.log(` Usuario ${socketId} unido a ${room.name}. Total: ${room.players.length}`);
    return room;
    }

  leaveRoom(socketId: string): string | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.includes(socketId)) {
        room.players = room.players.filter(id => id !== socketId);
        
        if (room.players.length === 0) {
          this.rooms.delete(roomId);
          console.log(` Sala eliminada: ${room.name} (${roomId})`);
        } else {
          room.gameState = createInitialGameState();
          room.status = 'waiting';
          this.rooms.set(roomId, room);
          console.log(` Usuario ${socketId} salió de ${room.name}`);
        }
        
        return roomId;
      }
    }
    return null;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  updateGameState(roomId: string, gameState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      this.rooms.set(roomId, room);
    }
  }

  cleanupEmptyRooms(): void {
    let cleanedCount = 0;
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(` Limpieza: ${cleanedCount} salas vacías eliminadas`);
    }
  }
}