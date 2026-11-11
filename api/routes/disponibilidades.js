const express = require('express');
const Disponibilidade = require('../models/Disponibilidade');
const Espaco = require('../models/Espaco');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { value } = require('../utils/canonicalize');
const router = express.Router();
async function checkSpace(raw, res) {
    const id = parsePositiveInteger(raw); if (id === null) { res.status(400).json({ mensagem: 'space_id inválido' }); return false; }
    if (!await Espaco.findOne({ id })) { res.status(404).json({ mensagem: 'Espaço não encontrado' }); return false; }
    return id;
}
router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.space_id || req.query.espacoId) query.space_id = Number(req.query.space_id || req.query.espacoId);
    if (req.query.day_of_week !== undefined) query.day_of_week = Number(req.query.day_of_week);
    return res.json(await Disponibilidade.find(query));
}));
router.get('/data/:data', asyncHandler(async (req, res) => {
    const date = req.params.data; const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return res.status(400).json({ mensagem: 'Data inválida' });
    return res.json(await Disponibilidade.find({ $or: [{ valid_on: date }, { valid_on: null, day_of_week: day }] }));
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Disponibilidade.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' }); return res.json(doc);
}));
router.post('/', asyncHandler(async (req, res) => {
    const rawSpace = value(req.body, 'space_id', 'spaceId', 'espacoId'); const spaceId = await checkSpace(rawSpace, res); if (spaceId === false) return;
    const doc = await Disponibilidade.create({ id: await nextId('disponibilidades'), space_id: spaceId,
        day_of_week: req.body.day_of_week ?? req.body.dayOfWeek ?? (req.body.valid_on || req.body.validOn || req.body.data ? new Date(`${req.body.valid_on || req.body.validOn || req.body.data}T00:00:00Z`).getUTCDay() : undefined),
        start_time: value(req.body, 'start_time', 'startTime', 'horaInicio'), end_time: value(req.body, 'end_time', 'endTime', 'horaFim'),
        is_external_allowed: value(req.body, 'is_external_allowed', 'isExternalAllowed') ?? false, valid_on: value(req.body, 'valid_on', 'validOn', 'data') ?? null });
    return res.status(201).json(doc);
}));
const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Disponibilidade.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
    const update = {};
    if (['space_id', 'spaceId', 'espacoId'].some((k) => req.body[k] !== undefined)) { const spaceId = await checkSpace(value(req.body, 'space_id', 'spaceId', 'espacoId'), res); if (spaceId === false) return; update.space_id = spaceId; }
    for (const [target, keys] of Object.entries({ start_time: ['start_time', 'startTime', 'horaInicio'], end_time: ['end_time', 'endTime', 'horaFim'], is_external_allowed: ['is_external_allowed', 'isExternalAllowed'], valid_on: ['valid_on', 'validOn', 'data'], day_of_week: ['day_of_week', 'dayOfWeek'] })) if (keys.some((k) => req.body[k] !== undefined)) update[target] = value(req.body, ...keys);
    if (update.valid_on && update.day_of_week === undefined) update.day_of_week = new Date(`${update.valid_on}T00:00:00Z`).getUTCDay();
    const doc = await Disponibilidade.findByIdAndUpdate(current._id, update, { new: true, runValidators: true }); return res.json(doc);
});
router.put('/:id', updateHandler); router.patch('/:id', updateHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Disponibilidade.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
    await Disponibilidade.findByIdAndDelete(doc._id); return res.json({ mensagem: 'Disponibilidade removida com sucesso' });
}));
module.exports = router;
