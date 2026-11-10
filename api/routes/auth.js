const express = require('express');
const Usuario = require('../models/Usuario');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica um usuário pelo email e senha
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "joao@email.com"
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Autenticação realizada com sucesso
 *       400:
 *         description: Parâmetros obrigatórios ausentes
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', asyncHandler(async (req, res) => {
    const email = (req.body.email || req.body.login || '').toString().trim();
    const senha = (req.body.senha || req.body.password || '').toString();

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
    }

    const usuario = await Usuario.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (!usuario) {
        return res.status(401).json({ mensagem: 'Credenciais inválidas: usuário não encontrado' });
    }

    const senhaArmazenada = usuario.senha || '123456';
    if (senha !== senhaArmazenada) {
        return res.status(401).json({ mensagem: 'Credenciais inválidas: senha incorreta' });
    }

    const tokenPayload = {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        createdAt: Date.now()
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    res.json({
        mensagem: 'Login realizado com sucesso',
        token,
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            telefone: usuario.telefone
        }
    });
}));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retorna as informações do usuário autenticado atual
 *     tags: [Autenticação]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: false
 *         schema:
 *           type: string
 *           example: "Bearer <token>"
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *       401:
 *         description: Não autorizado ou token ausente/inválido
 */
router.get('/me', asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensagem: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        if (!payload || !payload.id) {
            return res.status(401).json({ mensagem: 'Token inválido' });
        }

        const usuario = await Usuario.findOne({ id: payload.id });
        if (!usuario) {
            return res.status(401).json({ mensagem: 'Usuário não encontrado' });
        }

        res.json({
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone
            }
        });
    } catch {
        return res.status(401).json({ mensagem: 'Token malformado ou inválido' });
    }
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Encerra a sessão do usuário
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Sessão encerrada com sucesso
 */
router.post('/logout', asyncHandler(async (_req, res) => {
    res.json({ mensagem: 'Sessão encerrada com sucesso' });
}));

module.exports = router;

