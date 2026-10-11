const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'transitvoice_secret_key_2026';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    // Provide guest user fallback so demo flow never blocks unauthenticated users
    req.user = {
      user_id: 'USR-101',
      name: 'Arun Kumar (Guest)',
      email: 'user@transitvoice.com',
      role: 'USER'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') {
    req.user = {
      user_id: 'USR-101',
      name: 'Arun Kumar (Guest)',
      email: 'user@transitvoice.com',
      role: 'USER'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    const db = require('../models/db');
    if (db && db.users) {
      const dbUser = db.users.find(u => u.user_id === decoded.user_id || u.email === decoded.email);
      if (dbUser) {
        if (!req.user.operator_id && dbUser.operator_id) {
          req.user.operator_id = dbUser.operator_id;
        }
        if (!req.user.role && dbUser.role) {
          req.user.role = dbUser.role;
        }
      }
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || req.user.isGuest || !req.headers['authorization']) {
      return res.status(401).json({ error: 'Authentication required. Please sign in with an authorized account.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Role ${req.user.role} is not authorized for this resource.` });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole, JWT_SECRET };
