const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const bookingRoutes = require('./routes/bookings');
const { router: trackingRoutes } = require('./routes/tracking');
const feedbackRoutes = require('./routes/feedback');
const complaintRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const nlpProxyRoutes = require('./routes/nlpProxy');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static route for EDA Reports & Visualizations
app.use('/api/reports/eda', express.static(path.join(__dirname, '../reports/eda')));

// Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/nlp', nlpProxyRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'TransitVoice Backend REST API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`🚀 TransitVoice Express REST API Server running on port ${PORT}`);
  console.log(`========================================================`);
});
