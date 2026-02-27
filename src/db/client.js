import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../logging/logger.js';

export const connectToDatabase = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  logger.info('Connected to MongoDB');
};

export const disconnectFromDatabase = async () => {
  await mongoose.connection.close();
  logger.info('Disconnected from MongoDB');
};
