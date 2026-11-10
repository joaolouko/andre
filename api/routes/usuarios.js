const express = require('express');
const Usuario = require('../models/Usuario');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');

const router = express.Router();

/** @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get('/', asyncHandler(async (_req, res) => {
    const usuarios = await Usuario.find();
    res.json(usuarios);
}));

/** @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const usuario = await Usuario.findOne({ id });
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    res.json(usuario);
}));

/** @swagger
 * /usuarios:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, telefone]
 *             properties:
 *               nome: { type: string }
 *               email: { type: string }
 *               telefone: { type: string }
 *     responses:
 *       201:
 *         description: Usuário criado
 */
router.post('/', asyncHandler(async (req, res) => {
    const usuario = await Usuario.create({
        id: await nextId('usuarios'),
        nome: req.body.nome,
        email: req.body.email,
        telefone: req.body.telefone,
        ...(req.body.senha ? { senha: req.body.senha } : {})
    });
    res.status(201).json(usuario);
}));

/** @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, telefone]
 *             properties:
 *               nome: { type: string, example: "João da Silva" }
 *               email: { type: string, example: "joao@email.com" }
 *               telefone: { type: string, example: "48999999999" }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       404:
 *         description: Usuário não encontrado
 */
const updateUsuarioHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const atual = await Usuario.findOne({ id });
    if (!atual) return res.status(404).json({ mensagem: 'Usuário não encontrado' });

    const updateData = {
        nome: req.body.nome !== undefined ? req.body.nome : atual.nome,
        email: req.body.email !== undefined ? req.body.email : atual.email,
        telefone: req.body.telefone !== undefined ? req.body.telefone : atual.telefone
    };
    if (req.body.senha) {
        updateData.senha = req.body.senha;
    }

    const usuario = await Usuario.findByIdAndUpdate(
        atual._id,
        updateData,
        { new: true, runValidators: true }
    );
    res.json(usuario);
});

router.put('/:id', updateUsuarioHandler);
router.patch('/:id', updateUsuarioHandler);

/** @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuário removido
 *       404:
 *         description: Usuário não encontrado
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const usuario = await Usuario.findOne({ id });
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado' });

    await Usuario.findByIdAndDelete(usuario._id);
    res.json({ mensagem: 'Usuário removido com sucesso' });
}));

module.exports = router;
