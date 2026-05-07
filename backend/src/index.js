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
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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
