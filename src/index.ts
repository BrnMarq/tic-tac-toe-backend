import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import compression from "compression";
import { GameSocketHandler } from "./sockets/gameSocket";

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		credentials: true,
	},
});

app.use(compression());
app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({ status: "OK", message: "Tic Tac Toe Server running" });
});

const gameSocketHandler = new GameSocketHandler();
gameSocketHandler.initialize(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
	console.log(` Servidor Tic Tac Toe ejecutándose en puerto ${PORT}`);
	console.log(` Health check: http://localhost:${PORT}/health`);
	console.log(` Frontend conectado a: http://localhost:8080`);
});
