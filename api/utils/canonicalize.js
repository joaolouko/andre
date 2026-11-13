const bcrypt = require('bcryptjs');
const { emailKey, identityKey, cnpjKey, spaceNameKey } = require('./uniqueKeys');

const value = (obj, ...keys) => {
    for (const key of keys) if (obj[key] !== undefined) return obj[key];
    return undefined;
};
const has = (obj, ...keys) => keys.some((key) => Object.prototype.hasOwnProperty.call(obj, key));
const hashIfNeeded = async (password) => {
    if (typeof password !== 'string' || !password) throw new Error('Senha obrigatória para criar usuário');
    if (/^\$2[aby]\$\d{2}\$/.test(password)) return password;
    return bcrypt.hash(password, 12);
};
const asDate = (input) => {
    if (input instanceof Date) return input;
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) throw new Error('Data inválida');
    return date;
};
const oldDateTime = (date, time) => {
    if (!date || !time) return undefined;
    return asDate(`${date}T${time}:00`);
};

async function user(input, { requirePassword = false } = {}) {
    const name = value(input, 'name', 'nome');
    const rawPassword = value(input, 'password', 'senha', 'password_hash');
    const out = {
        id: input.id,
        name,
        email: String(value(input, 'email') || '').trim().toLowerCase(),
        role: value(input, 'role') || (String(input.email || '').toLowerCase() === 'joao@email.com' ? 'ADMIN' : 'CLIENT'),
        cpf_cnpj: value(input, 'cpf_cnpj', 'cpfCnpj') ?? null,
        _email_key: emailKey(value(input, 'email')),
        _cpf_cnpj_key: identityKey(value(input, 'cpf_cnpj', 'cpfCnpj')),
        company_id: value(input, 'company_id', 'empresaId') ?? null,
        phone: value(input, 'phone', 'telefone') ?? null,
        created_at: value(input, 'created_at', 'createdAt') ? asDate(value(input, 'created_at', 'createdAt')) : new Date()
    };
    if (rawPassword !== undefined && rawPassword !== null && rawPassword !== '') out.password_hash = await hashIfNeeded(String(rawPassword));
    else if (requirePassword) throw new Error('Senha obrigatória para criar usuário');
    return out;
}
function company(input) {
    const corporateName = value(input, 'corporate_name', 'corporateName', 'nome');
    return {
        id: input.id,
        corporate_name: corporateName,
        trade_name: value(input, 'trade_name', 'tradeName') || corporateName,
        cnpj: value(input, 'cnpj'),
        _cnpj_key: cnpjKey(value(input, 'cnpj')),
        phone: value(input, 'phone', 'telefone'),
        email: value(input, 'email') ? String(value(input, 'email')).trim().toLowerCase() : null,
        created_at: value(input, 'created_at', 'createdAt') ? asDate(value(input, 'created_at', 'createdAt')) : new Date()
    };
}
function space(input) {
    return {
        id: input.id,
        name: value(input, 'name', 'nome'),
        _name_key: spaceNameKey(value(input, 'name', 'nome')),
        type: value(input, 'type') || 'MEETING_ROOM',
        capacity: value(input, 'capacity', 'capacidade'),
        description: value(input, 'description', 'descricao') || '',
        equipment: Array.isArray(value(input, 'equipment', 'equipamentos')) ? [...new Set(value(input, 'equipment', 'equipamentos').map((item) => String(item).trim()).filter(Boolean))] : [],
        is_active: value(input, 'is_active', 'isActive') ?? true,
        company_id: value(input, 'company_id', 'empresaId') ?? null
    };
}
function availability(input) {
    const validOn = value(input, 'valid_on', 'validOn', 'data') ?? null;
    const day = value(input, 'day_of_week', 'dayOfWeek');
    const dayOfWeek = validOn ? new Date(`${validOn}T00:00:00Z`).getUTCDay() : (day === undefined ? undefined : Number(day));
    return {
        id: input.id,
        space_id: value(input, 'space_id', 'spaceId', 'espacoId'),
        day_of_week: dayOfWeek,
        start_time: value(input, 'start_time', 'startTime', 'horaInicio'),
        end_time: value(input, 'end_time', 'endTime', 'horaFim'),
        is_external_allowed: value(input, 'is_external_allowed', 'isExternalAllowed') ?? false,
        valid_on: validOn
    };
}
function normalizeStatus(status) {
    const s = String(status || 'PENDING').trim().toUpperCase();
    const map = { CONFIRMADA: 'APPROVED', CONFIRMADO: 'APPROVED', APROVADA: 'APPROVED', APROVADO: 'APPROVED', PENDENTE: 'PENDING', REJEITADA: 'REJECTED', REJEITADO: 'REJECTED', CANCELADA: 'CANCELLED', CANCELADO: 'CANCELLED' };
    return map[s] || s;
}
function reservation(input) {
    const start = value(input, 'start_datetime', 'startDatetime') ?? oldDateTime(value(input, 'data', 'date'), value(input, 'horaInicio', 'start_time'));
    const end = value(input, 'end_datetime', 'endDatetime') ?? oldDateTime(value(input, 'data', 'date'), value(input, 'horaFim', 'end_time'));
    return {
        id: input.id,
        space_id: value(input, 'space_id', 'spaceId', 'espacoId'),
        user_id: value(input, 'user_id', 'userId', 'usuarioId'),
        start_datetime: start === undefined ? undefined : asDate(start),
        end_datetime: end === undefined ? undefined : asDate(end),
        status: normalizeStatus(value(input, 'status')),
        rejection_reason: value(input, 'rejection_reason', 'rejectionReason', 'motivoRejeicao') ?? null,
        created_at: value(input, 'created_at', 'createdAt') ? asDate(value(input, 'created_at', 'createdAt')) : new Date()
    };
}
module.exports = { value, has, user, company, space, availability, reservation, normalizeStatus, asDate, hashIfNeeded };
