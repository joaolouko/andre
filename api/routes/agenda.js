const express = require('express');
const Reserva = require('../models/Reserva');
const Disponibilidade = require('../models/Disponibilidade');
const Bloqueio = require('../models/Bloqueio');
const Espaco = require('../models/Espaco');
const asyncHandler = require('../utils/asyncHandler');
const { parsePositiveInteger } = require('../utils/ids');
const { getBusinessDayBounds } = require('../utils/reservationAvailability');
const router = express.Router();

function toBusinessRange(rawFrom, rawTo) {
    const fromDate = String(rawFrom || '');
    const toDate = String(rawTo || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return null;
    const first = getBusinessDayBounds(fromDate);
    const last = getBusinessDayBounds(toDate);
    if (!first || !last || last.start < first.start) return null;
    const days = (Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000;
    if (days > 62) return null;
    return { start: first.start, end: last.end };
}

router.get('/', asyncHandler(async (req, res) => {
    const range = toBusinessRange(req.query.from, req.query.to);
    if (!range) return res.status(400).json({ mensagem: 'Informe from e to válidos em YYYY-MM-DD, com no máximo 62 dias.' });
    const spaceId = req.query.space_id === undefined ? null : parsePositiveInteger(req.query.space_id);
    if (req.query.space_id !== undefined && spaceId === null) return res.status(400).json({ mensagem: 'space_id inválido.' });
    const filter = spaceId === null ? {} : { space_id: spaceId };
    const [reservations, blocks, availabilities, spaces] = await Promise.all([
        Reserva.find({ ...filter, start_datetime: { $lt: range.end }, end_datetime: { $gt: range.start } }).sort({ start_datetime: 1 }),
        Bloqueio.find({ ...filter, start_datetime: { $lt: range.end }, end_datetime: { $gt: range.start } }).sort({ start_datetime: 1 }),
        Disponibilidade.find(filter).sort({ space_id: 1, day_of_week: 1, start_time: 1 }),
        Espaco.find(spaceId === null ? { is_active: true } : { id: spaceId })
    ]);
    return res.json({ from: req.query.from, to: req.query.to, reservations, blocks, availabilities, spaces });
}));

module.exports = router;
