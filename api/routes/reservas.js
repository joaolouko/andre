const express = require('express');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { value, normalizeStatus, asDate } = require('../utils/canonicalize');
const router = express.Router();
async function validateRef(Model, raw, label, res) {
    const id = parsePositiveInteger(raw); if (id === null) { res.status(400).json({ mensagem: `${label} inválido` }); return false; }
    if (!await Model.findOne({ id })) { res.status(404).json({ mensagem: `${label} não encontrado` }); return false; }
    return id;
}
function dateFilter(date) {
    const start = new Date(`${date}T00:00:00.000Z`); if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + 86400000); return { start_datetime: { $gte: start, $lt: end } };
}
router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.space_id || req.query.espacoId) query.space_id = Number(req.query.space_id || req.query.espacoId);
    if (req.query.user_id || req.query.usuarioId) query.user_id = Number(req.query.user_id || req.query.usuarioId);
    if (req.query.date || req.query.data) Object.assign(query, dateFilter(req.query.date || req.query.data) || {});
    return res.json(await Reserva.find(query).sort({ id: 1 }));
}));
router.get('/data/:data', asyncHandler(async (req, res) => {
    const filter = dateFilter(req.params.data); if (!filter) return res.status(400).json({ mensagem: 'Data inválida' });
    return res.json(await Reserva.find(filter).sort({ id: 1 }));
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Reserva.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' }); return res.json(doc);
}));
function getStart(body) { return value(body, 'start_datetime', 'startDatetime') ?? (value(body, 'data', 'date') && value(body, 'horaInicio', 'start_time') ? `${value(body, 'data', 'date')}T${value(body, 'horaInicio', 'start_time')}:00` : undefined); }
function getEnd(body) { return value(body, 'end_datetime', 'endDatetime') ?? (value(body, 'data', 'date') && value(body, 'horaFim', 'end_time') ? `${value(body, 'data', 'date')}T${value(body, 'horaFim', 'end_time')}:00` : undefined); }
router.post('/', asyncHandler(async (req, res) => {
    const userId = await validateRef(Usuario, value(req.body, 'user_id', 'userId', 'usuarioId'), 'user_id', res); if (userId === false) return;
    const spaceId = await validateRef(Espaco, value(req.body, 'space_id', 'spaceId', 'espacoId'), 'space_id', res); if (spaceId === false) return;
    const start = asDate(getStart(req.body)); const end = asDate(getEnd(req.body));
    if (end <= start) return res.status(400).json({ mensagem: 'end_datetime deve ser posterior a start_datetime' });
    const doc = await Reserva.create({ id: await nextId('reservas'), user_id: userId, space_id: spaceId, start_datetime: start, end_datetime: end,
        status: normalizeStatus(req.body.status), rejection_reason: value(req.body, 'rejection_reason', 'rejectionReason', 'motivoRejeicao') ?? null });
    return res.status(201).json(doc);
}));
const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Reserva.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    const update = {};
    if (['user_id', 'userId', 'usuarioId'].some((k) => req.body[k] !== undefined)) { const ref = await validateRef(Usuario, value(req.body, 'user_id', 'userId', 'usuarioId'), 'user_id', res); if (ref === false) return; update.user_id = ref; }
    if (['space_id', 'spaceId', 'espacoId'].some((k) => req.body[k] !== undefined)) { const ref = await validateRef(Espaco, value(req.body, 'space_id', 'spaceId', 'espacoId'), 'space_id', res); if (ref === false) return; update.space_id = ref; }
    if (getStart(req.body) !== undefined) update.start_datetime = asDate(getStart(req.body));
    if (getEnd(req.body) !== undefined) update.end_datetime = asDate(getEnd(req.body));
    if (req.body.status !== undefined) update.status = normalizeStatus(req.body.status);
    if (['rejection_reason', 'rejectionReason', 'motivoRejeicao'].some((k) => req.body[k] !== undefined)) update.rejection_reason = value(req.body, 'rejection_reason', 'rejectionReason', 'motivoRejeicao');
    if ((update.end_datetime || current.end_datetime) <= (update.start_datetime || current.start_datetime)) return res.status(400).json({ mensagem: 'end_datetime deve ser posterior a start_datetime' });
    const doc = await Reserva.findByIdAndUpdate(current._id, update, { new: true, runValidators: true }); return res.json(doc);
});
router.put('/:id', updateHandler); router.patch('/:id', updateHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Reserva.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    await Reserva.findByIdAndDelete(doc._id); return res.json({ mensagem: 'Reserva removida com sucesso' });
}));
module.exports = router;
