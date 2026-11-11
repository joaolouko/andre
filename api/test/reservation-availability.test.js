const test = require('node:test');
const assert = require('node:assert/strict');
const {
    BUSINESS_TIMEZONE,
    getZonedDateTime,
    parseTimeToMinutes,
    fitsAvailability
} = require('../utils/reservationAvailability');

test('interpreta reservas no fuso de negócio configurado', () => {
    assert.equal(BUSINESS_TIMEZONE, process.env.BUSINESS_TIMEZONE || 'America/Sao_Paulo');
    const start = getZonedDateTime(new Date('2026-11-20T12:30:00.000Z'));
    assert.equal(start.date, '2026-11-20');
    assert.equal(start.dayOfWeek, 5);
    assert.equal(start.minuteOfDay, 570);
});

test('exige que todo o intervalo e sua duração caibam na disponibilidade pontual', () => {
    const start = getZonedDateTime(new Date('2026-11-20T12:30:00.000Z'));
    const within = getZonedDateTime(new Date('2026-11-20T15:00:00.000Z'));
    const tooLate = getZonedDateTime(new Date('2026-11-20T19:45:00.000Z'));
    const window = { valid_on: '2026-11-20', day_of_week: 5, start_time: '09:30', end_time: '16:30' };
    assert.equal(fitsAvailability(start, within, window), true);
    assert.equal(fitsAvailability(start, tooLate, window), false);
});

test('aplica disponibilidade recorrente apenas no dia da semana correspondente', () => {
    const fridayStart = getZonedDateTime(new Date('2026-11-20T13:00:00.000Z'));
    const fridayEnd = getZonedDateTime(new Date('2026-11-20T14:00:00.000Z'));
    const recurring = { valid_on: null, day_of_week: 5, start_time: '09:00', end_time: '12:00' };
    const wrongDay = { ...recurring, day_of_week: 4 };
    assert.equal(fitsAvailability(fridayStart, fridayEnd, recurring), true);
    assert.equal(fitsAvailability(fridayStart, fridayEnd, wrongDay), false);
});

test('usa intervalos semiabertos e valida formato de horário', () => {
    assert.equal(parseTimeToMinutes('09:30'), 570);
    assert.equal(parseTimeToMinutes('24:00'), null);
    const startsAtClose = getZonedDateTime(new Date('2026-11-20T15:00:00.000Z'));
    const endsAfter = getZonedDateTime(new Date('2026-11-20T15:30:00.000Z'));
    const window = { valid_on: '2026-11-20', day_of_week: 5, start_time: '09:30', end_time: '12:00' };
    assert.equal(fitsAvailability(startsAtClose, endsAfter, window), false);
});

test('não aceita uma reserva que cruza a meia-noite numa janela diária', () => {
    const start = getZonedDateTime(new Date('2026-11-21T02:30:00.000Z'));
    const end = getZonedDateTime(new Date('2026-11-21T04:00:00.000Z'));
    const window = { valid_on: '2026-11-20', day_of_week: 5, start_time: '18:00', end_time: '23:59' };
    assert.equal(fitsAvailability(start, end, window), false);
});
