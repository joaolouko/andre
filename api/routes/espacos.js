const express = require('express');
const Espaco = require('../models/Espaco');
const Empresa = require('../models/Empresa');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { value } = require('../utils/canonicalize');
const { spaceNameKey, ensureNoDuplicate } = require('../utils/uniqueKeys');
const router = express.Router();

async function checkCompany(raw, res) {
    if (raw === null || raw === undefined) return null;
    const id = parsePositiveInteger(raw); if (id === null) { res.status(400).json({ mensagem: 'company_id inválido' }); return false; }
    if (!await Empresa.findOne({ id })) { res.status(404).json({ mensagem: 'Empresa não encontrada' }); return false; }
    return id;
}
async function checkSpaceDuplicate(name, companyId, currentMongoId) {
    const key = spaceNameKey(name);
    if (key) await ensureNoDuplicate(Espaco, { company_id: companyId ?? null, _name_key: key }, currentMongoId, 'Já existe um espaço com esse nome cadastrado nesta empresa.');
    return key;
}

router.get('/', asyncHandler(async (req, res) => {
    const query = {};
    if (req.query.company_id !== undefined || req.query.empresaId !== undefined) {
        const companyId = parsePositiveInteger(req.query.company_id ?? req.query.empresaId);
        if (companyId === null) return res.status(400).json({ mensagem: 'company_id inválido' });
        query.company_id = companyId;
    }
    if (req.query.type !== undefined) query.type = req.query.type;
    if (req.query.is_active !== undefined) query.is_active = req.query.is_active === 'true';
    return res.json(await Espaco.find(query));
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Espaco.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    return res.json(doc);
}));
router.post('/', asyncHandler(async (req, res) => {
    const companyId = await checkCompany(value(req.body, 'company_id', 'empresaId') ?? null, res); if (companyId === false) return;
    const name = value(req.body, 'name', 'nome');
    const nameKey = await checkSpaceDuplicate(name, companyId);
    const doc = await Espaco.create({
        id: await nextId('espacos'), name, _name_key: nameKey,
        type: req.body.type || 'MEETING_ROOM', capacity: value(req.body, 'capacity', 'capacidade'),
        description: value(req.body, 'description', 'descricao') || '',
        is_active: value(req.body, 'is_active', 'isActive') ?? true, company_id: companyId
    });
    return res.status(201).json(doc);
}));

const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Espaco.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    const update = {};
    for (const [target, keys] of Object.entries({ name: ['name', 'nome'], type: ['type'], capacity: ['capacity', 'capacidade'], description: ['description', 'descricao'], is_active: ['is_active', 'isActive'] })) {
        if (keys.some((k) => req.body[k] !== undefined)) update[target] = value(req.body, ...keys);
    }
    if (['company_id', 'empresaId'].some((k) => req.body[k] !== undefined)) {
        const companyId = await checkCompany(value(req.body, 'company_id', 'empresaId'), res); if (companyId === false) return;
        update.company_id = companyId;
    }
    const name = update.name === undefined ? current.name : update.name;
    const companyId = update.company_id === undefined ? current.company_id : update.company_id;
    update._name_key = await checkSpaceDuplicate(name, companyId, current._id);
    const doc = await Espaco.findByIdAndUpdate(current._id, update, { new: true, runValidators: true });
    return res.json(doc);
});
router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const doc = await Espaco.findOne({ id }); if (!doc) return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    await Espaco.findByIdAndDelete(doc._id); return res.json({ mensagem: 'Espaço removido com sucesso' });
}));
module.exports = router;
