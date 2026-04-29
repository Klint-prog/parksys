const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Main dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await query('SELECT * FROM v_dashboard_summary');
    
    const recentSessions = await query(`
      SELECT ps.*, 
             sp.spot_number, sp.floor,
             pp.name as plan_name, pp.price_per_hour
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      WHERE ps.status = 'active'
      ORDER BY ps.entry_time DESC
      LIMIT 10
    `);

    const hourlyRevenue = await query(`
      SELECT 
        EXTRACT(HOUR FROM payment_time) as hour,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'approved' AND payment_time::DATE = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM payment_time)
      ORDER BY hour
    `);

    const spotsByType = await query(`
      SELECT spot_type, status, COUNT(*) as count
      FROM parking_spots
      GROUP BY spot_type, status
      ORDER BY spot_type, status
    `);

    const weeklyRevenue = await query(`
      SELECT 
        TO_CHAR(payment_time::DATE, 'DD/MM') as day,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as transactions
      FROM payments
      WHERE status = 'approved' 
        AND payment_time > NOW() - INTERVAL '7 days'
      GROUP BY payment_time::DATE
      ORDER BY payment_time::DATE
    `);

    const paymentMethods = await query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE status = 'approved' AND payment_time::DATE = CURRENT_DATE
      GROUP BY payment_method
    `);

    res.json({
      summary: summary.rows[0],
      activeSessions: recentSessions.rows,
      hourlyRevenue: hourlyRevenue.rows,
      spotsByType: spotsByType.rows,
      weeklyRevenue: weeklyRevenue.rows,
      paymentMethods: paymentMethods.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live occupancy map
router.get('/occupancy', async (req, res) => {
  try {
    const spots = await query(`
      SELECT 
        ps.*,
        sess.plate, sess.entry_time, sess.session_code,
        sess.id as session_id
      FROM parking_spots ps
      LEFT JOIN parking_sessions sess ON sess.spot_id = ps.id AND sess.status = 'active'
      ORDER BY ps.floor, ps.spot_number
    `);

    res.json({ spots: spots.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
