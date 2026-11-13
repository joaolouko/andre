const test = require('node:test');
const assert = require('node:assert/strict');
const { getBusinessDayBounds, getZonedDateTime, zonedDateTimeToUtc } = require('../utils/reservationAvailability');

test('converte horários de Brasília para UTC preservando a hora de negócio', () => {
    const start = zonedDateTimeToUtc('2026-11-13', '09:30');
    assert.equal(start.toISOString(), '2026-11-13T12:30:00.000Z');
    assert.deepEqual(getZonedDateTime(start), { date: '2026-11-13', dayOfWeek: 5, minuteOfDay: 570 });
});

test('calcula limites de um dia de negócio sem usar o fuso do computador', () => {
    const range = getBusinessDayBounds('2026-11-13');
    assert.equal(range.start.toISOString(), '2026-11-13T03:00:00.000Z');
    assert.equal(range.end.toISOString(), '2026-11-14T03:00:00.000Z');
});

test('rejeita datas e horários inexistentes no formato de reserva', () => {
    assert.equal(zonedDateTimeToUtc('2026-02-30', '09:00'), null);
    assert.equal(zonedDateTimeToUtc('2026-11-13', '24:00'), null);
    assert.equal(zonedDateTimeToUtc('2026-11-13', '09:61'), null);
});
