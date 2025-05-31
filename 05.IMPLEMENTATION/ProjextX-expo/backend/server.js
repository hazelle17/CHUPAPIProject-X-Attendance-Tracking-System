require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config/config');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const lecturerRoutes = require('./routes/lecturers');
const classesRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());  // Allow all origins

app.use(express.json());
app.use(express.static(path.join(__dirname, '../web-build'))); // Serve the Expo web build

// Enable CORS for specific methods and headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Root route redirect to frontend login page
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/lecturers', lecturerRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/attendance', attendanceRoutes);

// Serve the Expo app for all other routes
//app.get('*', (req, res) => {
  //res.sendFile(path.join(__dirname, '../web-build/index.html'));
//});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
