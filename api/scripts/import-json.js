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
const refs = {
    espacos: [[Empresa, 'company_id']],
    disponibilidades: [[Espaco, 'space_id']],
    reservas: [[Usuario, 'user_id'], [Espaco, 'space_id']]
};
async function main() {
    await connectDatabase();
    for (const { name, Model, convert: convertRow } of imports) {
        const filename = path.join(__dirname, '..', 'data', `${name}.json`);
        delete require.cache[require.resolve(filename)];
        const rows = require(filename);
        if (!Array.isArray(rows)) throw new Error(`${filename} deve conter uma lista JSON`);
        for (const source of rows) {
            const row = await convertRow(source);
            for (const [RefModel, field] of refs[name] || []) {
                if (row[field] != null && !await RefModel.exists({ id: row[field] })) throw new Error(`${name} id=${row.id}: referência ${field}=${row[field]} não encontrada`);
            }
            if (!await Model.exists({ id: row.id })) await Model.create(row);
        }
        const maximumId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
        if (maximumId > 0) await Counter.updateOne({ name }, { $max: { sequence: maximumId } }, { upsert: true });
        console.log(`${name}: ${rows.length} registro(s) de origem verificado(s); existentes preservados`);
    }
}
main().catch((error) => { console.error('Falha ao importar os dados JSON:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
