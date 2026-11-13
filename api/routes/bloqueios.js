const express = require('express');
const Bloqueio = require('../models/Bloqueio');
const Reserva = require('../models/Reserva');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { asDate } = require('../utils/canonicalize');
const { withSpaceLocks } = require('../utils/reservationAvailability');
const router = express.Router();

function dateValue(value, field, res) {
    try { const date = asDate(value); if (Number.isFinite(date.getTime())) return date; } catch { /* 400 abaixo */ }
    res.status(400).json({ mensagem: `${field} inválido.` });
    return false;
}
async function validateSpace(spaceId, res) {
    const id = parsePositiveInteger(spaceId);
    if (id === null) { res.status(400).json({ mensagem: 'space_id inválido.' }); return false; }
    if (!await Espaco.findOne({ id })) { res.status(404).json({ mensagem: 'Espaço não encontrado.' }); return false; }
    return id;
}
async function checkOverlap({ spaceId, start, end, excludeId }) {
    const [reservation, block] = await Promise.all([
        Reserva.findOne({ space_id: spaceId, status: { $in: ['PENDING', 'APPROVED'] }, start_datetime: { $lt: end }, end_datetime: { $gt: start } }).select('id').lean(),
        Bloqueio.findOne({ space_id: spaceId, ...(excludeId ? { _id: { $ne: excludeId } } : {}), start_datetime: { $lt: end }, end_datetime: { $gt: start } }).select('id title').lean()
    ]);
    if (reservation) return `Há uma reserva ativa (#${reservation.id}) sobreposta a este bloqueio.`;
    if (block) return `Há um bloqueio/evento (${block.title}) sobreposto a este período.`;
    return null;
}
router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.space_id !== undefined) {
        const spaceId = parsePositiveInteger(req.query.space_id);
        if (spaceId === null) return res.status(400).json({ mensagem: 'space_id inválido.' });
        query.space_id = spaceId;
    }
    if (req.query.kind) query.kind = req.query.kind;
    if (req.query.from || req.query.to) {
        const start = req.query.from ? new Date(req.query.from) : new Date(0);
        const end = req.query.to ? new Date(req.query.to) : new Date('9999-12-31T23:59:59Z');
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return res.status(400).json({ mensagem: 'Intervalo de datas inválido.' });
        query.start_datetime = { $lt: end }; query.end_datetime = { $gt: start };
    }
    return res.json(await Bloqueio.find(query).sort({ start_datetime: 1 }));
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido.' });
    const doc = await Bloqueio.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Bloqueio não encontrado.' });
    return res.json(doc);
}));
router.post('/', asyncHandler(async (req, res) => {
    const spaceId = await validateSpace(req.body.space_id, res); if (spaceId === false) return;
    const start = dateValue(req.body.start_datetime, 'start_datetime', res); if (start === false) return;
    const end = dateValue(req.body.end_datetime, 'end_datetime', res); if (end === false) return;
    if (end <= start) return res.status(400).json({ mensagem: 'end_datetime deve ser posterior ao início.' });
    return withSpaceLocks([spaceId], async () => {
        const conflict = await checkOverlap({ spaceId, start, end });
        if (conflict) return res.status(409).json({ mensagem: conflict });
        const doc = await Bloqueio.create({
            id: await nextId('bloqueios'), space_id: spaceId,
            kind: req.body.kind, title: req.body.title, description: req.body.description || '',
            start_datetime: start, end_datetime: end, created_by: req.user.id
        });
        return res.status(201).json(doc);
    });
}));
const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido.' });
    const current = await Bloqueio.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Bloqueio não encontrado.' });
    const update = {};
    if (req.body.space_id !== undefined) { const space = await validateSpace(req.body.space_id, res); if (space === false) return; update.space_id = space; }
    for (const field of ['kind', 'title', 'description']) if (req.body[field] !== undefined) update[field] = req.body[field];
    if (req.body.start_datetime !== undefined) { const date = dateValue(req.body.start_datetime, 'start_datetime', res); if (date === false) return; update.start_datetime = date; }
    if (req.body.end_datetime !== undefined) { const date = dateValue(req.body.end_datetime, 'end_datetime', res); if (date === false) return; update.end_datetime = date; }
    const spaceId = update.space_id ?? current.space_id;
    const start = update.start_datetime ?? current.start_datetime;
    const end = update.end_datetime ?? current.end_datetime;
    if (end <= start) return res.status(400).json({ mensagem: 'end_datetime deve ser posterior ao início.' });
    return withSpaceLocks([current.space_id, spaceId], async () => {
        const conflict = await checkOverlap({ spaceId, start, end, excludeId: current._id });
        if (conflict) return res.status(409).json({ mensagem: conflict });
        current.set(update); await current.save(); return res.json(current);
    });
});
router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido.' });
    const doc = await Bloqueio.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Bloqueio não encontrado.' });
    await Bloqueio.findByIdAndDelete(doc._id);
    return res.json({ mensagem: 'Bloqueio removido.' });
}));
module.exports = router;
