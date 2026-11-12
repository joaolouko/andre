function normalizeText(value) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
    return normalized || null;
}

function digitsOnly(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits || null;
}

function emailKey(value) {
    return normalizeText(value);
}

function identityKey(value) {
    return digitsOnly(value) ?? normalizeText(value);
}

function cnpjKey(value) {
    return digitsOnly(value) ?? normalizeText(value);
}

function spaceNameKey(value) {
    return normalizeText(value);
}

function availabilityQuery({ space_id, day_of_week, start_time, end_time, valid_on }) {
    const startTime = typeof start_time === 'string' ? start_time.trim() : start_time;
    const endTime = typeof end_time === 'string' ? end_time.trim() : end_time;
    const day = typeof day_of_week === 'string' && day_of_week.trim() !== '' ? Number(day_of_week) : day_of_week;
    if (valid_on) return { space_id, valid_on, start_time: startTime, end_time: endTime };
    return { space_id, valid_on: null, day_of_week: day, start_time: startTime, end_time: endTime };
}

async function ensureNoDuplicate(Model, query, currentMongoId, message) {
    if (Object.values(query).some((value) => value === undefined || value === '')) return;
    const filter = currentMongoId ? { ...query, _id: { $ne: currentMongoId } } : query;
    if (await Model.exists(filter)) {
        const error = new Error(message);
        error.status = 409;
        throw error;
    }
}

module.exports = {
    normalizeText,
    digitsOnly,
    emailKey,
    identityKey,
    cnpjKey,
    spaceNameKey,
    availabilityQuery,
    ensureNoDuplicate
};
