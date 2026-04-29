const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// ─── VEHICLES ───────────────────────────────────────────────────────────
const vehiclesRouter = express.Router();
vehiclesRouter.use(authenticate);

vehiclesRouter.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ''; let params = [];
    if (search) { where = 'WHERE plate ILIKE $1 OR owner_name ILIKE $1 OR owner_phone ILIKE $1'; params.push(`%${search}%`); }
    const result = await query(`SELECT * FROM vehicles ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    const count = await query(`SELECT COUNT(*) FROM vehicles ${where}`, params);
    res.json({ vehicles: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.get('/:plate', async (req, res) => {
  try {
    const v = await query('SELECT * FROM vehicles WHERE plate ILIKE $1', [req.params.plate]);
    if (!v.rows.length) return res.status(404).json({ error: 'Veículo não encontrado' });
    const sessions = await query(`
      SELECT ps.*, sp.spot_number, pay.amount, pay.payment_method
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN payments pay ON pay.session_id = ps.id AND pay.status = 'approved'
      WHERE ps.plate ILIKE $1 ORDER BY ps.entry_time DESC LIMIT 20
    `, [req.params.plate]);
    res.json({ vehicle: v.rows[0], sessions: sessions.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.post('/', async (req, res) => {
  try {
    const { plate, brand, model, color, vehicle_type, owner_name, owner_phone, owner_email } = req.body;
    const result = await query(
      'INSERT INTO vehicles (plate,brand,model,color,vehicle_type,owner_name,owner_phone,owner_email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (plate) DO UPDATE SET brand=EXCLUDED.brand,model=EXCLUDED.model,color=EXCLUDED.color,vehicle_type=EXCLUDED.vehicle_type,owner_name=EXCLUDED.owner_name,owner_phone=EXCLUDED.owner_phone,owner_email=EXCLUDED.owner_email RETURNING *',
      [plate?.toUpperCase(), brand, model, color, vehicle_type || 'car', owner_name, owner_phone, owner_email]
    );
    res.status(201).json({ vehicle: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

vehiclesRouter.put('/:id', async (req, res) => {
  try {
    const { brand, model, color, vehicle_type, owner_name, owner_phone, owner_email } = req.body;
    const result = await query(
      'UPDATE vehicles SET brand=$1,model=$2,color=$3,vehicle_type=$4,owner_name=$5,owner_phone=$6,owner_email=$7 WHERE id=$8 RETURNING *',
      [brand, model, color, vehicle_type, owner_name, owner_phone, owner_email, req.params.id]
    );
    res.json({ vehicle: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USERS ──────────────────────────────────────────────────────────────
const usersRouter = express.Router();
usersRouter.use(authenticate);

usersRouter.get('/', authorize('admin'), async (req, res) => {
  try {
    const result = await query('SELECT id,name,email,role,is_active,last_login,created_at FROM users ORDER BY created_at DESC');
    res.json({ users: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

usersRouter.post('/', authorize('admin'), async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Dados incompletos' });
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,is_active',
      [name, email.toLowerCase(), hash, role || 'operator']
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

usersRouter.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { name, role, is_active } = req.body;
    const result = await query(
      'UPDATE users SET name=COALESCE($1,name), role=COALESCE($2,role), is_active=COALESCE($3,is_active) WHERE id=$4 RETURNING id,name,email,role,is_active',
      [name, role, is_active, req.params.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

usersRouter.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    await query('UPDATE users SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PLANS ──────────────────────────────────────────────────────────────
const plansRouter = express.Router();
plansRouter.use(authenticate);

plansRouter.get('/', async (req, res) => {
  try {
    const result = await query("SELECT * FROM pricing_plans WHERE is_active = true ORDER BY plan_type, vehicle_type");
    res.json({ plans: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

plansRouter.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, description, plan_type, vehicle_type, price_per_hour, price_per_day, monthly_price, max_daily_price, grace_period_minutes } = req.body;
    const result = await query(
      'INSERT INTO pricing_plans (name,description,plan_type,vehicle_type,price_per_hour,price_per_day,monthly_price,max_daily_price,grace_period_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, description, plan_type, vehicle_type, price_per_hour, price_per_day, monthly_price, max_daily_price, grace_period_minutes || 15]
    );
    res.status(201).json({ plan: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

plansRouter.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { name, description, price_per_hour, max_daily_price, monthly_price, grace_period_minutes, is_active } = req.body;
    const result = await query(
      'UPDATE pricing_plans SET name=COALESCE($1,name),description=COALESCE($2,description),price_per_hour=COALESCE($3,price_per_hour),max_daily_price=COALESCE($4,max_daily_price),monthly_price=COALESCE($5,monthly_price),grace_period_minutes=COALESCE($6,grace_period_minutes),is_active=COALESCE($7,is_active) WHERE id=$8 RETURNING *',
      [name, description, price_per_hour, max_daily_price, monthly_price, grace_period_minutes, is_active, req.params.id]
    );
    res.json({ plan: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CARD MACHINE ────────────────────────────────────────────────────────
const cardMachineRouter = express.Router();
cardMachineRouter.use(authenticate);

// Simulate card machine payment request (integrate with real POS via webhook)
cardMachineRouter.post('/charge', async (req, res) => {
  try {
    const { amount, payment_type, installments = 1, session_id, terminal_id } = req.body;

    if (!amount || !payment_type || !session_id) {
      return res.status(400).json({ error: 'Dados insuficientes para cobrança' });
    }

    // In production: send to POS terminal via serial/USB/TCP - e.g. Stone, Cielo, Rede
    // Simulating approval for demo:
    const approved = Math.random() > 0.05; // 95% approval rate simulation
    const transactionId = `TXN${Date.now()}`;
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    const cardBrands = ['Visa', 'Mastercard', 'Elo', 'Hipercard'];
    const cardBrand = cardBrands[Math.floor(Math.random() * cardBrands.length)];
    const lastDigits = Math.floor(1000 + Math.random() * 9000).toString();

    const txRecord = await query(`
      INSERT INTO card_machine_transactions 
        (payment_id, terminal_id, transaction_type, installments, gross_amount, 
         net_amount, fees, nsu, authorization_code, card_brand, card_last_digits,
         response_code, response_message, payload)
      VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      terminal_id || 'TERM-001', payment_type, installments,
      amount, amount * 0.97, amount * 0.03,
      `NSU${Date.now()}`, approved ? authCode : null,
      cardBrand, lastDigits,
      approved ? '00' : '51',
      approved ? 'APROVADO' : 'NEGADO',
      JSON.stringify({ session_id, timestamp: new Date().toISOString() })
    ]);

    if (approved) {
      res.json({
        status: 'approved',
        transaction_id: transactionId,
        authorization_code: authCode,
        card_brand: cardBrand,
        card_last_digits: lastDigits,
        amount,
        installments,
        nsu: txRecord.rows[0].nsu,
        message: 'Pagamento aprovado com sucesso'
      });
    } else {
      res.status(402).json({
        status: 'declined',
        response_code: '51',
        message: 'Pagamento negado. Verifique o cartão ou tente outro meio de pagamento.'
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel/refund a card transaction
cardMachineRouter.post('/refund', authorize('admin'), async (req, res) => {
  try {
    const { payment_id, reason } = req.body;
    await query("UPDATE payments SET status = 'refunded' WHERE id = $1", [payment_id]);
    res.json({ status: 'refunded', message: 'Estorno processado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get terminal status
cardMachineRouter.get('/terminal/status', async (req, res) => {
  res.json({
    terminal_id: 'TERM-001',
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    capabilities: ['credit', 'debit', 'pix', 'contactless'],
    firmware: '3.5.2'
  });
});

module.exports = { vehiclesRouter, usersRouter, plansRouter, cardMachineRouter };
