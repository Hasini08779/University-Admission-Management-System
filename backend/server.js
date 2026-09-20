const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const facultyRoutes = require('./routes/faculty');
const applicationRoutes = require('./routes/applications');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '..')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university-admission', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  bufferCommands: false,
})
.then(async () => {
  console.log('MongoDB is connected');
  // Seed initial data
  const seedData = require('./seed');
  await seedData();
  console.log('Database seeded');
  // Sync to JSON after seeding
  const syncToJson = require('./utils/syncToJson');
  await syncToJson();
  console.log('Data synced to JSON');

  // Schedule automatic sync every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await syncToJson();
      console.log('Automatic JSON sync completed');
    } catch (error) {
      console.error('Error during automatic sync:', error);
    }
  });
  console.log('Automatic sync scheduled every 5 minutes');

  // Set up change streams for real-time sync (only if replica set)
  const db = mongoose.connection.db;
  const collections = ['applications', 'users'];
  collections.forEach(collectionName => {
    try {
      const changeStream = db.collection(collectionName).watch();
      changeStream.on('error', () => {
        // Silently ignore errors (occurs when not running on replica set)
      });
      changeStream.on('change', async (change) => {
        console.log(`Change detected in ${collectionName}:`, change.operationType);
        try {
          await syncToJson();
          console.log('JSON synced after DB change');
        } catch (error) {
          console.error('Error syncing JSON after change:', error);
        }
      });
      console.log(`Change stream set up for ${collectionName}`);
    } catch (error) {
      // Silently ignore (occurs when not running on replica set)
    }
  });
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/applications', applicationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. The server will not accept requests until the database is back online.');
});

// Start server only after successful MongoDB connection
mongoose.connection.once('open', () => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});