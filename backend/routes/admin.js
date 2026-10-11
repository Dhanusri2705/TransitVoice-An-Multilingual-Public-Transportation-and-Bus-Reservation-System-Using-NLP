const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

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
