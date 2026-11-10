const test = require('node:test');
const assert = require('node:assert/strict');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');

const modelosValidos = [
    [Usuario, { id: 5, nome: 'Ana', email: 'ana@example.com', telefone: '123456789' }],
    [Empresa, { id: 7, nome: 'Empresa', cnpj: '12.345.678/0001-90', email: 'empresa@example.com', telefone: '123456789' }],
    [Espaco, { id: 2, nome: 'Sala', descricao: 'Sala de reunião', capacidade: 8, empresaId: 7 }],
    [Disponibilidade, { id: 3, espacoId: 2, data: '2026-10-01', horaInicio: '08:00', horaFim: '18:00' }],
    [Reserva, { id: 4, usuarioId: 5, espacoId: 2, data: '2026-10-01', horaInicio: '10:00', horaFim: '12:00', status: 'confirmada' }]
];

test('todos os modelos aceitam os campos válidos das entidades existentes', () => {
    for (const [Model, data] of modelosValidos) {
        assert.equal(new Model(data).validateSync(), undefined, `${Model.modelName} deve validar`);
    }
});

test('os modelos exigem identificador e campos obrigatórios', () => {
    for (const [Model] of modelosValidos) {
        const error = new Model().validateSync();
        assert.ok(error, `${Model.modelName} deve rejeitar documento vazio`);
        assert.ok(error.errors.id, `${Model.modelName} deve exigir id`);
    }
});

test('a serialização mantém o id numérico público e oculta o _id interno do MongoDB', () => {
    for (const [Model, data] of modelosValidos) {
        const result = new Model(data).toJSON();
        assert.equal(result.id, data.id);
        assert.equal(Object.hasOwn(result, '_id'), false);
        assert.equal(Object.hasOwn(result, '__v'), false);
    }
});

test('reservas mantêm o estado padrão quando não fornecido ao criar', () => {
    const reservaData = modelosValidos.find(([Model]) => Model === Reserva)[1];
    assert.equal(new Reserva({ ...reservaData, status: undefined }).status, 'confirmada');
});
