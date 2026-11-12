const express = require('express');
const Empresa = require('../models/Empresa');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');
const { value } = require('../utils/canonicalize');
const { cnpjKey, ensureNoDuplicate } = require('../utils/uniqueKeys');
const router = express.Router();

async function checkCompanyDuplicates(cnpj, currentMongoId) {
    const key = cnpjKey(cnpj);
    if (key) await ensureNoDuplicate(Empresa, { _cnpj_key: key }, currentMongoId, 'Este CNPJ já está cadastrado em outra empresa.');
    return key;
}

router.get('/', asyncHandler(async (_req, res) => res.json(await Empresa.find())));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const empresa = await Empresa.findOne({ id }); if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    return res.json(empresa);
}));
router.post('/', asyncHandler(async (req, res) => {
    const corporate = value(req.body, 'corporate_name', 'corporateName', 'nome');
    const cnpj = value(req.body, 'cnpj');
    const key = await checkCompanyDuplicates(cnpj);
    const empresa = await Empresa.create({
        id: await nextId('empresas'), corporate_name: corporate,
        trade_name: value(req.body, 'trade_name', 'tradeName') || corporate,
        cnpj, _cnpj_key: key, phone: value(req.body, 'phone', 'telefone'), email: value(req.body, 'email') ?? null
    });
    return res.status(201).json(empresa);
}));

const updateHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const current = await Empresa.findOne({ id }); if (!current) return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    const update = {};
    if (['corporate_name', 'corporateName', 'nome'].some((k) => req.body[k] !== undefined)) update.corporate_name = value(req.body, 'corporate_name', 'corporateName', 'nome');
    if (['trade_name', 'tradeName'].some((k) => req.body[k] !== undefined)) update.trade_name = value(req.body, 'trade_name', 'tradeName');
    else if (req.body.nome !== undefined && req.body.corporate_name === undefined) update.trade_name = req.body.nome;
    for (const [target, keys] of Object.entries({ cnpj: ['cnpj'], phone: ['phone', 'telefone'], email: ['email'] })) {
        if (keys.some((k) => req.body[k] !== undefined)) update[target] = value(req.body, ...keys);
    }
    const key = await checkCompanyDuplicates(update.cnpj === undefined ? current.cnpj : update.cnpj, current._id);
    update._cnpj_key = key;
    const empresa = await Empresa.findByIdAndUpdate(current._id, update, { new: true, runValidators: true });
    return res.json(empresa);
});
router.put('/:id', updateHandler);
router.patch('/:id', updateHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const empresa = await Empresa.findOne({ id }); if (!empresa) return res.status(404).json({ mensagem: 'Empresa não encontrada' });
    await Empresa.findByIdAndDelete(empresa._id); return res.json({ mensagem: 'Empresa removida com sucesso' });
}));
module.exports = router;
