const Reserva = require('../models/Reserva');
const Disponibilidade = require('../models/Disponibilidade');
const Espaco = require('../models/Espaco');
const Bloqueio = require('../models/Bloqueio');

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'America/Sao_Paulo';
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const activeStatuses = ['PENDING', 'APPROVED'];
const zonedFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});
const spaceLockTails = new Map();

function partsInZone(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return Object.fromEntries(zonedFormatter.formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map(({ type, value: partValue }) => [type, partValue]));
}

function getZonedDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    const parts = partsInZone(date);
    if (!parts) return null;
    const millisecond = date.getUTCMilliseconds();
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        dayOfWeek: WEEKDAY_INDEX[parts.weekday],
        minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60 + millisecond / 60000
    };
}

function zonedDateTimeToUtc(dateKey, time = '00:00') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    let guess = desiredUtc;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const parts = partsInZone(new Date(guess));
        if (!parts) return null;
        const observedUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
        const difference = desiredUtc - observedUtc;
        guess += difference;
        if (difference === 0) break;
    }
    const result = new Date(guess);
    const zoned = getZonedDateTime(result);
    if (!zoned || zoned.date !== dateKey || Math.floor(zoned.minuteOfDay) !== hour * 60 + minute) return null;
    return result;
}

function getBusinessDayBounds(dateKey) {
    const start = zonedDateTimeToUtc(dateKey, '00:00');
    const date = new Date(`${dateKey}T12:00:00Z`);
    if (!start || Number.isNaN(date.getTime())) return null;
    date.setUTCDate(date.getUTCDate() + 1);
    const nextDateKey = date.toISOString().slice(0, 10);
    const end = zonedDateTimeToUtc(nextDateKey, '00:00');
    return end ? { start, end } : null;
}

function parseTimeToMinutes(value) {
    const match = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(String(value || ''));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function fitsAvailability(start, end, availability) {
    if (!start || !end || start.date !== end.date) return false;
    if (availability.valid_on) {
        if (availability.valid_on !== start.date) return false;
    } else if (availability.day_of_week !== start.dayOfWeek) {
        return false;
    }
    const opensAt = parseTimeToMinutes(availability.start_time);
    const closesAt = parseTimeToMinutes(availability.end_time);
    if (opensAt === null || closesAt === null || closesAt <= opensAt) return false;
    return start.minuteOfDay >= opensAt && end.minuteOfDay <= closesAt;
}

async function validateReservationAvailability({ spaceId, start, end, status = 'PENDING', excludeId = null }) {
    if (!(start instanceof Date) || !(end instanceof Date) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return { status: 400, message: 'Data e horário de início e fim são obrigatórios e devem ser válidos.' };
    }
    if (end <= start) return { status: 400, message: 'end_datetime deve ser posterior a start_datetime' };
    if (!activeStatuses.includes(status)) return null;

    const space = await Espaco.findOne({ id: Number(spaceId) }).select('id is_active').lean();
    if (!space) return { status: 404, message: 'Espaço não encontrado.' };
    if (!space.is_active) return { status: 409, message: 'Este espaço está inativo e não pode receber novas reservas.' };

    const localStart = getZonedDateTime(start);
    const localEnd = getZonedDateTime(end);
    if (!localStart || !localEnd) return { status: 400, message: 'Data e horário inválidos.' };
    if (localStart.date !== localEnd.date) {
        return { status: 409, message: 'A reserva deve iniciar e terminar no mesmo dia de disponibilidade.' };
    }

    const windows = await Disponibilidade.find({
        space_id: Number(spaceId),
        $or: [{ valid_on: localStart.date }, { valid_on: null, day_of_week: localStart.dayOfWeek }]
    }).lean();
    if (!windows.some((window) => fitsAvailability(localStart, localEnd, window))) {
        return { status: 409, message: 'O horário solicitado, incluindo sua duração, está fora da disponibilidade cadastrada para este espaço.' };
    }

    const block = await Bloqueio.findOne({
        space_id: Number(spaceId), start_datetime: { $lt: end }, end_datetime: { $gt: start }
    }).select('kind title start_datetime end_datetime').lean();
    if (block) return { status: 409, message: `O espaço está bloqueado nesse intervalo (${block.kind === 'MAINTENANCE' ? 'manutenção' : 'evento interno'}: ${block.title}).` };

    const conflictQuery = {
        space_id: Number(spaceId), status: { $in: activeStatuses },
        start_datetime: { $lt: end }, end_datetime: { $gt: start }
    };
    if (excludeId) conflictQuery._id = { $ne: excludeId };
    const conflict = await Reserva.findOne(conflictQuery).select('id').lean();
    if (conflict) return { status: 409, message: `O espaço já possui uma reserva ativa (#${conflict.id}) com horário sobreposto.` };
    return null;
}

async function withSpaceLock(spaceId, operation) {
    const key = String(spaceId);
    const previous = spaceLockTails.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    spaceLockTails.set(key, current);
    await previous;
    try { return await operation(); }
    finally {
        release();
        if (spaceLockTails.get(key) === current) spaceLockTails.delete(key);
    }
}

async function withSpaceLocks(spaceIds, operation) {
    const keys = [...new Set(spaceIds.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const acquire = (index) => index >= keys.length ? operation() : withSpaceLock(keys[index], () => acquire(index + 1));
    return acquire(0);
}

module.exports = {
    BUSINESS_TIMEZONE, getZonedDateTime, zonedDateTimeToUtc, getBusinessDayBounds,
    parseTimeToMinutes, fitsAvailability, validateReservationAvailability, withSpaceLocks
};
