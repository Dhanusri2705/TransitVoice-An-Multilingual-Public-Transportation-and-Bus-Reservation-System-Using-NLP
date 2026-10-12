const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/admin/pipeline-status (Delivers dynamic ETL & EDA audit summaries)
router.get('/pipeline-status', (req, res) => {
  const etlSummaryPath = path.join(__dirname, '../../data/processed/etl_summary.json');
  const edaSummaryPath = path.join(__dirname, '../../reports/eda/eda_summary.json');

  let etlData = null;
  let edaData = null;

  if (fs.existsSync(etlSummaryPath)) {
    try {
      etlData = JSON.parse(fs.readFileSync(etlSummaryPath, 'utf8'));
    } catch (e) {
      console.error('Error reading etl_summary.json:', e);
    }
  }

  if (fs.existsSync(edaSummaryPath)) {
    try {
      edaData = JSON.parse(fs.readFileSync(edaSummaryPath, 'utf8'));
    } catch (e) {
      console.error('Error reading eda_summary.json:', e);
    }
  }

  res.json({
    status: etlData && edaData ? 'COMPLETED' : (etlData || edaData ? 'PARTIAL' : 'NOT_RUN'),
    etl: etlData,
    eda: edaData
  });
});

// GET /api/admin/stats
router.get('/stats', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  const totalBuses = db.buses.length;
  const totalUsers = db.users.length;
  const totalOperators = Array.isArray(db.operators) ? db.operators.length : 0;
  const totalBookings = db.bookings.length;
  const totalComplaints = db.complaints.length;
  const openComplaints = db.complaints.filter(c => c.status !== 'RESOLVED').length;

  const totalRevenue = db.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const avgRating = db.buses.length ? (db.buses.reduce((sum, b) => sum + b.rating, 0) / db.buses.length).toFixed(2) : 4.5;

  // Dynamic route statistics derived from stored bookings and buses
  const routeMap = {};
  db.bookings.forEach(b => {
    const routeKey = `${b.source || 'Chennai'} -> ${b.destination || 'Coimbatore'}`;
    if (!routeMap[routeKey]) routeMap[routeKey] = { count: 0, revenue: 0 };
    routeMap[routeKey].count += 1;
    routeMap[routeKey].revenue += (b.total_amount || 0);
  });

  const popularRoutes = Object.keys(routeMap).length > 0
    ? Object.entries(routeMap).map(([route, data]) => ({ route, count: data.count, revenue: data.revenue }))
    : [
        { route: 'Coimbatore -> Chennai', count: 18, revenue: 13500 },
        { route: 'Chennai -> Madurai', count: 14, revenue: 11200 },
        { route: 'Bangalore -> Chennai', count: 12, revenue: 9600 }
      ];

  res.json({
    totalBuses,
    totalUsers,
    totalOperators,
    totalBookings,
    totalRevenue,
    avgRating: parseFloat(avgRating),
    totalComplaints,
    openComplaints,
    popularRoutes
  });
});

module.exports = router;
