import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import compression from "compression";
import { GameSocketHandler } from "./sockets/gameSocket";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "http://localhost:8080", 
  credentials: true
}));
app.use(compression());
app.use(express.json());


app.get("/health", (_req, res) => {
  res.json({ status: "OK", message: "Tic Tac Toe Server running" });
});


const gameSocketHandler = new GameSocketHandler();
gameSocketHandler.initialize(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(` Servidor Tic Tac Toe ejecutándose en puerto ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Frontend conectado a: http://localhost:8080`); 
});