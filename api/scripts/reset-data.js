// DESTRUTIVO: apaga os documentos das coleções listadas e reimporta os JSONs de data/.
// Execute somente após backup e autorização explícita. Este script não é executado por testes.
const path = require('path');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const Counter = require('../models/Counter');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');
const convert = require('../utils/canonicalize');
const imports = [
    { name: 'empresas', Model: Empresa, convert: convert.company },
    { name: 'usuarios', Model: Usuario, convert: (row) => convert.user(row, { requirePassword: true }) },
    { name: 'espacos', Model: Espaco, convert: convert.space },
    { name: 'disponibilidades', Model: Disponibilidade, convert: convert.availability },
    { name: 'reservas', Model: Reserva, convert: convert.reservation }
];
async function main() {
    await connectDatabase();
    console.warn('ATENÇÃO: reset-data é destrutivo e apagará os documentos das coleções de negócio.');
    for (const { name, Model, convert: convertRow } of imports) {
        const filename = path.join(__dirname, '..', 'data', `${name}.json`);
        delete require.cache[require.resolve(filename)];
        const rows = require(filename);
        if (!Array.isArray(rows)) throw new Error(`${filename} deve conter uma lista JSON`);
        await Model.deleteMany({});
        const docs = [];
        for (const source of rows) docs.push(await convertRow(source));
        if (docs.length) await Model.insertMany(docs);
        const maximumId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
        await Counter.updateOne({ name }, { $set: { sequence: maximumId } }, { upsert: true });
        console.log(`${name}: ${docs.length} registro(s) importado(s)`);
    }
}
main().catch((error) => { console.error('Falha ao resetar os dados:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
