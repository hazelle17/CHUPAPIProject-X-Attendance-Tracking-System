const mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://gardose997:gardose@cluster0.shlty5n.mongodb.net/AttendanceX?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
  .then(() => {
    console.log('✅ MongoDB connected');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection error:', err);
    process.exit(1);
  });
