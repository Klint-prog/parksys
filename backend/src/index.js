require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const sessionsRoutes = require('./routes/sessions');
const spotsRoutes = require('./routes/spots');
const paymentsRoutes = require('./routes/payments');
const reportsRoutes = require('./routes/reports');
const vehiclesRoutes = require('./routes/vehicles');
const usersRoutes = require('./routes/users');
const cardMachineRoutes = require('./routes/cardMachine');
const plansRoutes = require('./routes/plans');

const { logger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Muitas requisições, tente novamente em 15 minutos.' }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'parking-system-api' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/spots', spotsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/card-machine', cardMachineRoutes);
app.use('/api/plans', plansRoutes);

// Static files for receipts
app.use('/receipts', express.static('/app/receipts'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚗 Parking System API running on port ${PORT}`);
});

module.exports = app;
