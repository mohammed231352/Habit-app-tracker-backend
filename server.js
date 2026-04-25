const express = require('express');


const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');



// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const habitRoutes = require('./routes/habitRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
// Service 4: Notification and Reminder Service — Kareem Taha (234007)
const notificationRoutes = require('./routes/notificationRoutes');
const { startScheduler } = require('./services/notificationScheduler');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://habit-tracker-frontend.vercel.app', // Production Vercel URL (update after deployment)
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Service 4: Notification and Reminder Service
app.use('/api/notifications', notificationRoutes);

// Special Debug Route to see invisible database contents directly in browser
app.get('/debug/users', async (req, res) => {
  const User = require('./models/User');
  const users = await User.find({});
  res.json({ totalUsers: users.length, users });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'User Management Service', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── Database Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, // Force IPv4 explicitly
      serverSelectionTimeoutMS: 5000, 
    });

    console.log(`✅ MongoDB Connected to Atlas NATIVELY: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 User Management Service running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
  // Service 4: Start notification cron scheduler
  startScheduler();
};

startServer();

module.exports = app;
