const express = require('express');
const Empresa = require('../models/Empresa');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');

const router = express.Router();

/** @swagger
 * /empresas:
 *   get:
 *     summary: Lista todas as empresas
 *     tags: [Empresas]
 *     responses:
 *       200:
 *         description: Lista de empresas
 */
router.get('/', asyncHandler(async (_req, res) => {
    res.json(await Empresa.find());
}));

/** @swagger
 * /empresas/{id}:
 *   get:
 *     summary: Busca uma empresa pelo ID
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *       404:
 *         description: Empresa não encontrada
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const empresa = await Empresa.findOne({ id });
    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    res.json(empresa);
}));

/** @swagger
 * /empresas:
 *   post:
 *     summary: Cria uma nova empresa
 *     tags: [Empresas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, cnpj, email, telefone]
 *             properties:
 *               nome: { type: string, example: "Empresa XYZ" }
 *               cnpj: { type: string, example: "12.345.678/0001-90" }
 *               email: { type: string, example: "contato@empresa.com" }
 *               telefone: { type: string, example: "4833333333" }
 *     responses:
 *       201:
 *         description: Empresa criada
 */
router.post('/', asyncHandler(async (req, res) => {
    const empresa = await Empresa.create({
        id: await nextId('empresas'),
        nome: req.body.nome,
        cnpj: req.body.cnpj,
        email: req.body.email,
        telefone: req.body.telefone
    });
    res.status(201).json(empresa);
}));

/** @swagger
 * /empresas/{id}:
 *   put:
 *     summary: Atualiza uma empresa
 *     tags: [Empresas]
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
 *             required: [nome, cnpj, email, telefone]
 *             properties:
 *               nome: { type: string, example: "Empresa XYZ" }
 *               cnpj: { type: string, example: "12.345.678/0001-90" }
 *               email: { type: string, example: "contato@empresa.com" }
 *               telefone: { type: string, example: "4833333333" }
 *     responses:
 *       200:
 *         description: Empresa atualizada
 *       404:
 *         description: Empresa não encontrada
 */
const updateEmpresaHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const atual = await Empresa.findOne({ id });
    if (!atual) return res.status(404).json({ mensagem: 'Empresa não encontrada' });

    const empresa = await Empresa.findByIdAndUpdate(
        atual._id,
        {
            nome: req.body.nome !== undefined ? req.body.nome : atual.nome,
            cnpj: req.body.cnpj !== undefined ? req.body.cnpj : atual.cnpj,
            email: req.body.email !== undefined ? req.body.email : atual.email,
            telefone: req.body.telefone !== undefined ? req.body.telefone : atual.telefone
        },
        { new: true, runValidators: true }
    );
    res.json(empresa);
});

router.put('/:id', updateEmpresaHandler);
router.patch('/:id', updateEmpresaHandler);

/** @swagger
 * /empresas/{id}:
 *   delete:
 *     summary: Remove uma empresa
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Empresa removida
 *       404:
 *         description: Empresa não encontrada
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const empresa = await Empresa.findOne({ id });
    if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada' });

    await Empresa.findByIdAndDelete(empresa._id);
    res.json({ mensagem: 'Empresa removida com sucesso' });
}));

module.exports = router;
