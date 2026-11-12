const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const { emailKey, identityKey, cnpjKey, spaceNameKey } = require('../utils/uniqueKeys');

function dayForDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date.getUTCDay();
}

function describe(doc) {
    return `id=${doc.id ?? String(doc._id)}`;
}

function duplicateReport(collection, key, doc, seen, label, duplicates) {
    if (key === null || key === undefined || key === '') return;
    const mapKey = `${label}:${String(key)}`;
    const prior = seen.get(mapKey);
    if (prior) duplicates.push(`${collection}: ${label} repetido (${prior} e ${describe(doc)})`);
    else seen.set(mapKey, describe(doc));
}

async function readDocuments(Model) {
    return mongoose.connection.db.collection(Model.collection.collectionName).find({}).toArray();
}

async function prepareCollection(Model, getEntries, getUpdate) {
    const docs = await readDocuments(Model);
    const seen = new Map();
    const duplicates = [];
    const operations = [];

    for (const doc of docs) {
        for (const entry of getEntries(doc)) {
            const compound = entry.key === null || entry.key === undefined ? null : JSON.stringify(entry.key);
            duplicateReport(Model.collection.collectionName, compound, doc, seen, entry.label, duplicates);
        }
        const update = getUpdate(doc);
        if (Object.keys(update).length) operations.push({ updateOne: { filter: { _id: doc._id }, update: { $set: update } } });
    }

    return { Model, operations, duplicates };
}

async function ensureUniqueIndexes() {
    const preparations = await Promise.all([
        prepareCollection(Usuario, (doc) => [
            { key: emailKey(doc.email), label: 'e-mail' },
            { key: identityKey(doc.cpf_cnpj ?? doc.cpfCnpj), label: 'CPF/CNPJ' }
        ], (doc) => ({
            _email_key: emailKey(doc.email),
            _cpf_cnpj_key: identityKey(doc.cpf_cnpj ?? doc.cpfCnpj)
        })),
        prepareCollection(Empresa, (doc) => [
            { key: cnpjKey(doc.cnpj), label: 'CNPJ' }
        ], (doc) => ({ _cnpj_key: cnpjKey(doc.cnpj) })),
        prepareCollection(Espaco, (doc) => [
            { key: (doc.name ?? doc.nome) ? [doc.company_id ?? doc.empresaId ?? null, spaceNameKey(doc.name ?? doc.nome)] : null, label: 'nome dentro da empresa' }
        ], (doc) => ({
            _name_key: spaceNameKey(doc.name ?? doc.nome),
            ...(doc.name === undefined && doc.nome !== undefined ? { name: doc.nome } : {}),
            ...(doc.company_id === undefined ? { company_id: doc.empresaId ?? null } : {})
        })),
        prepareCollection(Disponibilidade, (doc) => {
            const spaceId = doc.space_id ?? doc.spaceId ?? doc.espacoId;
            const start = doc.start_time ?? doc.startTime ?? doc.horaInicio;
            const end = doc.end_time ?? doc.endTime ?? doc.horaFim;
            if (!spaceId || !start || !end) return [];
            const validOn = doc.valid_on ?? doc.validOn ?? doc.data ?? null;
            const day = doc.day_of_week ?? doc.dayOfWeek ?? dayForDate(validOn);
            if (validOn) return [{ key: ['data', spaceId, validOn, start, end], label: 'espaço/data/horário' }];
            return [{ key: ['recorrente', spaceId, day, start, end], label: 'espaço/dia/horário' }];
        }, (doc) => {
            const validOn = doc.valid_on ?? doc.validOn ?? doc.data ?? null;
            const update = {
                ...(doc.space_id === undefined ? { space_id: doc.spaceId ?? doc.espacoId } : {}),
                ...(doc.start_time === undefined ? { start_time: doc.startTime ?? doc.horaInicio } : {}),
                ...(doc.end_time === undefined ? { end_time: doc.endTime ?? doc.horaFim } : {}),
                ...(doc.valid_on === undefined ? { valid_on: validOn } : {}),
                ...(doc.day_of_week === undefined ? { day_of_week: doc.dayOfWeek ?? dayForDate(validOn) } : {})
            };
            return update;
        })
    ]);

    const duplicates = preparations.flatMap((item) => item.duplicates);
    if (duplicates.length) {
        const preview = duplicates.slice(0, 10).join('; ');
        const remaining = duplicates.length > 10 ? `; e mais ${duplicates.length - 10}` : '';
        const error = new Error(`Não foi possível ativar as regras de unicidade: foram encontrados dados duplicados no MongoDB (${preview}${remaining}). Corrija os registros repetidos e reinicie a API.`);
        error.code = 'UNIQUE_CONSTRAINT_PRECHECK';
        throw error;
    }

    for (const { Model, operations } of preparations) {
        if (operations.length) await mongoose.connection.db.collection(Model.collection.collectionName).bulkWrite(operations, { ordered: true });
    }

    await Promise.all([Usuario, Empresa, Espaco, Disponibilidade].map((Model) => Model.createIndexes()));
}

module.exports = { ensureUniqueIndexes };
