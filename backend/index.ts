import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';
import routes from './routes';
import { createWebSocketServer } from './utils/ws-server';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  });
});

routes(app);

const PORT: number = parseInt(process.env.PORT || '3000');

const server: Server = app.listen(PORT, () => {
  const address = server.address();

  if (address) {
    if (typeof address === 'string') {
      console.log(`Server is running on socket: ${address}`);
    } else {
      console.log(`Server is running on port: ${address.port}`);
    }
  } else {
    console.log('Server is running');
  }
});

// Buat WebSocket server
createWebSocketServer(server);

server.on('error', (error: Error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;