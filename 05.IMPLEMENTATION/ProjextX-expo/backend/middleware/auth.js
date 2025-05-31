const jwt = require('jsonwebtoken');
const config = require('../config/config');

const auth = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.header('Authorization').replace('Bearer ', '');
    
    // Verify and decode the token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log('Decoded token:', {
      userId: decoded.userId,
      role: decoded.role,
      lecturerId: decoded.lecturerId
    });
    
    // Attach all decoded data to the request object
    req.user = {
      _id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role,
      lecturerId: decoded.lecturerId
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = auth;
