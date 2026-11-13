const express = require('express');
const Reserva = require('../models/Reserva');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Bloqueio = require('../models/Bloqueio');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parsePositiveInteger } = require('../utils/ids');
const { getBusinessDayBounds, getZonedDateTime, zonedDateTimeToUtc, validateReservationAvailability, withSpaceLocks } = require('../utils/reservationAvailability');
const router = express.Router();

function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function parseBusinessDateTime(date, time) {
    if (!validDate(date) || typeof time !== 'string') return null;
    return zonedDateTimeToUtc(date, time);
}
function appendHistory(doc, action, actorId, fromStatus, toStatus, note = null) {
    doc.history.push({ action, from_status: fromStatus, to_status: toStatus, changed_by: actorId, changed_at: new Date(), note });
}

router.get('/spaces', asyncHandler(async (_req, res) => {
    const spaces = await Espaco.find({ is_active: true }).sort({ name: 1 });
    return res.json(spaces);
}));

router.get('/availability', asyncHandler(async (req, res) => {
    const spaceId = parsePositiveInteger(req.query.space_id);
    const date = String(req.query.date || '');
    if (spaceId === null || !validDate(date)) return res.status(400).json({ mensagem: 'Informe space_id e date válidos.' });
    const space = await Espaco.findOne({ id: spaceId, is_active: true });
    if (!space) return res.status(404).json({ mensagem: 'Espaço ativo não encontrado.' });
    const zoned = getZonedDateTime(parseBusinessDateTime(date, '12:00'));
    const bounds = getBusinessDayBounds(date);
    if (!zoned || !bounds) return res.status(400).json({ mensagem: 'Data inválida para o fuso de negócio.' });
    const [windows, reservations, blocks] = await Promise.all([
        Disponibilidade.find({ space_id: spaceId, $or: [{ valid_on: date }, { valid_on: null, day_of_week: zoned.dayOfWeek }] }).sort({ start_time: 1 }),
        Reserva.find({ space_id: spaceId, status: { $in: ['PENDING', 'APPROVED'] }, start_datetime: { $lt: bounds.end }, end_datetime: { $gt: bounds.start } }).select('start_datetime end_datetime status').sort({ start_datetime: 1 }),
        Bloqueio.find({ space_id: spaceId, start_datetime: { $lt: bounds.end }, end_datetime: { $gt: bounds.start } }).select('kind title start_datetime end_datetime').sort({ start_datetime: 1 })
    ]);
    return res.json({ space, date, day_of_week: zoned.dayOfWeek, windows, reservations, blocks });
}));

router.get('/reservations', asyncHandler(async (req, res) => {
    const filter = { user_id: req.user.id };
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    const bookings = await Reserva.find(filter).sort({ start_datetime: -1 });
    const spaceIds = [...new Set(bookings.map((booking) => booking.space_id))];
    const spaces = await Espaco.find({ id: { $in: spaceIds } }).select('id name').lean();
    const names = new Map(spaces.map((space) => [space.id, space.name]));
    return res.json(bookings.map((booking) => ({ ...booking.toJSON(), space_name: names.get(booking.space_id) || `Espaço #${booking.space_id}` })));
}));

router.post('/reservations', asyncHandler(async (req, res) => {
    const spaceId = parsePositiveInteger(req.body.space_id);
    const date = String(req.body.date || '');
    const start = parseBusinessDateTime(date, String(req.body.start_time || ''));
    const end = parseBusinessDateTime(date, String(req.body.end_time || ''));
    if (spaceId === null || !start || !end) return res.status(400).json({ mensagem: 'Informe um espaço, data e horários válidos.' });
    if (end <= start) return res.status(400).json({ mensagem: 'O horário de fim deve ser posterior ao início.' });
    return withSpaceLocks([spaceId], async () => {
        const problem = await validateReservationAvailability({ spaceId, start, end, status: 'PENDING' });
        if (problem) return res.status(problem.status).json({ mensagem: problem.message });
        const doc = await Reserva.create({
            id: await nextId('reservas'), user_id: req.user.id, space_id: spaceId,
            start_datetime: start, end_datetime: end, status: 'PENDING', rejection_reason: null,
            history: [{ action: 'REQUESTED', from_status: null, to_status: 'PENDING', changed_by: req.user.id, changed_at: new Date(), note: String(req.body.note || '').trim() || null }]
        });
        return res.status(201).json(doc);
    });
}));

router.patch('/reservations/:id/cancel', asyncHandler(async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Reserva.findOne({ id, user_id: req.user.id });
    if (!current) return res.status(404).json({ mensagem: 'Reserva não encontrada.' });
    if (!['PENDING', 'APPROVED'].includes(current.status)) return res.status(409).json({ mensagem: `Reserva ${current.status} não pode ser cancelada.` });
    return withSpaceLocks([current.space_id], async () => {
        const doc = await Reserva.findOne({ id, user_id: req.user.id });
        if (!doc) return res.status(404).json({ mensagem: 'Reserva não encontrada.' });
        if (!['PENDING', 'APPROVED'].includes(doc.status)) return res.status(409).json({ mensagem: 'A reserva já não pode ser cancelada.' });
        const from = doc.status; doc.status = 'CANCELLED';
        appendHistory(doc, 'CANCELLED', req.user.id, from, 'CANCELLED', String(req.body?.reason || 'Cancelada pelo solicitante').trim());
        await doc.save();
        return res.json(doc);
    });
}));

module.exports = router;
