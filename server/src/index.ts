import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initSchema } from './db/schema.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';

initSchema();

const app = express();
const port = parseInt(process.env.PORT || '3456');

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: 'Too many attempts, try again in a minute' },
});

const syncLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { error: 'Too many requests, try again in a minute' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/sync', syncLimiter, requireAuth, syncRoutes);

app.listen(port, '127.0.0.1', () => {
  console.log(`Creighton API listening on 127.0.0.1:${port}`);
});
