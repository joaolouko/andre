const express = require('express');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');

const router = express.Router();

/** @swagger
 * /reservas:
 *   get:
 *     summary: Lista todas as reservas
 *     tags: [Reservas]
 *     responses:
 *       200:
 *         description: Lista de reservas
 */
router.get('/', asyncHandler(async (_req, res) => {
    res.json(await Reserva.find());
}));

/** @swagger
 * /reservas/data/{data}:
 *   get:
 *     summary: Busca reservas por data
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Reservas para a data indicada
 */
router.get('/data/:data', asyncHandler(async (req, res) => {
    res.json(await Reserva.find({ data: req.params.data }));
}));

/** @swagger
 * /reservas/{id}:
 *   get:
 *     summary: Busca uma reserva pelo ID
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Reserva encontrada
 *       404:
 *         description: Reserva não encontrada
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const reserva = await Reserva.findOne({ id });
    if (!reserva) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    res.json(reserva);
}));

/** @swagger
 * /reservas:
 *   post:
 *     summary: Cria uma reserva
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuarioId, espacoId, data, horaInicio, horaFim]
 *             properties:
 *               usuarioId: { type: integer, example: 1 }
 *               espacoId: { type: integer, example: 1 }
 *               data: { type: string, format: date, example: "2026-10-01" }
 *               horaInicio: { type: string, example: "10:00" }
 *               horaFim: { type: string, example: "12:00" }
 *               status: { type: string, example: "confirmada", default: "confirmada" }
 *     responses:
 *       201:
 *         description: Reserva criada
 */
router.post('/', asyncHandler(async (req, res) => {
    const usuarioId = parsePositiveInteger(req.body.usuarioId);
    const espacoId = parsePositiveInteger(req.body.espacoId);
    if (usuarioId === null) return res.status(400).json({ mensagem: 'usuarioId inválido' });
    if (espacoId === null) return res.status(400).json({ mensagem: 'espacoId inválido' });

    if (!await Usuario.findOne({ id: usuarioId })) {
        return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    }
    if (!await Espaco.findOne({ id: espacoId })) {
        return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    }

    const reserva = await Reserva.create({
        id: await nextId('reservas'),
        usuarioId,
        espacoId,
        data: req.body.data,
        horaInicio: req.body.horaInicio,
        horaFim: req.body.horaFim,
        status: req.body.status || 'confirmada'
    });
    res.status(201).json(reserva);
}));

/** @swagger
 * /reservas/{id}:
 *   put:
 *     summary: Atualiza uma reserva
 *     tags: [Reservas]
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
 *             required: [usuarioId, espacoId, data, horaInicio, horaFim, status]
 *             properties:
 *               usuarioId: { type: integer, example: 1 }
 *               espacoId: { type: integer, example: 1 }
 *               data: { type: string, format: date, example: "2026-10-01" }
 *               horaInicio: { type: string, example: "10:00" }
 *               horaFim: { type: string, example: "12:00" }
 *               status: { type: string, example: "confirmada" }
 *     responses:
 *       200:
 *         description: Reserva atualizada
 *       404:
 *         description: Reserva, usuário ou espaço não encontrado
 */
const updateReservaHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const atual = await Reserva.findOne({ id });
    if (!atual) return res.status(404).json({ mensagem: 'Reserva não encontrada' });

    let usuarioId = atual.usuarioId;
    if (req.body.usuarioId !== undefined) {
        usuarioId = parsePositiveInteger(req.body.usuarioId);
        if (usuarioId === null) return res.status(400).json({ mensagem: 'usuarioId inválido' });
        if (!await Usuario.findOne({ id: usuarioId })) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }
    }

    let espacoId = atual.espacoId;
    if (req.body.espacoId !== undefined) {
        espacoId = parsePositiveInteger(req.body.espacoId);
        if (espacoId === null) return res.status(400).json({ mensagem: 'espacoId inválido' });
        if (!await Espaco.findOne({ id: espacoId })) {
            return res.status(404).json({ mensagem: 'Espaço não encontrado' });
        }
    }

    const reserva = await Reserva.findByIdAndUpdate(
        atual._id,
        {
            usuarioId,
            espacoId,
            data: req.body.data !== undefined ? req.body.data : atual.data,
            horaInicio: req.body.horaInicio !== undefined ? req.body.horaInicio : atual.horaInicio,
            horaFim: req.body.horaFim !== undefined ? req.body.horaFim : atual.horaFim,
            status: req.body.status !== undefined ? req.body.status : atual.status
        },
        { new: true, runValidators: true }
    );
    res.json(reserva);
});

router.put('/:id', updateReservaHandler);
router.patch('/:id', updateReservaHandler);

/** @swagger
 * /reservas/{id}:
 *   delete:
 *     summary: Remove uma reserva
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Reserva removida
 *       404:
 *         description: Reserva não encontrada
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });

    const reserva = await Reserva.findOne({ id });
    if (!reserva) return res.status(404).json({ mensagem: 'Reserva não encontrada' });

    await Reserva.findByIdAndDelete(reserva._id);
    res.json({ mensagem: 'Reserva removida com sucesso' });
}));

module.exports = router;
