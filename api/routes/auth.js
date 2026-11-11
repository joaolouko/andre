const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, jwtSecret } = require('../middleware/auth');

const router = express.Router();
const dto = (user) => user.toJSON();

router.post('/login', asyncHandler(async (req, res) => {
    const email = String(req.body.email || req.body.login || '').trim().toLowerCase();
    const password = String(req.body.password ?? req.body.senha ?? '');
    if (!email || !password) return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });

    const usuario = await Usuario.findOne({ email }).select('+password_hash');
    if (!usuario || !await bcrypt.compare(password, usuario.password_hash)) {
        return res.status(401).json({ mensagem: 'Credenciais inválidas' });
    }
    let token;
    try {
        token = jwt.sign({ subId: usuario.id, role: usuario.role }, jwtSecret(), { algorithm: 'HS256', expiresIn: '8h', issuer: 'gestao-espacos-api' });
    } catch (error) {
        if (error.message === 'JWT_SECRET não configurado') return res.status(500).json({ mensagem: 'Autenticação não configurada' });
        throw error;
    }
    return res.json({ mensagem: 'Login realizado com sucesso', token, usuario: dto(usuario) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => res.json({ usuario: dto(req.user) })));
router.post('/logout', (_req, res) => res.json({ mensagem: 'Sessão encerrada com sucesso' }));
module.exports = router;
