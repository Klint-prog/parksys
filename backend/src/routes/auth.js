const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Conta desativada. Contate o administrador.' });
    }

    // Check password - support both bcrypt and pgcrypto hashed
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } catch {
      // pgcrypto format - verify via DB
      const verifyResult = await query(
        "SELECT (password_hash = crypt($1, password_hash)) as valid FROM users WHERE id = $2",
        [password, user.id]
      );
      passwordValid = verifyResult.rows[0]?.valid;
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// Logout (client-side token removal, but log it)
router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    let valid = false;
    try {
      valid = await bcrypt.compare(currentPassword, user.password_hash);
    } catch {
      const verifyResult = await query(
        "SELECT (password_hash = crypt($1, password_hash)) as valid FROM users WHERE id = $2",
        [currentPassword, req.user.id]
      );
      valid = verifyResult.rows[0]?.valid;
    }

    if (!valid) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

module.exports = router;
