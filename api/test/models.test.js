const test = require('node:test');
const assert = require('node:assert/strict');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');
const Bloqueio = require('../models/Bloqueio');
const canonicalize = require('../utils/canonicalize');

const modelos = [
    [Usuario, { id: 5, name: 'Ana', email: 'ana@example.com', password_hash: '$2b$12$hash', role: 'CLIENT', created_at: new Date() }],
    [Empresa, { id: 7, corporate_name: 'Empresa', trade_name: 'Empresa', cnpj: '12.345.678/0001-90', phone: '123456789' }],
    [Espaco, { id: 2, name: 'Sala', type: 'MEETING_ROOM', description: 'Sala', capacity: 8, company_id: 7, equipment: ['Projetor'] }],
    [Disponibilidade, { id: 3, space_id: 2, day_of_week: 4, start_time: '08:00', end_time: '18:00' }],
    [Reserva, { id: 4, user_id: 5, space_id: 2, start_datetime: new Date('2026-10-01T10:00:00Z'), end_datetime: new Date('2026-10-01T12:00:00Z'), status: 'PENDING' }],
    [Bloqueio, { id: 1, space_id: 2, kind: 'MAINTENANCE', title: 'Manutenção', start_datetime: new Date('2026-10-01T10:00:00Z'), end_datetime: new Date('2026-10-01T12:00:00Z'), created_by: 5 }]
];

test('modelos aceitam os schemas canônicos', () => {
    for (const [Model, data] of modelos) assert.equal(new Model(data).validateSync(), undefined, `${Model.modelName} deve validar`);
});

test('modelos exigem id e campos obrigatórios', () => {
    for (const [Model] of modelos) { const error = new Model().validateSync(); assert.ok(error); assert.ok(error.errors.id); }
});

test('serialização usa id numérico, oculta Mongo _id e nunca expõe hash', () => {
    for (const [Model, data] of modelos) {
        const result = new Model(data).toJSON();
        assert.equal(result.id, data.id);
        assert.equal(Object.hasOwn(result, '_id'), false);
        assert.equal(Object.hasOwn(result, '__v'), false);
        if (Model === Usuario) assert.equal(Object.hasOwn(result, 'password_hash'), false);
    }
});

test('enums, defaults e histórico do workflow são validados', async () => {
    assert.equal(new Usuario({ id: 1, name: 'A', email: 'a@b.com', password_hash: 'hash' }).role, 'CLIENT');
    assert.equal(new Espaco({ id: 1, name: 'Sala', capacity: 1 }).type, 'MEETING_ROOM');
    assert.equal(new Espaco({ id: 1, name: 'Sala', capacity: 1 }).is_active, true);
    assert.deepEqual(new Espaco({ id: 1, name: 'Sala', capacity: 1 }).equipment, []);
    assert.equal(new Reserva({ id: 1, user_id: 1, space_id: 1, start_datetime: new Date(), end_datetime: new Date(Date.now() + 1000) }).status, 'PENDING');
    assert.ok(new Reserva({ id: 1, user_id: 1, space_id: 1, start_datetime: new Date(), end_datetime: new Date(), status: 'confirmada' }).validateSync().errors.status);
    const booking = new Reserva({ id: 8, user_id: 5, space_id: 2, start_datetime: new Date('2026-10-01T10:00:00Z'), end_datetime: new Date('2026-10-01T11:00:00Z'), status: 'APPROVED', history: [{ action: 'APPROVED', from_status: 'PENDING', to_status: 'APPROVED', changed_by: 1 }] });
    assert.equal(await booking.validate(), undefined);
    assert.equal(booking.history[0].action, 'APPROVED');
});

test('normaliza e remove equipamentos repetidos de espaços', async () => {
    const space = new Espaco({ id: 1, name: 'Sala', capacity: 1, equipment: [' Projetor ', 'Projetor', 'Quadro'] });
    await space.validate();
    assert.deepEqual(space.equipment, ['Projetor', 'Quadro']);
});

test('adaptadores reconhecem campos antigos, mapeiam enums e hasheiam senha', async () => {
    const user = await canonicalize.user({ id: 1, nome: 'João', email: 'joao@email.com', telefone: '123', senha: 'legada' });
    assert.equal(user.name, 'João'); assert.equal(user.phone, '123'); assert.equal(user.role, 'ADMIN');
    assert.match(user.password_hash, /^\$2[aby]\$/);
    const space = canonicalize.space({ id: 1, nome: 'Sala', descricao: 'D', capacidade: 4, empresaId: 9, equipamentos: ['Projetor', ' Projetor '] });
    assert.deepEqual([space.name, space.description, space.capacity, space.company_id, space.equipment], ['Sala', 'D', 4, 9, ['Projetor']]);
    const availability = canonicalize.availability({ id: 1, espacoId: 1, data: '2026-11-15', horaInicio: '08:00', horaFim: '18:00' });
    assert.equal(availability.valid_on, '2026-11-15'); assert.equal(availability.day_of_week, 0);
    assert.equal(canonicalize.normalizeStatus('confirmada'), 'APPROVED');
    const reservation = canonicalize.reservation({ id: 1, usuarioId: 1, espacoId: 1, data: '2026-11-15', horaInicio: '10:00', horaFim: '12:00', status: 'pendente' });
    assert.ok(reservation.start_datetime instanceof Date); assert.equal(reservation.status, 'PENDING');
});
