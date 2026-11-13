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
const ACTIVE = ['PENDING', 'APPROVED'];
const TRANSITIONS = { PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'], APPROVED: ['CANCELLED'], REJECTED: [], CANCELLED: [] };

async function validateRef(Model, raw, label, res) {
    const id = parsePositiveInteger(raw);
    if (id === null) { res.status(400).json({ mensagem: `${label} inválido` }); return false; }
    if (!await Model.findOne({ id })) { res.status(404).json({ mensagem: `${label} não encontrado` }); return false; }
    return id;
}
function dateFilter(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) return null;
    return { start_datetime: { $gte: start, $lt: new Date(start.getTime() + 86400000) } };
}
function parseDateInput(raw, field, res) {
    if (raw === undefined || raw === null || raw === '') { res.status(400).json({ mensagem: `${field} é obrigatório` }); return false; }
    try { const date = asDate(raw); if (Number.isFinite(date.getTime())) return date; } catch { /* validação para 400 */ }
    res.status(400).json({ mensagem: `${field} inválido` });
    return false;
}
function sendAvailabilityError(res, problem) { return res.status(problem.status).json({ mensagem: problem.message }); }
function getStart(body) { return value(body, 'start_datetime', 'startDatetime') ?? (value(body, 'data', 'date') && value(body, 'horaInicio', 'start_time') ? `${value(body, 'data', 'date')}T${value(body, 'horaInicio', 'start_time')}:00` : undefined); }
function getEnd(body) { return value(body, 'end_datetime', 'endDatetime') ?? (value(body, 'data', 'date') && value(body, 'horaFim', 'end_time') ? `${value(body, 'data', 'date')}T${value(body, 'horaFim', 'end_time')}:00` : undefined); }
function isAdmin(req) { return req.user?.role === 'ADMIN'; }
function appendHistory(doc, action, actorId, note = null, fromStatus = null, toStatus = doc.status) {
    doc.history.push({ action, from_status: fromStatus, to_status: toStatus, changed_by: actorId, changed_at: new Date(), note: note || null });
}
function validateTransition(current, next, req, res, reason) {
    if (!TRANSITIONS[current].includes(next)) {
        res.status(409).json({ mensagem: `Transição de ${current} para ${next} não permitida.` });
        return false;
    }
    if (['APPROVED', 'REJECTED'].includes(next) && !isAdmin(req)) {
        res.status(403).json({ mensagem: 'Apenas ADMIN pode aprovar ou rejeitar reservas.' });
        return false;
    }
    if (next === 'REJECTED' && !String(reason || '').trim()) {
        res.status(400).json({ mensagem: 'Informe a justificativa obrigatória para rejeitar a reserva.' });
        return false;
    }
    return true;
}

router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.space_id || req.query.espacoId) query.space_id = Number(req.query.space_id || req.query.espacoId);
    if (req.query.user_id || req.query.usuarioId) query.user_id = Number(req.query.user_id || req.query.usuarioId);
    if (req.query.date || req.query.data) {
        const filter = dateFilter(req.query.date || req.query.data);
        if (!filter) return res.status(400).json({ mensagem: 'Data inválida' });
        Object.assign(query, filter);
    }
    if (req.query.status) query.status = normalizeStatus(req.query.status);
    return res.json(await Reserva.find(query).sort({ start_datetime: 1, id: 1 }));
}));

router.get('/options', asyncHandler(async (_req, res) => {
    const [users, spaces] = await Promise.all([
        Usuario.find().select('id name email role').sort({ name: 1 }).lean(),
        Espaco.find().select('id name capacity type is_active').sort({ name: 1 }).lean()
    ]);
    return res.json({ users, spaces });
}));

router.get('/data/:data', asyncHandler(async (req, res) => {
    const filter = dateFilter(req.params.data);
    if (!filter) return res.status(400).json({ mensagem: 'Data inválida' });
    return res.json(await Reserva.find(filter).sort({ start_datetime: 1, id: 1 }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Reserva.findOne({ id });
    if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    return res.json(doc);
}));

router.post('/', asyncHandler(async (req, res) => {
    const userId = await validateRef(Usuario, value(req.body, 'user_id', 'userId', 'usuarioId'), 'user_id', res);
    if (userId === false) return;
    if (!await Usuario.findOne({ id: userId, role: 'CLIENT' })) return res.status(400).json({ mensagem: 'A reserva deve ser associada a um usuário com perfil CLIENT.' });
    const spaceId = await validateRef(Espaco, value(req.body, 'space_id', 'spaceId', 'espacoId'), 'space_id', res);
    if (spaceId === false) return;
    const start = parseDateInput(getStart(req.body), 'start_datetime', res); if (start === false) return;
    const end = parseDateInput(getEnd(req.body), 'end_datetime', res); if (end === false) return;
    if (req.body.status !== undefined && normalizeStatus(req.body.status) !== 'PENDING') return res.status(400).json({ mensagem: 'Novas reservas devem iniciar com status PENDING. Use o fluxo de aprovação para alterar o estado.' });

    return withSpaceLocks([spaceId], async () => {
        const problem = await validateReservationAvailability({ spaceId, start, end, status: 'PENDING' });
        if (problem) return sendAvailabilityError(res, problem);
        const doc = await Reserva.create({
            id: await nextId('reservas'), user_id: userId, space_id: spaceId,
            start_datetime: start, end_datetime: end, status: 'PENDING',
            rejection_reason: null,
            history: [{ action: 'REQUESTED', from_status: null, to_status: 'PENDING', changed_by: req.user.id, changed_at: new Date(), note: String(req.body.note || '').trim() || null }]
        });
        return res.status(201).json(doc);
    });
}));

const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Reserva.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    const update = {};
    if (['user_id', 'userId', 'usuarioId'].some((key) => req.body[key] !== undefined)) {
        const ref = await validateRef(Usuario, value(req.body, 'user_id', 'userId', 'usuarioId'), 'user_id', res); if (ref === false) return;
        if (ref !== current.user_id && !await Usuario.findOne({ id: ref, role: 'CLIENT' })) return res.status(400).json({ mensagem: 'A reserva deve ser associada a um usuário com perfil CLIENT.' });
        update.user_id = ref;
    }
    if (['space_id', 'spaceId', 'espacoId'].some((key) => req.body[key] !== undefined)) {
        const ref = await validateRef(Espaco, value(req.body, 'space_id', 'spaceId', 'espacoId'), 'space_id', res); if (ref === false) return;
        update.space_id = ref;
    }
    if (getStart(req.body) !== undefined) { const date = parseDateInput(getStart(req.body), 'start_datetime', res); if (date === false) return; update.start_datetime = date; }
    if (getEnd(req.body) !== undefined) { const date = parseDateInput(getEnd(req.body), 'end_datetime', res); if (date === false) return; update.end_datetime = date; }
    if (req.body.status !== undefined) update.status = normalizeStatus(req.body.status);
    if (['rejection_reason', 'rejectionReason', 'motivoRejeicao'].some((key) => req.body[key] !== undefined)) update.rejection_reason = value(req.body, 'rejection_reason', 'rejectionReason', 'motivoRejeicao');

    const nextStatus = update.status ?? current.status;
    if (nextStatus !== current.status && !validateTransition(current.status, nextStatus, req, res, update.rejection_reason ?? current.rejection_reason)) return;
    if (nextStatus === 'REJECTED') {
        const reason = update.rejection_reason ?? current.rejection_reason;
        if (!String(reason || '').trim()) return res.status(400).json({ mensagem: 'Informe a justificativa obrigatória para rejeitar a reserva.' });
        update.rejection_reason = String(reason).trim();
    }
    const occupancyChanged = ['space_id', 'start_datetime', 'end_datetime', 'status'].some((key) => update[key] !== undefined);
    const requestedSpaceId = update.space_id ?? current.space_id;
    const operation = async () => {
        const latest = await Reserva.findOne({ id }); if (!latest) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
        const spaceId = update.space_id ?? latest.space_id;
        const start = update.start_datetime ?? latest.start_datetime;
        const end = update.end_datetime ?? latest.end_datetime;
        const status = update.status ?? latest.status;
        if (occupancyChanged) {
            const problem = await validateReservationAvailability({ spaceId, start, end, status, excludeId: latest._id });
            if (problem) return sendAvailabilityError(res, problem);
        }
        const previousStatus = latest.status;
        const previousSpaceId = latest.space_id;
        const previousStart = latest.start_datetime;
        const previousEnd = latest.end_datetime;
        latest.set(update);
        if (previousStatus !== status) {
            const action = status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : status === 'CANCELLED' ? 'CANCELLED' : 'UPDATED';
            appendHistory(latest, action, req.user.id, update.rejection_reason || String(req.body.note || '').trim(), previousStatus, status);
        } else if (previousSpaceId !== spaceId || previousStart.getTime() !== start.getTime() || previousEnd.getTime() !== end.getTime() || update.rejection_reason !== undefined) {
            appendHistory(latest, 'UPDATED', req.user.id, String(req.body.note || 'Dados da reserva atualizados').trim(), previousStatus, status);
        }
        await latest.save();
        return res.json(latest);
    };
    return occupancyChanged ? withSpaceLocks([current.space_id, requestedSpaceId], operation) : operation();
});
router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);

router.post('/:id/approve', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Reserva.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    req.body.status = 'APPROVED';
    return updateHandler(req, res, () => {});
}));
router.post('/:id/reject', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    req.body.status = 'REJECTED'; req.body.rejection_reason = req.body.rejection_reason || req.body.reason;
    return updateHandler(req, res, () => {});
}));

router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Reserva.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
    if (!ACTIVE.includes(current.status)) return res.status(409).json({ mensagem: 'Esta reserva já está encerrada e seu histórico deve ser preservado.' });
    return withSpaceLocks([current.space_id], async () => {
        const doc = await Reserva.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada' });
        if (!TRANSITIONS[doc.status].includes('CANCELLED')) return res.status(409).json({ mensagem: 'Esta reserva não pode mais ser cancelada.' });
        const from = doc.status; doc.status = 'CANCELLED';
        appendHistory(doc, 'CANCELLED', req.user.id, 'Cancelada pela operação de remoção, mantendo o histórico.', from, 'CANCELLED');
        await doc.save();
        return res.json({ mensagem: 'Reserva cancelada; o registro e seu histórico foram preservados.', reserva: doc });
    });
}));

module.exports = router;
