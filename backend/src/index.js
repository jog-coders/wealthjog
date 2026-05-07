import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());

const allowedOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()) : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow if exact match, or if it's a Vercel preview domain
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    return callback(new Error('CORS policy violation'), false);
  },
  credentials: true
}));
app.use(express.json());

import incomeRoutes from './routes/income.js';
import budgetRoutes from './routes/budget.js';
import assetsRoutes from './routes/assets.js';
import liabilitiesRoutes from './routes/liabilities.js';
import expensesRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import rentalsRoutes from './routes/rentals.js';
import { authMiddleware } from './middleware/auth.js';

// Routes will be mounted here later
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protect all API routes with auth
app.use('/api', authMiddleware);

app.use('/api/income', incomeRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/liabilities', liabilitiesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/rentals', rentalsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
