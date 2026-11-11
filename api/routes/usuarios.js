const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const nextId = require('../utils/nextId');
const asyncHandler = require('../utils/asyncHandler');
const { parseId, parsePositiveInteger } = require('../utils/ids');
const { value } = require('../utils/canonicalize');
const router = express.Router();
const dto = (doc) => doc.toJSON();

async function validateCompany(companyId, res) {
    if (companyId === null || companyId === undefined) return true;
    const id = parsePositiveInteger(companyId);
    if (id === null) { res.status(400).json({ mensagem: 'company_id inválido' }); return false; }
    if (!await Empresa.findOne({ id })) { res.status(404).json({ mensagem: 'Empresa não encontrada' }); return false; }
    return id;
}
router.get('/', asyncHandler(async (_req, res) => res.json((await Usuario.find()).map(dto))));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const user = await Usuario.findOne({ id }); if (!user) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    return res.json(dto(user));
}));
router.post('/', asyncHandler(async (req, res) => {
    const companyValue = value(req.body, 'company_id', 'empresaId') ?? null;
    const companyId = await validateCompany(companyValue, res); if (companyId === false) return;
    const password = value(req.body, 'password', 'senha');
    if (typeof password !== 'string' || !password) return res.status(400).json({ mensagem: 'password é obrigatório' });
    const user = await Usuario.create({
        id: await nextId('usuarios'), name: value(req.body, 'name', 'nome'), email: value(req.body, 'email'),
        password_hash: await bcrypt.hash(password, 12), role: value(req.body, 'role') || 'CLIENT',
        cpf_cnpj: value(req.body, 'cpf_cnpj', 'cpfCnpj') ?? null, company_id: companyId,
        phone: value(req.body, 'phone', 'telefone') ?? null
    });
    return res.status(201).json(dto(user));
}));
const updateUsuarioHandler = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const atual = await Usuario.findOne({ id }); if (!atual) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    const update = {};
    const fields = { name: ['name', 'nome'], email: ['email'], role: ['role'], cpf_cnpj: ['cpf_cnpj', 'cpfCnpj'], phone: ['phone', 'telefone'] };
    for (const [target, keys] of Object.entries(fields)) if (keys.some((key) => req.body[key] !== undefined)) update[target] = value(req.body, ...keys);
    if (['company_id', 'empresaId'].some((k) => req.body[k] !== undefined)) {
        const companyId = await validateCompany(value(req.body, 'company_id', 'empresaId'), res); if (companyId === false) return;
        update.company_id = companyId;
    }
    const password = value(req.body, 'password', 'senha');
    if (password !== undefined && password !== '') update.password_hash = await bcrypt.hash(String(password), 12);
    const user = await Usuario.findByIdAndUpdate(atual._id, update, { new: true, runValidators: true });
    return res.json(dto(user));
});
router.put('/:id', updateUsuarioHandler);
router.patch('/:id', updateUsuarioHandler);
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id); if (id === null) return res.status(400).json({ mensagem: 'ID inválido' });
    const user = await Usuario.findOne({ id }); if (!user) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    await Usuario.findByIdAndDelete(user._id); return res.json({ mensagem: 'Usuário removido com sucesso' });
}));
module.exports = router;
