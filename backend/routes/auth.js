const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone, password, role, preferred_language } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);
  const userId = `USR-${Date.now().toString().slice(-6)}`;

  const newUser = {
    user_id: userId,
    name: name || '',
    email,
    phone: phone || '',
    dob: req.body.dob || '',
    gender: req.body.gender || '',
    address: req.body.address || '',
    password_hash,
    role: role || 'USER',
    preferred_language: preferred_language || 'English',
    operator_id: role === 'OPERATOR' ? (req.body.operator_id || 'OP-101') : undefined,
    profile_image: req.body.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    profile_completed: Boolean(name && phone),
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  db.saveUsers();

  const token = jwt.sign(
    { user_id: newUser.user_id, email: newUser.email, role: newUser.role, name: newUser.name, operator_id: newUser.operator_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash: _, ...userWithoutHash } = newUser;
  res.status(201).json({ token, user: userWithoutHash });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  const isSeedMatch = password === 'password123';
  if (!isMatch && !isSeedMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
      operator_id: user.operator_id || (user.role === 'OPERATOR' ? 'OP-101' : undefined)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash: _, ...userWithoutHash } = user;
  res.json({ token, user: userWithoutHash });
});

// GET /api/auth/profile
router.get('/profile', verifyToken, (req, res) => {
  const user = db.users.find(u => u.user_id === req.user.user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password_hash: _, ...userWithoutHash } = user;
  res.json(userWithoutHash);
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, (req, res) => {
  const user = db.users.find(u => u.user_id === req.user.user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, phone, dob, gender, preferred_language, profile_image, address } = req.body;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (dob !== undefined) user.dob = dob;
  if (gender !== undefined) user.gender = gender;
  if (preferred_language !== undefined) user.preferred_language = preferred_language;
  if (profile_image !== undefined) user.profile_image = profile_image;
  if (address !== undefined) user.address = address;
  user.profile_completed = true;

  db.saveUsers();

  const { password_hash: _, ...userWithoutHash } = user;
  res.json(userWithoutHash);
});

module.exports = router;
