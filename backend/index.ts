import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';
import routes from './routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Error Handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  });
});

routes(app);

const PORT: number = parseInt(process.env.PORT || '0');

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

// Tangani error startup
server.on('error', (error: Error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});

// Tangani shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;