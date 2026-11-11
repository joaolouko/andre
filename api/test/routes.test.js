const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../index');

async function withServer(callback) {
    const server = app.listen(0);
    const { port } = server.address();
    try { await callback(`http://127.0.0.1:${port}`); } finally { await new Promise((resolve) => server.close(resolve)); }
}
test('GET /swagger.json expõe OpenAPI canônico e bearer JWT', async () => withServer(async (base) => {
    const res = await fetch(`${base}/swagger.json`); assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.0.0');
    assert.ok(spec.paths['/auth/login']); assert.ok(spec.paths['/usuarios']); assert.ok(spec.paths['/reservas']);
    assert.equal(spec.components.securitySchemes.bearerAuth.bearerFormat, 'JWT');
    assert.deepEqual(spec.components.schemas.Booking.properties.status.enum, ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
    assert.ok(spec.paths['/reservas/{id}'].put.requestBody.content['application/json'].schema.$ref);
    assert.ok(spec.components.schemas.User.properties.password_hash === undefined);
}));
test('rotas de dados exigem bearer JWT sem tocar no Mongo quando token ausente', async () => withServer(async (base) => {
    for (const route of ['/empresas', '/espacos', '/disponibilidades', '/reservas', '/dashboard/stats', '/usuarios']) {
        const response = await fetch(`${base}${route}`); assert.equal(response.status, 401, `${route} deve exigir token`);
    }
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: '', password: '' }) });
    assert.equal(login.status, 400);
}));
