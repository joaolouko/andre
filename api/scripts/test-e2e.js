// Teste de integração manual: cria e remove recursos de avaliação; execute apenas contra API e MongoDB descartáveis.
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
    if (result.status < 200 || result.status >= 300) throw new Error(`${options.method || 'GET'} ${route} -> ${result.status}: ${JSON.stringify(result.data)}`);
    return result.data;
}
async function login(email, password) {
    const result = await request('/auth/login', { method: 'POST', body: { email, password } });
    assert.ok(result.token);
    return result.token;
}

async function run() {
    console.log('E2E API: requer API/Mongo ativos, base descartável e credenciais ADMIN; cria documentos temporários.');
    const spec = await request('/swagger.json');
    assert.equal(spec.openapi, '3.0.0');
    assert.ok(spec.paths['/portal/reservations']);
    assert.ok(spec.paths['/agenda']);
    assert.equal((await attempt('/empresas')).status, 401);

    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'joao@email.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD;
    if (!adminPassword) throw new Error('Defina E2E_ADMIN_PASSWORD para não assumir senha padrão.');
    assert.equal((await attempt('/auth/login', { method: 'POST', body: { email: adminEmail, password: 'senha-incorreta' } })).status, 401);
    const adminToken = await login(adminEmail, adminPassword);
    const me = await request('/auth/me', { token: adminToken });
    assert.equal(me.usuario.email, adminEmail);
    assert.equal(Object.hasOwn(me.usuario, 'password_hash'), false);

    const suffix = `${Date.now()}`;
    const clientPassword = `Client-${suffix}`;
    const receptionPassword = `Reception-${suffix}`;
    const client = await request('/usuarios', { token: adminToken, method: 'POST', body: { name: `E2E Cliente ${suffix}`, email: `client-${suffix}@example.test`, password: clientPassword, role: 'CLIENT', phone: '11999990000' } });
    const reception = await request('/usuarios', { token: adminToken, method: 'POST', body: { name: `E2E Recepção ${suffix}`, email: `reception-${suffix}@example.test`, password: receptionPassword, role: 'RECEPTION', phone: '11999990001' } });
    assert.equal(client.role, 'CLIENT'); assert.equal(reception.role, 'RECEPTION');
    assert.equal((await attempt('/usuarios', { token: await login(reception.email, receptionPassword) })).status, 403);
    const receptionToken = await login(reception.email, receptionPassword);
    const clientToken = await login(client.email, clientPassword);
    assert.equal((await request('/portal/spaces', { token: clientToken })).length >= 0, true);
    assert.equal((await attempt('/reservas', { token: clientToken })).status, 403);
    assert.equal((await attempt('/portal/spaces', { token: receptionToken })).status, 403);
    assert.equal((await request('/reservas/options', { token: receptionToken })).users.some((item) => item.id === client.id), true);

    const company = await request('/empresas', { token: adminToken, method: 'POST', body: { corporate_name: `E2E Corp ${suffix}`, trade_name: `E2E ${suffix}`, cnpj: `${suffix}`.slice(-14), phone: '11999990002', email: `corp-${suffix}@example.test` } });
    const space = await request('/espacos', { token: adminToken, method: 'POST', body: { name: `Sala ${suffix}`, type: 'MEETING_ROOM', capacity: 4, description: 'E2E', equipment: ['Projetor'], is_active: true, company_id: company.id } });
    assert.deepEqual(space.equipment, ['Projetor']);
    const availability = await request('/disponibilidades', { token: adminToken, method: 'POST', body: { space_id: space.id, day_of_week: 5, start_time: '09:30', end_time: '16:30', is_external_allowed: false, valid_on: '2026-11-20' } });

    const bookingInput = { space_id: space.id, user_id: client.id, start_datetime: '2026-11-20T12:30:00.000Z', end_datetime: '2026-11-20T15:00:00.000Z', status: 'PENDING' };
    const concurrentResults = await Promise.all([
        attempt('/reservas', { token: adminToken, method: 'POST', body: bookingInput }),
        attempt('/reservas', { token: adminToken, method: 'POST', body: bookingInput })
    ]);
    assert.deepEqual(concurrentResults.map((result) => result.status).sort(), [201, 409]);
    const booking = concurrentResults.find((result) => result.status === 201).data;
    assert.equal(booking.status, 'PENDING');
    assert.equal((await attempt('/reservas', { token: adminToken, method: 'POST', body: bookingInput })).status, 409, 'duplicata deve ser recusada');
    assert.equal((await request('/portal/reservations', { token: clientToken })).some((item) => item.id === booking.id), true);
    assert.equal((await request(`/portal/availability?space_id=${space.id}&date=2026-11-20`, { token: clientToken })).windows.length, 1);

    const overlap = await attempt('/reservas', { token: adminToken, method: 'POST', body: { ...bookingInput, start_datetime: '2026-11-20T14:00:00.000Z', end_datetime: '2026-11-20T15:00:00.000Z' } });
    assert.equal(overlap.status, 409, 'sobreposição parcial deve ser recusada');
    const outsideWindow = await attempt('/reservas', { token: adminToken, method: 'POST', body: { ...bookingInput, start_datetime: '2026-11-20T20:00:00.000Z', end_datetime: '2026-11-20T20:45:00.000Z' } });
    assert.equal(outsideWindow.status, 409, 'horário fora da janela deve ser recusado');
    const adjacentBooking = await request('/reservas', { token: receptionToken, method: 'POST', body: { ...bookingInput, start_datetime: '2026-11-20T15:00:00.000Z', end_datetime: '2026-11-20T15:30:00.000Z' } });
    const conflictingUpdate = await attempt(`/reservas/${booking.id}`, { token: adminToken, method: 'PATCH', body: { end_datetime: '2026-11-20T15:15:00.000Z' } });
    assert.equal(conflictingUpdate.status, 409, 'atualização que cria sobreposição deve ser recusada');

    assert.equal((await attempt(`/reservas/${booking.id}/approve`, { token: receptionToken, method: 'POST', body: {} })).status, 403);
    const approved = await request(`/reservas/${booking.id}/approve`, { token: adminToken, method: 'POST', body: {} });
    assert.equal(approved.status, 'APPROVED'); assert.ok(approved.history.some((item) => item.action === 'APPROVED'));
    const toReject = await request('/reservas', { token: adminToken, method: 'POST', body: { ...bookingInput, start_datetime: '2026-11-20T15:30:00.000Z', end_datetime: '2026-11-20T16:00:00.000Z' } });
    assert.equal((await attempt(`/reservas/${toReject.id}/reject`, { token: adminToken, method: 'POST', body: {} })).status, 400);
    const rejected = await request(`/reservas/${toReject.id}/reject`, { token: adminToken, method: 'POST', body: { rejection_reason: 'Conflito de agenda E2E' } });
    assert.equal(rejected.status, 'REJECTED'); assert.equal(rejected.rejection_reason, 'Conflito de agenda E2E');

    assert.equal((await attempt('/bloqueios', { token: receptionToken, method: 'POST', body: { space_id: space.id, kind: 'MAINTENANCE', title: 'Conflito', start_datetime: '2026-11-20T13:00:00.000Z', end_datetime: '2026-11-20T13:15:00.000Z' } })).status, 409);
    const block = await request('/bloqueios', { token: receptionToken, method: 'POST', body: { space_id: space.id, kind: 'INTERNAL_EVENT', title: `Evento ${suffix}`, description: 'Teste integrado', start_datetime: '2026-11-20T16:30:00.000Z', end_datetime: '2026-11-20T17:00:00.000Z' } });
    assert.equal((await attempt('/portal/reservations', { token: clientToken, method: 'POST', body: { space_id: space.id, date: '2026-11-20', start_time: '13:30', end_time: '14:00' } })).status, 409);
    const agenda = await request('/agenda?from=2026-11-20&to=2026-11-20', { token: receptionToken });
    assert.ok(agenda.reservations.some((item) => item.id === booking.id)); assert.ok(agenda.blocks.some((item) => item.id === block.id));
    const stats = await request('/dashboard/stats', { token: receptionToken });
    assert.equal(typeof stats.reservas, 'number'); assert.equal(typeof stats.occupancyRate, 'number');

    // Encerrar registros ainda ativos; reservas rejeitadas são intencionalmente preservadas como histórico.
    await request(`/reservas/${booking.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/reservas/${adjacentBooking.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/bloqueios/${block.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/disponibilidades/${availability.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/espacos/${space.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/empresas/${company.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/usuarios/${client.id}`, { token: adminToken, method: 'DELETE' });
    await request(`/usuarios/${reception.id}`, { token: adminToken, method: 'DELETE' });
    console.log('E2E PASS: login e isolamento ADMIN/RECEPTION/CLIENT, portal, reservas pendentes/aprovação/rejeição, justificativa, conflito/duração, bloqueios, agenda, dashboard e MongoDB.');
}

run().catch((error) => { console.error('Falha E2E:', error.message); process.exitCode = 1; });
