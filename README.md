# Tic-Tac-Toe Online - Backend

This is the backend server for a real-time multiplayer Tic-Tac-Toe game. It is built with Node.js, Express, and Socket.IO, using TypeScript for robust, type-safe code.

The server manages player connections, game rooms, and all game state logic. Its core architectural feature is the use of Node.js **Worker Threads** to ensure a scalable and non-blocking environment.

## 🏛️ Architecture: Worker-per-Room

To ensure scalability and prevent a single busy game from blocking the entire server, each game room runs in its own isolated worker thread.

- **Main Thread**: The main Node.js process is responsible for handling HTTP requests (via Express) and managing Socket.IO connections. It acts as a router or proxy. When a new game room is created, it spawns a new worker thread dedicated to that room.
- **Worker Threads**: Each worker thread manages the complete state and logic for a single Tic-Tac-Toe game (`GameRoom`). It processes moves, checks for winners, and handles players joining or leaving. This isolation means that even if one game involves heavy computation, it won't impact the responsiveness of other games or new client connections.
- **Communication**: The main thread and worker threads communicate asynchronously using `postMessage`. The main thread forwards client actions (like `make-move`) to the appropriate worker, and the worker sends back state updates to be broadcast to the clients in that room.

This design makes the application highly resilient and performant, capable of handling numerous concurrent games smoothly.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Language**: TypeScript
- **Concurrency**: Worker Threads
- **Development Tools**: Nodemon for live reloading, ts-node for running TypeScript directly.

## 🚀 Getting Started

Follow these instructions to get the backend server running on your local machine.

### Prerequisites

- Node.js (v18 or newer recommended)
- npm (comes with Node.js)

### Installation & Setup

1.  **Clone the repository** (if you haven't already):

    ```bash
    git clone <your-repository-url>
    cd <your-repository-folder>
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Set up environment variables**:

    Create a `.env` file in the directory. You can set the server port here.

    ```env
    # .env
    PORT=3000
    ```

4.  **Run the development server**:

    ```bash
    npm run dev
    ```

    The server will start, and Nodemon will watch for file changes. The console will log that the server is listening, typically on `http://localhost:3000`.

## 📜 Available Scripts

In the `backend` directory, you can run the following scripts:

- **`npm run dev`**
  Starts the development server using `nodemon` and `ts-node` for automatic restarts on file changes.

- **`npm run build`**
  Compiles the TypeScript code into JavaScript in the `dist` folder, as configured in `tsconfig.json`.

- **`npm run start`**
  Runs the server using `ts-node`. For a production environment, it's recommended to first run `npm run build` and then `node dist/index.js`.

## 🔌 Socket.IO Events

The server listens for and emits the following events:

### Client-to-Server Events

- `create-room` (roomName: string): Creates a new game room.
- `join-room` (roomId: string): Joins an existing game room.
- `make-move` ({ position: number }): Makes a move on the game board.
- `leave-room`: Signals the user is leaving their current room.

### Server-to-Client Events

- `rooms-updated` (rooms: Room[]): Sent to all clients when the list of available rooms changes.
- `room-joined` (room: Room): Sent to a client when they successfully create or join a room.
- `game-started` (gameState: GameState): Sent to all clients in a room when the game begins.
- `opponent-moved` (gameState: GameState): Sent to all clients in a room after a valid move is made.
- `game-over` ({ winner, winningLine }): Sent to all clients in a room when the game has finished.
- `player-left`: Sent to the remaining player in a room when their opponent leaves.
- `error` (message: string): Sent to a client when an error occurs (e.g., invalid move, room full).

## 📁 Project Structure

The `src` folder is organized as follows:

```
src/
├── models/       # Data models, like the GameRoom class.
├── sockets/      # Main Socket.IO connection and event handling logic.
├── types/        # TypeScript type definitions and interfaces.
├── utils/        # Shared utility functions (e.g., game logic).
├── workers/      # Logic for the worker threads (e.g., game.worker.ts).
└── index.ts      # Server entry point: sets up Express, Socket.IO, and HTTP server.
```
