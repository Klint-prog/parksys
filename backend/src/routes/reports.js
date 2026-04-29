const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const router = express.Router();
router.use(authenticate);

const buildDateFilter = (startDate, endDate, field = 'ps.entry_time') => {
  const params = [];
  const conditions = [];
  let idx = 1;
  if (startDate) { conditions.push(`${field} >= $${idx++}`); params.push(startDate); }
  if (endDate)   { conditions.push(`${field} <= $${idx++}`); params.push(endDate + ' 23:59:59'); }
  return { conditions, params };
};

// Revenue report
router.get('/revenue', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const { conditions, params } = buildDateFilter(startDate, endDate, 'p.payment_time');
    const where = conditions.length ? 'WHERE p.status = \'approved\' AND ' + conditions.join(' AND ') : "WHERE p.status = 'approved'";

    const groupExpr = groupBy === 'hour'
      ? "DATE_TRUNC('hour', p.payment_time)"
      : groupBy === 'month'
        ? "DATE_TRUNC('month', p.payment_time)"
        : "p.payment_time::DATE";

    const result = await query(`
      SELECT 
        ${groupExpr} as period,
        COUNT(*) as transactions,
        SUM(p.amount) as revenue,
        AVG(p.amount) as avg_ticket,
        p.payment_method
      FROM payments p
      ${where}
      GROUP BY ${groupExpr}, p.payment_method
      ORDER BY period
    `, params);

    const totals = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as avg_ticket,
        payment_method,
        COUNT(*) as method_count
      FROM payments p
      ${where}
      GROUP BY payment_method
    `, params);

    res.json({ data: result.rows, totals: totals.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sessions report
router.get('/sessions', async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { conditions, params } = buildDateFilter(startDate, endDate);
    if (status) { conditions.push(`ps.status = $${params.length + 1}`); params.push(status); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query(`
      SELECT ps.*, sp.spot_number, sp.floor, pp.name as plan_name,
             u.name as operator_name, pay.amount as paid_amount, pay.payment_method
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN pricing_plans pp ON ps.pricing_plan_id = pp.id
      LEFT JOIN users u ON ps.operator_id = u.id
      LEFT JOIN payments pay ON pay.session_id = ps.id AND pay.status = 'approved'
      ${where}
      ORDER BY ps.entry_time DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const countResult = await query(`SELECT COUNT(*) FROM parking_sessions ps ${where}`, params);

    res.json({ sessions: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Occupancy report
router.get('/occupancy', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { conditions, params } = buildDateFilter(startDate, endDate);
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const byFloor = await query(`
      SELECT sp.floor,
             COUNT(*) FILTER (WHERE ps.status = 'completed') as completed_sessions,
             AVG(ps.duration_minutes) as avg_duration,
             SUM(ps.final_price) as total_revenue
      FROM parking_spots sp
      LEFT JOIN parking_sessions ps ON ps.spot_id = sp.id ${where.replace('WHERE', 'AND')}
      GROUP BY sp.floor
      ORDER BY sp.floor
    `, params);

    const byType = await query(`
      SELECT sp.spot_type,
             COUNT(DISTINCT sp.id) as total_spots,
             COUNT(ps.id) FILTER (WHERE ps.status = 'completed') as total_sessions
      FROM parking_spots sp
      LEFT JOIN parking_sessions ps ON ps.spot_id = sp.id ${where.replace('WHERE', 'AND')}
      GROUP BY sp.spot_type
    `, params);

    res.json({ byFloor: byFloor.rows, byType: byType.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export PDF Report
router.get('/pdf', async (req, res) => {
  try {
    const { type = 'revenue', startDate, endDate } = req.query;
    const { conditions, params } = buildDateFilter(startDate, endDate, 'p.payment_time');
    const where = conditions.length ? 'WHERE p.status = \'approved\' AND ' + conditions.join(' AND ') : "WHERE p.status = 'approved'";

    const revenues = await query(`
      SELECT p.payment_method, COUNT(*) as count, SUM(p.amount) as total
      FROM payments p ${where}
      GROUP BY p.payment_method ORDER BY total DESC
    `, params);

    const sessions = await query(`
      SELECT ps.plate, ps.entry_time, ps.exit_time, ps.duration_minutes,
             ps.final_price, ps.status, sp.spot_number
      FROM parking_sessions ps
      LEFT JOIN parking_spots sp ON ps.spot_id = sp.id
      LEFT JOIN payments p ON p.session_id = ps.id
      ${where.replace(/p\./g, 'p.').replace('p.payment_time', 'ps.entry_time').replace("p.status = 'approved' AND ", '')}
      ORDER BY ps.entry_time DESC LIMIT 100
    `, params);

    const totalRevenue = revenues.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e').text('PARK SYSTEM', 40, 40);
    doc.fontSize(12).font('Helvetica').fillColor('#666').text('Relatório de Estacionamento', 40, 65);
    doc.fontSize(10).text(`Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}`, 40, 82);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 40, 96);

    // Summary box
    doc.rect(40, 115, 515, 70).fillAndStroke('#f0f4ff', '#4361ee');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e').text('RESUMO FINANCEIRO', 55, 125);
    doc.fontSize(20).fillColor('#4361ee').text(`R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, 55, 142);
    doc.fontSize(10).fillColor('#666').font('Helvetica').text('Receita Total no Período', 55, 168);
    doc.text(`${sessions.rows.length} sessões registradas`, 300, 142);
    doc.text(`Ticket médio: R$ ${sessions.rows.length ? (totalRevenue / sessions.rows.length).toFixed(2).replace('.', ',') : '0,00'}`, 300, 158);

    // Payment methods table
    let y = 205;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e').text('FORMAS DE PAGAMENTO', 40, y);
    y += 20;

    const methodLabels = { cash: 'Dinheiro', credit_card: 'Cartão Crédito', debit_card: 'Cartão Débito', pix: 'PIX', monthly_plan: 'Mensalista' };

    // Table header
    doc.rect(40, y, 515, 22).fill('#4361ee');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.text('FORMA', 55, y + 7);
    doc.text('TRANSAÇÕES', 250, y + 7);
    doc.text('VALOR TOTAL', 380, y + 7);
    doc.text('%', 490, y + 7);
    y += 22;

    revenues.rows.forEach((row, i) => {
      doc.rect(40, y, 515, 20).fill(i % 2 === 0 ? '#f8f9ff' : '#fff');
      doc.fontSize(9).font('Helvetica').fillColor('#333');
      doc.text(methodLabels[row.payment_method] || row.payment_method, 55, y + 6);
      doc.text(row.count, 250, y + 6);
      doc.text(`R$ ${parseFloat(row.total).toFixed(2).replace('.', ',')}`, 380, y + 6);
      doc.text(`${totalRevenue ? ((parseFloat(row.total) / totalRevenue) * 100).toFixed(1) : 0}%`, 490, y + 6);
      y += 20;
    });

    // Sessions table
    y += 20;
    if (y > 650) { doc.addPage(); y = 40; }
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e').text('SESSÕES RECENTES', 40, y);
    y += 20;

    doc.rect(40, y, 515, 22).fill('#4361ee');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
    ['PLACA', 'ENTRADA', 'SAÍDA', 'DURAÇÃO', 'VAGA', 'VALOR'].forEach((h, i) => {
      doc.text(h, 55 + i * 85, y + 7);
    });
    y += 22;

    sessions.rows.slice(0, 30).forEach((s, i) => {
      if (y > 750) { doc.addPage(); y = 40; }
      doc.rect(40, y, 515, 18).fill(i % 2 === 0 ? '#f8f9ff' : '#fff');
      doc.fontSize(8).font('Helvetica').fillColor('#333');
      doc.text(s.plate || '-', 55, y + 5);
      doc.text(s.entry_time ? new Date(s.entry_time).toLocaleString('pt-BR').slice(0, 14) : '-', 140, y + 5);
      doc.text(s.exit_time ? new Date(s.exit_time).toLocaleString('pt-BR').slice(0, 14) : '-', 225, y + 5);
      doc.text(`${s.duration_minutes || 0}min`, 310, y + 5);
      doc.text(s.spot_number || '-', 370, y + 5);
      doc.text(s.final_price ? `R$ ${parseFloat(s.final_price).toFixed(2).replace('.', ',')}` : '-', 430, y + 5);
      y += 18;
    });

    // Footer
    doc.fontSize(8).fillColor('#999').text('Park System - Relatório gerado automaticamente', 40, 800, { align: 'center', width: 515 });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
