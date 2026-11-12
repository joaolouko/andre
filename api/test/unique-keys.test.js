const test = require('node:test');
const assert = require('node:assert/strict');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const { emailKey, identityKey, cnpjKey, spaceNameKey, availabilityQuery, ensureNoDuplicate } = require('../utils/uniqueKeys');

function indexNames(Model) {
    return Model.schema.indexes().map(([, options]) => options.name);
}

test('normalização ignora caixa/espaços e pontuação de CPF/CNPJ', () => {
    assert.equal(emailKey('  Ana.Silva@Email.COM  '), 'ana.silva@email.com');
    assert.equal(identityKey('123.456.789-00'), '12345678900');
    assert.equal(cnpjKey('12.345.678/0001-90'), '12345678000190');
    assert.equal(spaceNameKey('  Sala   de Reunião '), 'sala de reunião');
    assert.equal(identityKey('   '), null);
    assert.equal(identityKey('CPF pendente'), 'cpf pendente');
});

test('disponibilidades usam chaves distintas para grade semanal e data específica', () => {
    assert.deepEqual(availabilityQuery({ space_id: 3, day_of_week: 2, start_time: '09:00', end_time: '10:00', valid_on: null }), {
        space_id: 3, valid_on: null, day_of_week: 2, start_time: '09:00', end_time: '10:00'
    });
    assert.deepEqual(availabilityQuery({ space_id: 3, day_of_week: 2, start_time: '09:00', end_time: '10:00', valid_on: '2026-11-17' }), {
        space_id: 3, valid_on: '2026-11-17', start_time: '09:00', end_time: '10:00'
    });
});

test('modelos declaram índices únicos de chave natural além do ID', () => {
    assert.ok(indexNames(Usuario).includes('uniq_usuario_email_key'));
    assert.ok(indexNames(Usuario).includes('uniq_usuario_cpf_cnpj_key'));
    assert.ok(indexNames(Empresa).includes('uniq_empresa_cnpj_key'));
    assert.ok(indexNames(Espaco).includes('uniq_espaco_empresa_nome'));
    assert.ok(indexNames(Disponibilidade).includes('uniq_disponibilidade_recorrente'));
    assert.ok(indexNames(Disponibilidade).includes('uniq_disponibilidade_data'));
});

test('verificação prévia exclui o próprio documento numa atualização', async () => {
    let received;
    const Model = { exists: async (query) => { received = query; return null; } };
    await ensureNoDuplicate(Model, { _email_key: 'ana@email.com' }, 'mongo-id', 'duplicado');
    assert.deepEqual(received, { _email_key: 'ana@email.com', _id: { $ne: 'mongo-id' } });
});

test('verificação prévia permite chaves compostas com null', async () => {
    let received;
    const Model = { exists: async (query) => { received = query; return null; } };
    await ensureNoDuplicate(Model, { company_id: null, _name_key: 'sala' }, null, 'duplicado');
    assert.deepEqual(received, { company_id: null, _name_key: 'sala' });
});
