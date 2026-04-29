const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Get all active sessions
router.get('/', async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE ps.status = $1';
    let params = [status];
    let paramIdx = 2;

    if (search) {
      whereClause += ` AND (ps.plate ILIKE $${paramIdx} OR ps.session_code ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const result = await query(`
      SELECT 
        ps.*,
        sp.spot_number, sp.floor, sp.section,
        pp.name as plan_name, pp.price_per_hour,
        u.name as operator_name,
        EXTRACT(EPOCH FROM (NOW() - ps.entry_time)) / 60 as elapsed_minutes,
        CEIL(EXTRACT(EPOCH FROM (NOW() - ps.entry_time)) / 3600) * COALESCE(pp.price_per_hour, 0) as estimated_price
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      LEFT JOIN users u ON ps.operator_id = u.id
      ${whereClause}
      ORDER BY ps.entry_time DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    const countResult = await query(
      `SELECT COUNT(*) FROM parking_sessions ps ${whereClause}`,
      params
    );

    res.json({
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single session
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT ps.*, sp.spot_number, sp.floor, sp.section,
             pp.name as plan_name, pp.price_per_hour, pp.max_daily_price, pp.grace_period_minutes,
             u.name as operator_name,
             EXTRACT(EPOCH FROM (NOW() - ps.entry_time)) / 60 as elapsed_minutes
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      LEFT JOIN users u ON ps.operator_id = u.id
      WHERE ps.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Get payment if exists
    const payment = await query(
      'SELECT * FROM payments WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    res.json({ ...result.rows[0], payment: payment.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vehicle entry
router.post('/entry', async (req, res) => {
  const client = await (require('../db').getClient)();
  try {
    await client.query('BEGIN');

    const { plate, spot_id, pricing_plan_id, notes } = req.body;

    if (!plate || !spot_id || !pricing_plan_id) {
      return res.status(400).json({ error: 'Placa, vaga e plano são obrigatórios' });
    }

    // Check if spot is available
    const spotCheck = await client.query(
      'SELECT * FROM parking_spots WHERE id = $1 AND status = $2',
      [spot_id, 'available']
    );

    if (spotCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vaga não disponível' });
    }

    // Check if plate already has active session
    const activeCheck = await client.query(
      "SELECT id FROM parking_sessions WHERE plate = $1 AND status = 'active'",
      [plate.toUpperCase()]
    );

    if (activeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Veículo já possui sessão ativa' });
    }

    // Find or create vehicle
    let vehicleId = null;
    const vehicleResult = await client.query(
      'SELECT id FROM vehicles WHERE plate = $1',
      [plate.toUpperCase()]
    );

    if (vehicleResult.rows.length > 0) {
      vehicleId = vehicleResult.rows[0].id;
    } else {
      const newVehicle = await client.query(
        'INSERT INTO vehicles (plate) VALUES ($1) RETURNING id',
        [plate.toUpperCase()]
      );
      vehicleId = newVehicle.rows[0].id;
    }

    // Create session
    const session = await client.query(`
      INSERT INTO parking_sessions (plate, vehicle_id, spot_id, pricing_plan_id, operator_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [plate.toUpperCase(), vehicleId, spot_id, pricing_plan_id, req.user.id, notes]);

    // Update spot status
    await client.query(
      "UPDATE parking_spots SET status = 'occupied' WHERE id = $1",
      [spot_id]
    );

    await client.query('COMMIT');

    // Return full session data
    const fullSession = await query(`
      SELECT ps.*, sp.spot_number, sp.floor, pp.name as plan_name, pp.price_per_hour
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      WHERE ps.id = $1
    `, [session.rows[0].id]);

    res.status(201).json({ session: fullSession.rows[0], message: 'Entrada registrada com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Vehicle exit / calculate price
router.get('/:id/calculate', async (req, res) => {
  try {
    const result = await query(`
      SELECT ps.*, pp.price_per_hour, pp.max_daily_price, pp.grace_period_minutes
      FROM parking_sessions ps
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      WHERE ps.id = $1 AND ps.status = 'active'
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão ativa não encontrada' });
    }

    const session = result.rows[0];
    const now = new Date();
    const elapsedMinutes = Math.floor((now - new Date(session.entry_time)) / 60000);
    const elapsedHours = Math.ceil(elapsedMinutes / 60);

    let price = 0;
    if (elapsedMinutes > session.grace_period_minutes) {
      price = elapsedHours * parseFloat(session.price_per_hour || 0);
      if (session.max_daily_price && price > parseFloat(session.max_daily_price)) {
        price = parseFloat(session.max_daily_price);
      }
    }

    const finalPrice = price * (1 - (session.discount_percent || 0) / 100);

    res.json({
      session_id: session.id,
      plate: session.plate,
      entry_time: session.entry_time,
      elapsed_minutes: elapsedMinutes,
      elapsed_hours: elapsedHours,
      calculated_price: price.toFixed(2),
      discount_percent: session.discount_percent || 0,
      final_price: finalPrice.toFixed(2),
      within_grace_period: elapsedMinutes <= session.grace_period_minutes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close session (exit)
router.post('/:id/exit', async (req, res) => {
  const client = await (require('../db').getClient)();
  try {
    await client.query('BEGIN');

    const { discount_percent = 0 } = req.body;

    const session = await client.query(
      "SELECT * FROM parking_sessions WHERE id = $1 AND status = 'active'",
      [req.params.id]
    );

    if (session.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sessão ativa não encontrada' });
    }

    const exitTime = new Date();

    // Update session with exit
    const updated = await client.query(`
      UPDATE parking_sessions
      SET exit_time = $1, discount_percent = $2, status = 'completed'
      WHERE id = $3
      RETURNING *
    `, [exitTime, discount_percent, req.params.id]);

    // Free up spot
    await client.query(
      "UPDATE parking_spots SET status = 'available' WHERE id = $1",
      [session.rows[0].spot_id]
    );

    await client.query('COMMIT');

    // Return with calculated values
    const finalSession = await query(`
      SELECT ps.*, sp.spot_number, pp.name as plan_name, pp.price_per_hour
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      WHERE ps.id = $1
    `, [req.params.id]);

    res.json({ session: finalSession.rows[0], message: 'Saída registrada com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Search by plate
router.get('/search/plate/:plate', async (req, res) => {
  try {
    const result = await query(`
      SELECT ps.*, sp.spot_number, sp.floor, pp.name as plan_name, pp.price_per_hour,
             EXTRACT(EPOCH FROM (NOW() - ps.entry_time)) / 60 as elapsed_minutes
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      WHERE ps.plate ILIKE $1
      ORDER BY ps.entry_time DESC
      LIMIT 5
    `, [`%${req.params.plate}%`]);

    res.json({ sessions: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
