// MIGRAÇÃO EM PLACE: não remove coleções nem documentos. Faça backup antes de executar.
// Cada documento é atualizado por _id em lotes; campos legados conhecidos são removidos após conversão.
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const Counter = require('../models/Counter');
const convert = require('../utils/canonicalize');
const config = [
    { name: 'usuarios', convert: convert.user, unset: ['nome', 'telefone', 'senha', 'password', 'empresaId', 'cpfCnpj', 'createdAt'] },
    { name: 'empresas', convert: convert.company, unset: ['nome', 'telefone', 'createdAt', 'corporateName', 'tradeName'] },
    { name: 'espacos', convert: convert.space, unset: ['nome', 'descricao', 'capacidade', 'empresaId', 'isActive'] },
    { name: 'disponibilidades', convert: convert.availability, unset: ['espacoId', 'spaceId', 'data', 'horaInicio', 'horaFim', 'startTime', 'endTime', 'dayOfWeek', 'isExternalAllowed', 'validOn'] },
    { name: 'reservas', convert: convert.reservation, unset: ['usuarioId', 'userId', 'espacoId', 'spaceId', 'data', 'date', 'horaInicio', 'horaFim', 'start_time', 'end_time', 'startDatetime', 'endDatetime', 'motivoRejeicao', 'rejectionReason', 'createdAt'] }
];
const BATCH_SIZE = 200;
async function migrateCollection({ name, convert: convertRow, unset }) {
    const collection = mongoose.connection.db.collection(name);
    let operations = [];
    let migrated = 0;
    const flush = async () => {
        if (!operations.length) return;
        await collection.bulkWrite(operations, { ordered: false });
        migrated += operations.length;
        operations = [];
    };
    for await (const doc of collection.find({}).batchSize(BATCH_SIZE)) {
        const canonical = await convertRow(doc);
        const $unset = Object.fromEntries(unset.map((field) => [field, '']));
        // Preserve unknown fields; known aliases move to their canonical counterparts.
        operations.push({ updateOne: { filter: { _id: doc._id }, update: { $set: canonical, $unset } } });
        if (operations.length >= BATCH_SIZE) await flush();
    }
    await flush();
    const maximum = await collection.find({ id: { $type: 'number' } }).sort({ id: -1 }).limit(1).next();
    if (maximum && maximum.id > 0) await Counter.updateOne({ name }, { $max: { sequence: maximum.id } }, { upsert: true });
    console.log(`${name}: ${migrated} documento(s) atualizado(s)`);
}
async function main() {
    console.warn('Migração em place, idempotente e sem drop/delete de coleções; recomenda-se backup antes da execução.');
    console.warn('Inferências: role CLIENT por padrão, exceto joao@email.com=ADMIN; corporate_name/trade_name iguais quando ausente; cpf/contatos ausentes null; espaços MEETING_ROOM e is_active=true; disponibilidade day_of_week derivado da data e valid_on preserva a data específica; reservas combinam data+hora em Date; statuses antigos são traduzidos.');
    console.warn('Senhas em texto puro serão bcrypt-hashed e removidas do campo legado.');
    await connectDatabase();
    for (const item of config) await migrateCollection(item);
}
main().catch((error) => { console.error('Falha na migração Mongo:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
