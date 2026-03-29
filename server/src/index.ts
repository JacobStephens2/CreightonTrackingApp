import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initSchema } from './db/schema.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import { shareAuthRouter, shareViewHandler } from './routes/share.js';

initSchema();

const app = express();
const port = parseInt(process.env.PORT || '3456');

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

app.use((err: any, _req: any, res: any, next: any) => {
  console.error('JSON parser error', err?.message);
  if (err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON payload' });
  } else {
    next(err);
  }
});

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

app.post('/api/auth/register', authLimiter);
app.post('/api/auth/login', authLimiter);
app.post('/api/auth/forgot-password', authLimiter);
app.post('/api/auth/reset-password', authLimiter);
app.post('/api/auth/resend-verification', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncLimiter, requireAuth, syncRoutes);
app.get('/api/share/view/:token', syncLimiter, shareViewHandler);
app.use('/api/share', syncLimiter, requireAuth, shareAuthRouter);

app.listen(port, '127.0.0.1', () => {
  console.log(`Creighton API listening on 127.0.0.1:${port}`);
});
