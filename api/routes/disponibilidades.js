const express = require('express');
const Disponibilidade = require('../models/Disponibilidade');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');

const router = express.Router();

/** @swagger
 * /disponibilidades:
 *   get:
 *     summary: Lista todas as disponibilidades
 *     tags: [Disponibilidades]
 *     responses:
 *       200:
 *         description: Lista de disponibilidades
 */
router.get('/', asyncHandler(async (_req, res) => {
    res.json(await Disponibilidade.find());
}));

/** @swagger
 * /disponibilidades/data/{data}:
 *   get:
 *     summary: Busca disponibilidades por data
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista para a data indicada
 */
router.get('/data/:data', asyncHandler(async (req, res) => {
    res.json(await Disponibilidade.find({ data: req.params.data }));
}));

/** @swagger
 * /disponibilidades/{id}:
 *   get:
 *     summary: Busca uma disponibilidade pelo ID
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Disponibilidade encontrada
 *       404:
 *         description: Disponibilidade não encontrada
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const disponibilidade = await Disponibilidade.findOne({ id });
    if (!disponibilidade) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
    res.json(disponibilidade);
}));

/** @swagger
 * /disponibilidades:
 *   post:
 *     summary: Cria uma disponibilidade
 *     tags: [Disponibilidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [espacoId, data, horaInicio, horaFim]
 *             properties:
 *               espacoId: { type: integer, example: 1 }
 *               data: { type: string, format: date, example: "2026-10-01" }
 *               horaInicio: { type: string, example: "08:00" }
 *               horaFim: { type: string, example: "18:00" }
 *     responses:
 *       201:
 *         description: Disponibilidade criada
 */
router.post('/', asyncHandler(async (req, res) => {
    const espacoId = parsePositiveInteger(req.body.espacoId);
    if (espacoId === null) return res.status(400).json({ mensagem: 'espacoId inválido' });
    if (!await Espaco.findOne({ id: espacoId })) {
        return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    }

    const disponibilidade = await Disponibilidade.create({
        id: await nextId('disponibilidades'),
        espacoId,
        data: req.body.data,
        horaInicio: req.body.horaInicio,
        horaFim: req.body.horaFim
    });
    res.status(201).json(disponibilidade);
}));

/** @swagger
 * /disponibilidades/{id}:
 *   put:
 *     summary: Atualiza uma disponibilidade
 *     tags: [Disponibilidades]
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
 *             required: [espacoId, data, horaInicio, horaFim]
 *             properties:
 *               espacoId: { type: integer, example: 1 }
 *               data: { type: string, format: date, example: "2026-10-01" }
 *               horaInicio: { type: string, example: "08:00" }
 *               horaFim: { type: string, example: "18:00" }
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada
 *       404:
 *         description: Disponibilidade ou espaço não encontrado
 */
const updateDisponibilidadeHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const atual = await Disponibilidade.findOne({ id });
    if (!atual) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });

    let espacoId = atual.espacoId;
    if (req.body.espacoId !== undefined) {
        espacoId = parsePositiveInteger(req.body.espacoId);
        if (espacoId === null) return res.status(400).json({ mensagem: 'espacoId inválido' });
        if (!await Espaco.findOne({ id: espacoId })) {
            return res.status(404).json({ mensagem: 'Espaço não encontrado' });
        }
    }

    const disponibilidade = await Disponibilidade.findByIdAndUpdate(
        atual._id,
        {
            espacoId,
            data: req.body.data !== undefined ? req.body.data : atual.data,
            horaInicio: req.body.horaInicio !== undefined ? req.body.horaInicio : atual.horaInicio,
            horaFim: req.body.horaFim !== undefined ? req.body.horaFim : atual.horaFim
        },
        { new: true, runValidators: true }
    );
    res.json(disponibilidade);
});

router.put('/:id', updateDisponibilidadeHandler);
router.patch('/:id', updateDisponibilidadeHandler);

/** @swagger
 * /disponibilidades/{id}:
 *   delete:
 *     summary: Remove uma disponibilidade
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Disponibilidade removida
 *       404:
 *         description: Disponibilidade não encontrada
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const disponibilidade = await Disponibilidade.findOne({ id });
    if (!disponibilidade) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });

    await Disponibilidade.findByIdAndDelete(disponibilidade._id);
    res.json({ mensagem: 'Disponibilidade removida com sucesso' });
}));

module.exports = router;
