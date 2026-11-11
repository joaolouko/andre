const express = require('express');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { value, normalizeStatus, asDate } = require('../utils/canonicalize');
const { validateReservationAvailability, withSpaceLocks } = require('../utils/reservationAvailability');
const router = express.Router();

async function validateRef(Model, raw, label, res) {
    const id = parsePositiveInteger(raw);
    if (id === null) { res.status(400).json({ mensagem: `${label} inválido` }); return false; }
    if (!await Model.findOne({ id })) { res.status(404).json({ mensagem: `${label} não encontrado` }); return false; }
    return id;
}

function dateFilter(date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + 86400000);
    return { start_datetime: { $gte: start, $lt: end } };
}

function parseDateInput(raw, field, res) {
    if (raw === undefined || raw === null || raw === '') {
        res.status(400).json({ mensagem: `${field} é obrigatório` });
        return false;
    }
    try {
        const date = asDate(raw);
        if (Number.isFinite(date.getTime())) return date;
    } catch { /* Retorna 400 para valores inválidos enviados pelo cliente. */ }
    res.status(400).json({ mensagem: `${field} inválido` });
    return false;
}

function sendAvailabilityError(res, problem) {
    return res.status(problem.status).json({ mensagem: problem.message });
}

router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.space_id || req.query.espacoId) query.space_id = Number(req.query.space_id || req.query.espacoId);
    if (req.query.user_id || req.query.usuarioId) query.user_id = Number(req.query.user_id || req.query.usuarioId);
    if (req.query.date || req.query.data) Object.assign(query, dateFilter(req.query.date || req.query.data) || {});
    return res.json(await Reserva.find(query).sort({ id: 1 }));
}));

router.get('/data/:data', asyncHandler(async (req, res) => {
    const filter = dateFilter(req.params.data);
    if (!filter) return res.status(400).json({ mensagem: 'Data inválida' });
    return res.json(await Reserva.find(filter).sort({ id: 1 }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Reserva.findOne({ id });
    if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    return res.json(doc);
}));

function getStart(body) {
    return value(body, 'start_datetime', 'startDatetime')
        ?? (value(body, 'data', 'date') && value(body, 'horaInicio', 'start_time')
            ? `${value(body, 'data', 'date')}T${value(body, 'horaInicio', 'start_time')}:00`
            : undefined);
}
function getEnd(body) {
    return value(body, 'end_datetime', 'endDatetime')
        ?? (value(body, 'data', 'date') && value(body, 'horaFim', 'end_time')
            ? `${value(body, 'data', 'date')}T${value(body, 'horaFim', 'end_time')}:00`
            : undefined);
}

router.post('/', asyncHandler(async (req, res) => {
    const userId = await validateRef(Usuario, value(req.body, 'user_id', 'userId', 'usuarioId'), 'user_id', res);
    if (userId === false) return;
    const spaceId = await validateRef(Espaco, value(req.body, 'space_id', 'spaceId', 'espacoId'), 'space_id', res);
    if (spaceId === false) return;

    const start = parseDateInput(getStart(req.body), 'start_datetime', res);
    if (start === false) return;
    const end = parseDateInput(getEnd(req.body), 'end_datetime', res);
    if (end === false) return;
    const status = normalizeStatus(req.body.status);

    return withSpaceLocks([spaceId], async () => {
        const problem = await validateReservationAvailability({ spaceId, start, end, status });
        if (problem) return sendAvailabilityError(res, problem);
        const doc = await Reserva.create({
            id: await nextId('reservas'),
            user_id: userId,
            space_id: spaceId,
            start_datetime: start,
            end_datetime: end,
            status,
            rejection_reason: value(req.body, 'rejection_reason', 'rejectionReason', 'motivoRejeicao') ?? null
        });
        return res.status(201).json(doc);
    });
}));

const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Reserva.findOne({ id });
    if (!current) return res.status(404).json({ mensagem: 'Reserva não encontrada' });

    const update = {};
    if (['user_id', 'userId', 'usuarioId'].some((key) => req.body[key] !== undefined)) {
        const ref = await validateRef(Usuario, value(req.body, 'user_id', 'userId', 'usuarioId'), 'user_id', res);
        if (ref === false) return;
        update.user_id = ref;
    }
    if (['space_id', 'spaceId', 'espacoId'].some((key) => req.body[key] !== undefined)) {
        const ref = await validateRef(Espaco, value(req.body, 'space_id', 'spaceId', 'espacoId'), 'space_id', res);
        if (ref === false) return;
        update.space_id = ref;
    }
    if (getStart(req.body) !== undefined) {
        const start = parseDateInput(getStart(req.body), 'start_datetime', res);
        if (start === false) return;
        update.start_datetime = start;
    }
    if (getEnd(req.body) !== undefined) {
        const end = parseDateInput(getEnd(req.body), 'end_datetime', res);
        if (end === false) return;
        update.end_datetime = end;
    }
    if (req.body.status !== undefined) update.status = normalizeStatus(req.body.status);
    if (['rejection_reason', 'rejectionReason', 'motivoRejeicao'].some((key) => req.body[key] !== undefined)) {
        update.rejection_reason = value(req.body, 'rejection_reason', 'rejectionReason', 'motivoRejeicao');
    }

    const occupancyChanged = ['space_id', 'start_datetime', 'end_datetime', 'status'].some((key) => update[key] !== undefined);
    if (!occupancyChanged) {
        const doc = await Reserva.findByIdAndUpdate(current._id, update, { new: true, runValidators: true });
        return res.json(doc);
    }

    const requestedSpaceId = update.space_id ?? current.space_id;
    const lockSpaceIds = [current.space_id, requestedSpaceId];
    return withSpaceLocks(lockSpaceIds, async () => {
        const latest = await Reserva.findOne({ id });
        if (!latest) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
        const spaceId = update.space_id ?? latest.space_id;
        if (!lockSpaceIds.includes(Number(latest.space_id)) || !lockSpaceIds.includes(Number(spaceId))) {
            return res.status(409).json({ mensagem: 'A reserva foi alterada em paralelo. Recarregue e tente novamente.' });
        }
        const start = update.start_datetime ?? latest.start_datetime;
        const end = update.end_datetime ?? latest.end_datetime;
        const status = update.status ?? latest.status;
        const problem = await validateReservationAvailability({ spaceId, start, end, status, excludeId: latest._id });
        if (problem) return sendAvailabilityError(res, problem);
        const doc = await Reserva.findByIdAndUpdate(latest._id, update, { new: true, runValidators: true });
        return res.json(doc);
    });
});

router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);

router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Reserva.findOne({ id });
    if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    await Reserva.findByIdAndDelete(doc._id);
    return res.json({ mensagem: 'Reserva removida com sucesso' });
}));

module.exports = router;
