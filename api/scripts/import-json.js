const path = require('path');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const Counter = require('../models/Counter');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');

const imports = [
    { name: 'usuarios', Model: Usuario },
    { name: 'empresas', Model: Empresa },
    { name: 'espacos', Model: Espaco },
    { name: 'disponibilidades', Model: Disponibilidade },
    { name: 'reservas', Model: Reserva }
];

async function main() {
    await connectDatabase();

    for (const { name, Model } of imports) {
        const filename = path.join(__dirname, '..', 'data', `${name}.json`);
        const rows = require(filename);
        if (!Array.isArray(rows)) throw new Error(`${filename} deve conter uma lista JSON`);

        if (rows.length > 0) {
            const preparedRows = rows.map((row) => {
                if (name === 'usuarios' && !row.senha) {
                    return { ...row, senha: '123456' };
                }
                return row;
            });

            await Model.bulkWrite(preparedRows.map((row) => ({
                updateOne: {
                    filter: { id: row.id },
                    update: { $setOnInsert: row },
                    upsert: true
                }
            })));

            const maximumId = Math.max(...rows.map((row) => Number(row.id) || 0));
            if (maximumId > 0) {
                await Counter.updateOne(
                    { name },
                    { $max: { sequence: maximumId } },
                    { upsert: true }
                );
            }
        }
        console.log(`${name}: ${rows.length} registo(s) de origem processado(s)`);
    }
}

main()
    .catch((error) => {
        console.error('Falha ao importar os dados JSON:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
