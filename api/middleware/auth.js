const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

function jwtSecret() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado');
    return process.env.JWT_SECRET;
}

async function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ mensagem: 'Token de autenticação não fornecido' });
    try {
        const payload = jwt.verify(match[1], jwtSecret(), { algorithms: ['HS256'] });
        if (!Number.isSafeInteger(payload.subId) || payload.subId < 1) return res.status(401).json({ mensagem: 'Token inválido' });
        const usuario = await Usuario.findOne({ id: payload.subId });
        if (!usuario) return res.status(401).json({ mensagem: 'Usuário não encontrado' });
        req.user = usuario;
        return next();
    } catch (error) {
        if (error.message === 'JWT_SECRET não configurado') return res.status(500).json({ mensagem: 'Autenticação não configurada' });
        return res.status(401).json({ mensagem: 'Token malformado ou inválido' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ mensagem: 'Não autenticado' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ mensagem: 'Acesso não permitido' });
        return next();
    };
}

module.exports = { authenticate, authorize, jwtSecret };
