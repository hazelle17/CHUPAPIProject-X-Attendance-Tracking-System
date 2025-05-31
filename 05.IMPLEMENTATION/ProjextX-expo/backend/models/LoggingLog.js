const mongoose = require('mongoose');

const loggingLogSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    required: true,
    enum: ['login_success', 'login_failed', 'login_error', 'logout']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

module.exports = mongoose.model('LoggingLog', loggingLogSchema);
