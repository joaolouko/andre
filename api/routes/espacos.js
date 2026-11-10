const express = require('express');
const Espaco = require('../models/Espaco');
const Empresa = require('../models/Empresa');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');

const router = express.Router();

/** @swagger
 * /espacos:
 *   get:
 *     summary: Lista todos os espaços
 *     tags: [Espaços]
 *     responses:
 *       200:
 *         description: Lista de espaços
 */
router.get('/', asyncHandler(async (_req, res) => {
    res.json(await Espaco.find());
}));

/** @swagger
 * /espacos/{id}:
 *   get:
 *     summary: Busca um espaço pelo ID
 *     tags: [Espaços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Espaço encontrado
 *       404:
 *         description: Espaço não encontrado
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const espaco = await Espaco.findOne({ id });
    if (!espaco) return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    res.json(espaco);
}));

/** @swagger
 * /espacos:
 *   post:
 *     summary: Cria um novo espaço
 *     tags: [Espaços]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, descricao, capacidade, empresaId]
 *             properties:
 *               nome: { type: string, example: "Sala de Reuniões" }
 *               descricao: { type: string, example: "Sala para reuniões" }
 *               capacidade: { type: integer, example: 10 }
 *               empresaId: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Espaço criado
 */
router.post('/', asyncHandler(async (req, res) => {
    const empresaId = parsePositiveInteger(req.body.empresaId);
    if (empresaId === null) return res.status(400).json({ mensagem: 'empresaId inválido' });

    if (!await Empresa.findOne({ id: empresaId })) {
        return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    }

    const espaco = await Espaco.create({
        id: await nextId('espacos'),
        nome: req.body.nome,
        descricao: req.body.descricao,
        capacidade: req.body.capacidade,
        empresaId
    });
    res.status(201).json(espaco);
}));

/** @swagger
 * /espacos/{id}:
 *   put:
 *     summary: Atualiza um espaço
 *     tags: [Espaços]
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
 *             required: [nome, descricao, capacidade, empresaId]
 *             properties:
 *               nome: { type: string, example: "Sala de Reuniões" }
 *               descricao: { type: string, example: "Sala para reuniões" }
 *               capacidade: { type: integer, example: 10 }
 *               empresaId: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Espaço atualizado
 *       404:
 *         description: Espaço ou empresa não encontrada
 */
const updateEspacoHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const atual = await Espaco.findOne({ id });
    if (!atual) return res.status(404).json({ mensagem: 'Espaço não encontrado' });

    let empresaId = atual.empresaId;
    if (req.body.empresaId !== undefined) {
        empresaId = parsePositiveInteger(req.body.empresaId);
        if (empresaId === null) return res.status(400).json({ mensagem: 'empresaId inválido' });
        if (!await Empresa.findOne({ id: empresaId })) {
            return res.status(404).json({ mensagem: 'Empresa não encontrada' });
        }
    }

    const espaco = await Espaco.findByIdAndUpdate(
        atual._id,
        {
            nome: req.body.nome !== undefined ? req.body.nome : atual.nome,
            descricao: req.body.descricao !== undefined ? req.body.descricao : atual.descricao,
            capacidade: req.body.capacidade !== undefined ? req.body.capacidade : atual.capacidade,
            empresaId
        },
        { new: true, runValidators: true }
    );
    res.json(espaco);
});

router.put('/:id', updateEspacoHandler);
router.patch('/:id', updateEspacoHandler);

/** @swagger
 * /espacos/{id}:
 *   delete:
 *     summary: Remove um espaço
 *     tags: [Espaços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Espaço removido
 *       404:
 *         description: Espaço não encontrado
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const espaco = await Espaco.findOne({ id });
    if (!espaco) return res.status(404).json({ mensagem: 'Espaço não encontrado' });

    await Espaco.findByIdAndDelete(espaco._id);
    res.json({ mensagem: 'Espaço removido com sucesso' });
}));

module.exports = router;
