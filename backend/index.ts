import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import routes from './routes';
import { createWebSocketServer } from './utils/ws-server';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

routes(app);

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

const httpServer = http.createServer(app);
createWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

httpServer.on('error', (error: Error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;
