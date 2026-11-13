const express = require('express');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');
const Bloqueio = require('../models/Bloqueio');
const asyncHandler = require('../utils/asyncHandler');
const { BUSINESS_TIMEZONE, getZonedDateTime, zonedDateTimeToUtc, getBusinessDayBounds, parseTimeToMinutes } = require('../utils/reservationAvailability');
const router = express.Router();
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIMEZONE, weekday: 'short' });
const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function mergeIntervals(intervals) {
    const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
    const result = [];
    for (const interval of sorted) {
        const last = result.at(-1);
        if (!last || interval[0] > last[1]) result.push([...interval]);
        else last[1] = Math.max(last[1], interval[1]);
    }
    return result;
}
function subtractIntervals(source, cuts) {
    let result = source.map((range) => [...range]);
    for (const [cutStart, cutEnd] of mergeIntervals(cuts)) {
        result = result.flatMap(([start, end]) => {
            if (cutEnd <= start || cutStart >= end) return [[start, end]];
            const pieces = [];
            if (cutStart > start) pieces.push([start, cutStart]);
            if (cutEnd < end) pieces.push([cutEnd, end]);
            return pieces;
        });
    }
    return result;
}
function intervalsForWindows(windows) {
    return mergeIntervals(windows.map((window) => [parseTimeToMinutes(window.start_time), parseTimeToMinutes(window.end_time)]).filter(([start, end]) => start !== null && end !== null));
}
function localInterval(record) {
    const start = getZonedDateTime(record.start_datetime);
    const end = getZonedDateTime(record.end_datetime);
    if (!start || !end) return null;
    return [start.date, start.minuteOfDay, end.date, end.minuteOfDay];
}

router.get('/stats', asyncHandler(async (_req, res) => {
    const now = new Date();
    const localNow = getZonedDateTime(now);
    const [year, month] = localNow.date.split('-').map(Number);
    const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEndKey = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const monthBounds = { start: getBusinessDayBounds(monthStartKey).start, end: getBusinessDayBounds(monthEndKey).end };

    const [usuarios, empresas, espacosTotal, espacosAtivos, disponibilidades, reservasTotal, pendingReservations, approved, ultimasRaw, activeSpaces, windows, blocks] = await Promise.all([
        Usuario.countDocuments(), Empresa.countDocuments(), Espaco.countDocuments(), Espaco.countDocuments({ is_active: true }),
        Disponibilidade.countDocuments(), Reserva.countDocuments(), Reserva.countDocuments({ status: 'PENDING' }),
        Reserva.find({ status: 'APPROVED', start_datetime: { $lt: monthBounds.end }, end_datetime: { $gt: monthBounds.start } }).lean(),
        Reserva.find().sort({ id: -1 }).limit(5).lean(), Espaco.find({ is_active: true }).select('id name').lean(),
        Disponibilidade.find().lean(),
        Bloqueio.find({ start_datetime: { $lt: monthBounds.end }, end_datetime: { $gt: monthBounds.start } }).lean()
    ]);

    const approvedForMonth = approved.filter((item) => localInterval(item));
    const hoursUsed = approvedForMonth.reduce((sum, booking) => {
        const start = Math.max(booking.start_datetime.getTime(), monthBounds.start.getTime());
        const end = Math.min(booking.end_datetime.getTime(), monthBounds.end.getTime());
        return sum + Math.max(0, end - start) / 3600000;
    }, 0);

    let availableMinutes = 0;
    const spaceIds = new Set(activeSpaces.map((space) => space.id));
    for (let day = 1; day <= lastDay; day += 1) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const localInstant = zonedDateTimeToUtc(date, '12:00');
        const weekday = localInstant ? weekdayIndex[weekdayFormatter.format(localInstant)] : new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        const dayBlocks = blocks.map((block) => localInterval(block)).filter((range) => range && range[0] <= date && range[2] >= date);
        const cuts = dayBlocks.map((range) => [range[0] < date ? 0 : range[1], range[2] > date ? 1440 : range[3]]);
        for (const spaceId of spaceIds) {
            const applicable = windows.filter((window) => window.space_id === spaceId && (window.valid_on ? window.valid_on === date : window.day_of_week === weekday));
            const open = intervalsForWindows(applicable);
            const free = subtractIntervals(open, cuts);
            availableMinutes += free.reduce((sum, [start, end]) => sum + end - start, 0);
        }
    }
    const occupancyRate = availableMinutes ? Math.round((hoursUsed * 60 / availableMinutes) * 1000) / 10 : 0;
    const demand = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, reservations: 0 }));
    for (const booking of approvedForMonth) {
        const local = getZonedDateTime(booking.start_datetime);
        if (local) {
            const bucket = demand[Math.floor(local.minuteOfDay / 60)];
            if (bucket) bucket.reservations += 1;
        }
    }
    const peakHours = demand.filter((entry) => entry.reservations > 0).sort((a, b) => b.reservations - a.reservations || a.hour.localeCompare(b.hour)).slice(0, 5);

    const userIds = [...new Set(ultimasRaw.map((item) => item.user_id))];
    const spaceIdSet = [...new Set(ultimasRaw.map((item) => item.space_id))];
    const [userDocs, spaceDocs] = await Promise.all([
        Usuario.find({ id: { $in: userIds } }).select('id name').lean(),
        Espaco.find({ id: { $in: spaceIdSet } }).select('id name').lean()
    ]);
    const userNames = new Map(userDocs.map((user) => [user.id, user.name]));
    const spaceNames = new Map(spaceDocs.map((space) => [space.id, space.name]));
    const ultimasReservas = ultimasRaw.map((booking) => ({ ...booking, user_name: userNames.get(booking.user_id) || `Usuário #${booking.user_id}`, space_name: spaceNames.get(booking.space_id) || `Espaço #${booking.space_id}` }));

    return res.json({
        usuarios, empresas, espacos: espacosTotal, espacosAtivos, disponibilidades, reservas: reservasTotal, pendingReservations,
        hoursUsed: Math.round(hoursUsed * 10) / 10, occupancyRate, availableHours: Math.round(availableMinutes / 60 * 10) / 10,
        peakHours, period: { start: monthStartKey, end: monthEndKey, timezone: BUSINESS_TIMEZONE }, ultimasReservas
    });
}));
module.exports = router;
