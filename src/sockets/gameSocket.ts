import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, GameStatus } from '../types/game';
import { GameRoomManager } from '../models/GameRoom';
import { checkWinner, isBoardFull } from '../utils/gameLogic';

export class GameSocketHandler {
  private roomManager: GameRoomManager;

  constructor() {
    this.roomManager = new GameRoomManager();
    
    // Limpieza periódica de salas vacías
    setInterval(() => {
      this.roomManager.cleanupEmptyRooms();
    }, 60000);
  }

  initialize(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    io.on('connection', (socket: Socket) => {
      console.log(' Nuevo cliente conectado:', socket.id);

      // Enviar lista inicial de salas
      socket.emit('rooms-updated', this.roomManager.getAllRooms());

      // Crear sala
        socket.on('create-room', (roomName: string) => {
        try {
            console.log(` Usuario ${socket.id} creando sala: ${roomName}`);
            const room = this.roomManager.createRoom(roomName, socket.id);
            
            socket.join(room.id);
            
            io.emit('rooms-updated', this.roomManager.getAllRooms());
            
            socket.emit('room-joined', { 
            ...room, 
            playerSymbol: 'X' // Primer jugador siempre es X
            });
            
            console.log(` Sala creada y creador unido: ${roomName}`);
        } catch (error) {
            console.error('Error al crear sala:', error);
            socket.emit('error', 'Error al crear la sala');
        }
        });

      // Unirse a sala
    socket.on('join-room', (roomId: string) => {
    try {
        console.log(` Usuario ${socket.id} intentando unirse a sala: ${roomId}`);
        const room = this.roomManager.joinRoom(roomId, socket.id);
        
        if (!room) {
        socket.emit('error', 'Sala no encontrada o llena');
        return;
        }

        socket.join(roomId);
        io.emit('rooms-updated', this.roomManager.getAllRooms());

        const playerSymbol = room.players[0] === socket.id ? 'X' : 'O';
        socket.emit('room-joined', { ...room, playerSymbol });

        // Notificar a los otros jugadores de la sala
        socket.to(roomId).emit('player-joined', room.players.length);

        console.log(` Usuario ${socket.id} unido a ${room.name}. Jugadores: ${room.players.length}/${room.maxPlayers}`);

        // INICIAR JUEGO SI HAY 2 JUGADORES - CORREGIDO
        if (room.players.length === room.maxPlayers && room.status === 'playing') {
        console.log(` Iniciando juego en sala: ${room.name}`);
        
        // Enviar game-started a AMBOS jugadores
        io.to(roomId).emit('game-started', {
            ...room.gameState,
            playerSymbol: room.players[0] === socket.id ? 'X' : 'O'
        });
        
        console.log(` Evento game-started enviado a sala ${roomId}`);
        }
    } catch (error) {
        console.error('Error al unirse a sala:', error);
        socket.emit('error', 'Error al unirse a la sala');
    }
    });

      // Hacer movimiento
      socket.on('make-move', (data: { position: number }) => {
        try {
          const rooms = this.roomManager.getAllRooms();
          const playerRoom = rooms.find(room => 
            room.players.includes(socket.id) && room.status === 'playing'
          );

          if (!playerRoom) {
            socket.emit('error', 'No estás en una sala de juego activa');
            return;
          }

          const gameState = playerRoom.gameState;
          
          // Validar movimiento
          if (gameState.board[data.position] || gameState.status !== 'playing') {
            socket.emit('error', 'Movimiento inválido');
            return;
          }

          // Determinar símbolo del jugador
          const playerSymbol = playerRoom.players[0] === socket.id ? 'X' : 'O';
          if (gameState.currentPlayer !== playerSymbol) {
            socket.emit('error', 'No es tu turno');
            return;
          }

          // Aplicar movimiento
          const newBoard = [...gameState.board];
          newBoard[data.position] = playerSymbol;

          // Verificar ganador
          const { winner, line } = checkWinner(newBoard);
          let newStatus: GameStatus = gameState.status;
          let newWinner = gameState.winner;

          if (winner) {
            newStatus = 'finished';
            newWinner = winner;
          } else if (isBoardFull(newBoard)) {
            newStatus = 'finished';
            newWinner = 'draw';
          }

          // Actualizar estado
          const newGameState = {
            board: newBoard,
            currentPlayer: newStatus === 'playing' ? (playerSymbol === 'X' ? 'O' : 'X') : gameState.currentPlayer,
            status: newStatus,
            winner: newWinner,
            winningLine: line
          };

          this.roomManager.updateGameState(playerRoom.id, newGameState);

          // Notificar a ambos jugadores
          io.to(playerRoom.id).emit('opponent-moved', newGameState);

          // Si el juego terminó
          if (newStatus === 'finished') {
            setTimeout(() => {
              io.to(playerRoom.id).emit('game-over', {
                winner: newWinner,
                winningLine: line
              });
            }, 1000);
          }
        } catch (error) {
          socket.emit('error', 'Error al procesar el movimiento');
        }
      });

      // Salir de sala
      socket.on('leave-room', () => {
        const roomId = this.roomManager.leaveRoom(socket.id);
        if (roomId) {
          socket.leave(roomId);
          socket.to(roomId).emit('player-left', this.roomManager.getRoom(roomId)?.players.length || 0);
          io.emit('rooms-updated', this.roomManager.getAllRooms());
        }
      });

      // Desconexión
      socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
        const roomId = this.roomManager.leaveRoom(socket.id);
        if (roomId) {
          socket.to(roomId).emit('player-left', this.roomManager.getRoom(roomId)?.players.length || 0);
          io.emit('rooms-updated', this.roomManager.getAllRooms());
        }
      });
    });
  }
}