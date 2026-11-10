const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../index');

test('GET /swagger.json retorna a especificação OpenAPI', async () => {
    const server = app.listen(0);
    const { port } = server.address();
    try {
        const res = await fetch(`http://127.0.0.1:${port}/swagger.json`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.openapi, '3.0.0');
        assert.ok(data.paths['/auth/login']);
        assert.ok(data.paths['/usuarios']);
        assert.ok(data.paths['/empresas']);
        assert.ok(data.paths['/espacos']);
        assert.ok(data.paths['/disponibilidades']);
        assert.ok(data.paths['/reservas']);
    } finally {
        server.close();
    }
});

