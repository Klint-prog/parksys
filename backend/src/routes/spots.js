const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { floor, status, type } = req.query;
    let where = [];
    let params = [];
    let idx = 1;

    if (floor) { where.push(`floor = $${idx++}`); params.push(floor); }
    if (status) { where.push(`status = $${idx++}`); params.push(status); }
    if (type) { where.push(`spot_type = $${idx++}`); params.push(type); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const result = await query(`
      SELECT ps.*, 
             sess.plate, sess.entry_time, sess.session_code, sess.id as session_id
      FROM parking_spots ps
      LEFT JOIN parking_sessions sess ON sess.spot_id = ps.id AND sess.status = 'active'
      ${whereClause}
      ORDER BY ps.floor, ps.spot_number
    `, params);

    res.json({ spots: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/available', async (req, res) => {
  try {
    const { floor } = req.query;
    let where = "WHERE status = 'available'";
    let params = [];

    if (floor) {
      where += ' AND floor = $1';
      params.push(floor);
    }

    const result = await query(
      `SELECT * FROM parking_spots ${where} ORDER BY floor, spot_number`,
      params
    );
    res.json({ spots: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { status, spot_type } = req.body;
    const result = await query(
      'UPDATE parking_spots SET status = COALESCE($1, status), spot_type = COALESCE($2, spot_type) WHERE id = $3 RETURNING *',
      [status, spot_type, req.params.id]
    );
    res.json({ spot: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
