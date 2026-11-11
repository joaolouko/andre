// Teste de integração manual: conecta à API/MongoDB e cria/apaga dados de teste. Não é executado pelo npm test.
const assert = require('node:assert/strict');
const API = process.env.API_BASE || 'http://localhost:3001';

async function attempt(route, { token, method = 'GET', body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API}${route}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    let data = null;
    try { data = await res.json(); } catch { /* A rota pode responder sem JSON. */ }
    return { status: res.status, data };
}

async function request(route, options = {}) {
    const result = await attempt(route, options);
    if (result.status < 200 || result.status >= 300) {
        throw new Error(`${options.method || 'GET'} ${route} -> ${result.status}: ${JSON.stringify(result.data)}`);
    }
    return result.data;
}

async function run() {
    console.log('E2E API: requer API/Mongo ativos, banco descartável e usuário ADMIN de teste.');
    const spec = await request('/swagger.json');
    assert.equal(spec.openapi, '3.0.0');
    assert.ok(spec.components.securitySchemes.bearerAuth);
    assert.equal((await attempt('/empresas')).status, 401);

    const email = process.env.E2E_ADMIN_EMAIL || 'joao@email.com';
    const password = process.env.E2E_ADMIN_PASSWORD;
    if (!password) throw new Error('Defina E2E_ADMIN_PASSWORD para não assumir senha padrão.');
    assert.equal((await attempt('/auth/login', { method: 'POST', body: { email, password: 'senha-incorreta' } })).status, 401);
    const login = await request('/auth/login', { method: 'POST', body: { email, password } });
    assert.ok(login.token);
    assert.equal(login.usuario.email, email);
    assert.equal(Object.hasOwn(login.usuario, 'password_hash'), false);
    const token = login.token;
    const me = await request('/auth/me', { token });
    assert.equal(me.usuario.id, login.usuario.id);

    const suffix = `${Date.now()}`;
    const user = await request('/usuarios', { token, method: 'POST', body: { name: `E2E ${suffix}`, email: `e2e-${suffix}@example.test`, password: `T-${suffix}`, role: 'CLIENT', phone: '4800000000' } });
    assert.equal(user.role, 'CLIENT');
    assert.equal(Object.hasOwn(user, 'password_hash'), false);
    const updatedUser = await request(`/usuarios/${user.id}`, { token, method: 'PUT', body: { name: `E2E atualizado ${suffix}`, email: `e2e-${suffix}@example.test`, role: 'CLIENT', phone: '4800000001' } });
    assert.equal(updatedUser.name, `E2E atualizado ${suffix}`);
    assert.equal((await request(`/usuarios/${user.id}`, { token })).email, user.email);

    const company = await request('/empresas', { token, method: 'POST', body: { corporate_name: `E2E Corp ${suffix}`, trade_name: `E2E ${suffix}`, cnpj: `${suffix}`.slice(-14), phone: '4800000000', email: `corp-${suffix}@example.test` } });
    const updatedCompany = await request(`/empresas/${company.id}`, { token, method: 'PUT', body: { corporate_name: `E2E Corp atualizada ${suffix}`, trade_name: `E2E ${suffix}`, cnpj: `${suffix}`.slice(-14), phone: '4800000001', email: `corp-${suffix}@example.test` } });
    assert.equal(updatedCompany.corporate_name, `E2E Corp atualizada ${suffix}`);
    assert.equal((await request(`/empresas/${company.id}`, { token })).id, company.id);

    const space = await request('/espacos', { token, method: 'POST', body: { name: `Sala ${suffix}`, type: 'MEETING_ROOM', capacity: 4, description: 'E2E', is_active: true, company_id: company.id } });
    const updatedSpace = await request(`/espacos/${space.id}`, { token, method: 'PUT', body: { name: `Sala atualizada ${suffix}`, type: 'LAB', capacity: 5, description: 'E2E atualizado', is_active: true, company_id: company.id } });
    assert.equal(updatedSpace.type, 'LAB');
    assert.equal((await request(`/espacos/${space.id}`, { token })).company_id, company.id);

    const availability = await request('/disponibilidades', { token, method: 'POST', body: { space_id: space.id, day_of_week: 5, start_time: '09:00', end_time: '17:00', is_external_allowed: false, valid_on: '2026-11-20' } });
    const updatedAvailability = await request(`/disponibilidades/${availability.id}`, { token, method: 'PUT', body: { space_id: space.id, day_of_week: 5, start_time: '09:30', end_time: '16:30', is_external_allowed: true, valid_on: '2026-11-20' } });
    assert.equal(updatedAvailability.start_time, '09:30');
    assert.equal((await request(`/disponibilidades/${availability.id}`, { token })).is_external_allowed, true);

    const bookingInput = { space_id: space.id, user_id: user.id, start_datetime: '2026-11-20T12:30:00.000Z', end_datetime: '2026-11-20T15:00:00.000Z', status: 'PENDING' };
    const concurrentResults = await Promise.all([
        attempt('/reservas', { token, method: 'POST', body: bookingInput }),
        attempt('/reservas', { token, method: 'POST', body: bookingInput })
    ]);
    assert.deepEqual(concurrentResults.map((result) => result.status).sort(), [201, 409]);
    const booking = concurrentResults.find((result) => result.status === 201).data;
    assert.equal(booking.status, 'PENDING');
    assert.equal((await attempt('/reservas', { token, method: 'POST', body: bookingInput })).status, 409, 'duplicata deve ser recusada');

    const overlapInput = { ...bookingInput, start_datetime: '2026-11-20T14:00:00.000Z', end_datetime: '2026-11-20T15:00:00.000Z' };
    const overlap = await attempt('/reservas', { token, method: 'POST', body: overlapInput });
    assert.equal(overlap.status, 409, 'sobreposição parcial no mesmo espaço deve ser recusada');
    assert.match(overlap.data.mensagem, /sobreposto/i);

    const outsideWindow = { ...bookingInput, start_datetime: '2026-11-20T19:00:00.000Z', end_datetime: '2026-11-20T19:45:00.000Z' };
    assert.equal((await attempt('/reservas', { token, method: 'POST', body: outsideWindow })).status, 409, 'duração que ultrapassa a janela deve ser recusada');

    const adjacentInput = { ...bookingInput, start_datetime: '2026-11-20T15:00:00.000Z', end_datetime: '2026-11-20T15:30:00.000Z' };
    const adjacentBooking = await request('/reservas', { token, method: 'POST', body: adjacentInput });
    const conflictingUpdate = await attempt(`/reservas/${booking.id}`, { token, method: 'PATCH', body: { end_datetime: '2026-11-20T15:15:00.000Z' } });
    assert.equal(conflictingUpdate.status, 409, 'atualização que cria sobreposição deve ser recusada');

    const patchedBooking = await request(`/reservas/${booking.id}`, { token, method: 'PATCH', body: { status: 'REJECTED', rejection_reason: 'Conflito de agenda' } });
    assert.equal(patchedBooking.status, 'REJECTED');
    const updatedBooking = await request(`/reservas/${booking.id}`, { token, method: 'PUT', body: { space_id: space.id, user_id: user.id, start_datetime: booking.start_datetime, end_datetime: booking.end_datetime, status: 'APPROVED', rejection_reason: null } });
    assert.equal(updatedBooking.status, 'APPROVED');
    const filtered = await request('/reservas/data/2026-11-20', { token });
    assert.ok(filtered.some((item) => item.id === booking.id));
    assert.ok(filtered.some((item) => item.id === adjacentBooking.id));
    const stats = await request('/dashboard/stats', { token });
    assert.equal(typeof stats.reservas, 'number');

    for (const [path, doc] of [['reservas', booking], ['reservas', adjacentBooking], ['disponibilidades', availability], ['espacos', space], ['empresas', company], ['usuarios', user]]) {
        await request(`/${path}/${doc.id}`, { token, method: 'DELETE' });
    }
    console.log('E2E concluído: disponibilidade/duração, duplicata, sobreposição concorrente, PUT/PATCH, filtros e CRUD.');
}

run().catch((error) => {
    console.error('Falha E2E:', error.message);
    process.exitCode = 1;
});
