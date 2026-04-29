const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const router = express.Router();
router.use(authenticate);

// Register payment
router.post('/', async (req, res) => {
  const client = await (require('../db').getClient)();
  try {
    await client.query('BEGIN');

    const { session_id, payment_method, amount, change_amount = 0,
            card_brand, card_last_digits, transaction_id, authorization_code } = req.body;

    if (!session_id || !payment_method || !amount) {
      return res.status(400).json({ error: 'Dados de pagamento incompletos' });
    }

    const sessionCheck = await client.query(
      "SELECT * FROM parking_sessions WHERE id = $1",
      [session_id]
    );

    if (sessionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const payment = await client.query(`
      INSERT INTO payments 
        (session_id, payment_method, amount, change_amount, card_brand, card_last_digits, 
         transaction_id, authorization_code, status, operator_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved',$9)
      RETURNING *
    `, [session_id, payment_method, amount, change_amount,
        card_brand, card_last_digits, transaction_id, authorization_code, req.user.id]);

    await client.query('COMMIT');

    res.status(201).json({ payment: payment.rows[0], message: 'Pagamento registrado com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get payment by session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM payments WHERE session_id = $1 ORDER BY created_at DESC',
      [req.params.sessionId]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate receipt PDF
router.get('/:id/receipt', async (req, res) => {
  try {
    const paymentResult = await query(`
      SELECT p.*, ps.plate, ps.entry_time, ps.exit_time, ps.duration_minutes,
             ps.session_code, ps.discount_percent,
             sp.spot_number, sp.floor,
             pp.name as plan_name, pp.price_per_hour,
             u.name as operator_name
      FROM payments p
      JOIN parking_sessions ps ON p.session_id = ps.id
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      LEFT JOIN users u ON p.operator_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const data = paymentResult.rows[0];

    const doc = new PDFDocument({ size: [226, 600], margin: 10 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-${data.receipt_number}.pdf"`);
    doc.pipe(res);

    const centerX = 113;
    const pageW = 226;

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('PARK SYSTEM', 0, 15, { align: 'center', width: pageW });
    doc.fontSize(8).font('Helvetica').text('Sistema de Estacionamento', 0, 32, { align: 'center', width: pageW });
    doc.moveTo(10, 45).lineTo(216, 45).stroke();

    // Receipt number
    doc.fontSize(9).font('Helvetica-Bold').text(`RECIBO: ${data.receipt_number}`, 0, 52, { align: 'center', width: pageW });
    doc.fontSize(7).font('Helvetica').text(new Date(data.payment_time).toLocaleString('pt-BR'), 0, 64, { align: 'center', width: pageW });

    doc.moveTo(10, 74).lineTo(216, 74).stroke();

    // Vehicle info
    let y = 80;
    const addLine = (label, value) => {
      doc.fontSize(7.5).font('Helvetica-Bold').text(label, 12, y);
      doc.font('Helvetica').text(value || '-', 12 + doc.widthOfString(label) + 4, y);
      y += 14;
    };

    addLine('PLACA:', data.plate);
    addLine('VAGA:', `${data.floor}${data.spot_number}`);
    addLine('PLANO:', data.plan_name || '-');
    addLine('ENTRADA:', new Date(data.entry_time).toLocaleString('pt-BR'));
    addLine('SAÍDA:', data.exit_time ? new Date(data.exit_time).toLocaleString('pt-BR') : '-');
    addLine('TEMPO:', `${data.duration_minutes || 0} min`);

    doc.moveTo(10, y).lineTo(216, y).stroke();
    y += 8;

    // Payment info
    doc.fontSize(9).font('Helvetica-Bold').text('PAGAMENTO', 0, y, { align: 'center', width: pageW });
    y += 14;

    const methodLabels = {
      cash: 'Dinheiro', credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito', pix: 'PIX', monthly_plan: 'Mensalista'
    };
    addLine('FORMA:', methodLabels[data.payment_method] || data.payment_method);
    if (data.card_brand) addLine('BANDEIRA:', `${data.card_brand} **** ${data.card_last_digits || ''}`);
    if (data.authorization_code) addLine('AUTORIZAC.:', data.authorization_code);
    if (data.discount_percent > 0) addLine('DESCONTO:', `${data.discount_percent}%`);

    doc.moveTo(10, y).lineTo(216, y).stroke();
    y += 8;

    doc.fontSize(12).font('Helvetica-Bold')
       .text(`TOTAL: R$ ${parseFloat(data.amount).toFixed(2).replace('.', ',')}`, 0, y, { align: 'center', width: pageW });
    y += 16;

    if (data.change_amount > 0) {
      doc.fontSize(9).font('Helvetica')
         .text(`Troco: R$ ${parseFloat(data.change_amount).toFixed(2).replace('.', ',')}`, 0, y, { align: 'center', width: pageW });
      y += 14;
    }

    doc.moveTo(10, y).lineTo(216, y).stroke();
    y += 8;

    doc.fontSize(7).font('Helvetica').text(`Operador: ${data.operator_name || '-'}`, 0, y, { align: 'center', width: pageW });
    y += 12;
    doc.text('Obrigado pela preferência!', 0, y, { align: 'center', width: pageW });
    y += 10;
    doc.text('Volte sempre!', 0, y, { align: 'center', width: pageW });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
