import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import healthRouter from './routes/health';
import adminRouter from './routes/admin';
import userRouter from './routes/user';
import redirectRouter from './routes/redirect';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = corsOrigin.includes(',') 
  ? corsOrigin.split(',').map(o => o.trim()) 
  : corsOrigin;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api', adminRouter);
app.use('/api', userRouter);
app.use('/s', redirectRouter);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/peakflow';
const PORT = parseInt(process.env.PORT || '4000', 10);

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
