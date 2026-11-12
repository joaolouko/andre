const express = require('express');
const Disponibilidade = require('../models/Disponibilidade');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { value } = require('../utils/canonicalize');
const { availabilityQuery, ensureNoDuplicate } = require('../utils/uniqueKeys');
const router = express.Router();

async function checkSpace(raw, res) {
    const id = parsePositiveInteger(raw); if (id === null) { res.status(400).json({ mensagem: 'space_id inválido' }); return false; }
    if (!await Espaco.findOne({ id })) { res.status(404).json({ mensagem: 'Espaço não encontrado' }); return false; }
    return id;
}
function dayForDate(validOn) {
    if (!validOn) return null;
    if (typeof validOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(validOn)) return null;
    const date = new Date(`${validOn}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== validOn) return null;
    return date.getUTCDay();
}
async function checkAvailabilityDuplicate(record, currentMongoId) {
    const query = availabilityQuery(record);
    if (query.day_of_week === undefined || query.start_time === undefined || query.end_time === undefined) return;
    await ensureNoDuplicate(Disponibilidade, query, currentMongoId, 'Esta disponibilidade já está cadastrada para o mesmo espaço e período.');
}

router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.space_id || req.query.espacoId) query.space_id = Number(req.query.space_id || req.query.espacoId);
    if (req.query.day_of_week !== undefined) query.day_of_week = Number(req.query.day_of_week);
    return res.json(await Disponibilidade.find(query));
}));
router.get('/data/:data', asyncHandler(async (req, res) => {
    const date = req.params.data; const day = dayForDate(date);
    if (day === null) return res.status(400).json({ mensagem: 'Data inválida' });
    return res.json(await Disponibilidade.find({ $or: [{ valid_on: date }, { valid_on: null, day_of_week: day }] }));
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Disponibilidade.findOne({ id });
    if (!doc) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
    return res.json(doc);
}));
router.post('/', asyncHandler(async (req, res) => {
    const rawSpace = value(req.body, 'space_id', 'spaceId', 'espacoId');
    const spaceId = await checkSpace(rawSpace, res); if (spaceId === false) return;
    const validOn = value(req.body, 'valid_on', 'validOn', 'data') ?? null;
    let dayOfWeek = value(req.body, 'day_of_week', 'dayOfWeek');
    if (validOn) {
        dayOfWeek = dayForDate(validOn);
        if (dayOfWeek === null) return res.status(400).json({ mensagem: 'Data inválida' });
    } else if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== '') {
        dayOfWeek = Number(dayOfWeek);
    }
    const record = {
        space_id: spaceId,
        day_of_week: dayOfWeek,
        start_time: value(req.body, 'start_time', 'startTime', 'horaInicio'),
        end_time: value(req.body, 'end_time', 'endTime', 'horaFim'),
        valid_on: validOn
    };
    await checkAvailabilityDuplicate(record);
    const doc = await Disponibilidade.create({
        id: await nextId('disponibilidades'), ...record,
        is_external_allowed: value(req.body, 'is_external_allowed', 'isExternalAllowed') ?? false
    });
    return res.status(201).json(doc);
}));

const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Disponibilidade.findOne({ id });
    if (!current) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
    const update = {};
    if (['space_id', 'spaceId', 'espacoId'].some((k) => req.body[k] !== undefined)) {
        const spaceId = await checkSpace(value(req.body, 'space_id', 'spaceId', 'espacoId'), res); if (spaceId === false) return;
        update.space_id = spaceId;
    }
    for (const [target, keys] of Object.entries({ start_time: ['start_time', 'startTime', 'horaInicio'], end_time: ['end_time', 'endTime', 'horaFim'], is_external_allowed: ['is_external_allowed', 'isExternalAllowed'], valid_on: ['valid_on', 'validOn', 'data'], day_of_week: ['day_of_week', 'dayOfWeek'] })) {
        if (keys.some((k) => req.body[k] !== undefined)) update[target] = value(req.body, ...keys);
    }

    const record = {
        space_id: update.space_id === undefined ? current.space_id : update.space_id,
        start_time: update.start_time === undefined ? current.start_time : update.start_time,
        end_time: update.end_time === undefined ? current.end_time : update.end_time,
        valid_on: update.valid_on === undefined ? current.valid_on : update.valid_on,
        day_of_week: update.day_of_week === undefined ? current.day_of_week : update.day_of_week
    };
    if (record.valid_on) {
        record.day_of_week = dayForDate(record.valid_on);
        if (record.day_of_week === null) return res.status(400).json({ mensagem: 'Data inválida' });
        update.day_of_week = record.day_of_week;
    }
    await checkAvailabilityDuplicate(record, current._id);

    const doc = await Disponibilidade.findByIdAndUpdate(current._id, update, { new: true, runValidators: true });
    return res.json(doc);
});
router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Disponibilidade.findOne({ id });
    if (!doc) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
    await Disponibilidade.findByIdAndDelete(doc._id); return res.json({ mensagem: 'Disponibilidade removida com sucesso' });
}));
module.exports = router;
