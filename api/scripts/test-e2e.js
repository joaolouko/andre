const assert = require('node:assert/strict');

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3000';

async function runTests() {
    console.log('--- INICIANDO TESTES END-TO-END DO SISTEMA GESTÃO DE ESPAÇOS ---');

    // 1. Testar Swagger e API Docs
    console.log('\n[1/10] Verificando Swagger e documentação OpenAPI...');
    const swaggerRes = await fetch(`${API_BASE}/swagger.json`);
    assert.equal(swaggerRes.status, 200, 'Swagger JSON deve retornar 200');
    const swaggerData = await swaggerRes.json();
    assert.equal(swaggerData.openapi, '3.0.0');
    console.log('✓ Swagger spec válido (v3.0.0), rotas documentadas:', Object.keys(swaggerData.paths).length);

    // 2. Testar Frontend rotas
    console.log('\n[2/10] Verificando disponibilidade das rotas do Frontend...');
    const pages = ['/', '/login', '/dashboard', '/usuarios', '/empresas', '/espacos', '/disponibilidades', '/reservas'];
    for (const page of pages) {
        const res = await fetch(`${FRONTEND_BASE}${page}`);
        assert.equal(res.status, 200, `Página ${page} deve responder com status 200`);
        console.log(`✓ Frontend ${page} respondeu com HTTP 200`);
    }

    // 3. Testar Autenticação (Login)
    console.log('\n[3/10] Testando autenticação de usuário...');
    const loginFail = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'joao@email.com', senha: 'senha-errada' })
    });
    assert.equal(loginFail.status, 401, 'Senha errada deve retornar 401');
    console.log('✓ Validação de senha incorreta retornou 401 Unauthorized');

    const loginSuccess = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'joao@email.com', senha: '123456' })
    });
    assert.equal(loginSuccess.status, 200, 'Login correto deve retornar 200');
    const authData = await loginSuccess.json();
    assert.ok(authData.token, 'Deve retornar token');
    assert.equal(authData.usuario.email, 'joao@email.com');
    console.log('✓ Login realizado com sucesso para:', authData.usuario.nome, '(Token gerado)');

    // 4. Testar verificação de sessão (GET /auth/me)
    console.log('\n[4/10] Testando verificação de sessão (/auth/me)...');
    const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authData.token}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.usuario.id, authData.usuario.id);
    console.log('✓ Token validado com sucesso para usuário ID:', meData.usuario.id);

    // 5. Testar CRUD Usuários
    console.log('\n[5/10] Testando CRUD completo de Usuários...');
    const novoUsuario = await (await fetch(`${API_BASE}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Carlos Silva Teste', email: 'carlos.teste@email.com', telefone: '48988887777', senha: 'teste' })
    })).json();
    assert.ok(novoUsuario.id, 'Novo usuário deve ter ID gerado');
    console.log('✓ Criado usuário ID:', novoUsuario.id);

    const usuarioConsultado = await (await fetch(`${API_BASE}/usuarios/${novoUsuario.id}`)).json();
    assert.equal(usuarioConsultado.nome, 'Carlos Silva Teste');
    console.log('✓ Consulta de usuário por ID realizada com sucesso');

    const usuarioAtualizado = await (await fetch(`${API_BASE}/usuarios/${novoUsuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Carlos Silva Atualizado', email: 'carlos.teste@email.com', telefone: '48988887777' })
    })).json();
    assert.equal(usuarioAtualizado.nome, 'Carlos Silva Atualizado');
    console.log('✓ Atualização de usuário (PUT) realizada com sucesso');

    // 6. Testar CRUD Empresas
    console.log('\n[6/10] Testando CRUD completo de Empresas...');
    const novaEmpresa = await (await fetch(`${API_BASE}/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Tech Hub Inovação', cnpj: '98.765.432/0001-10', email: 'contato@techhub.com', telefone: '4832221100' })
    })).json();
    assert.ok(novaEmpresa.id, 'Nova empresa deve ter ID gerado');
    console.log('✓ Criada empresa ID:', novaEmpresa.id, novaEmpresa.nome);

    const empresaConsultada = await (await fetch(`${API_BASE}/empresas/${novaEmpresa.id}`)).json();
    assert.equal(empresaConsultada.nome, 'Tech Hub Inovação');

    const empresaAtualizada = await (await fetch(`${API_BASE}/empresas/${novaEmpresa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Tech Hub Inovação e Negócios', cnpj: '98.765.432/0001-10', email: 'contato@techhub.com', telefone: '4832221100' })
    })).json();
    assert.equal(empresaAtualizada.nome, 'Tech Hub Inovação e Negócios');
    console.log('✓ Atualização de empresa realizada com sucesso');

    // 7. Testar CRUD Espaços com relacionamento de Empresa
    console.log('\n[7/10] Testando CRUD completo de Espaços (com relacionamento)...');
    const novoEspaco = await (await fetch(`${API_BASE}/espacos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Auditório Principal', descricao: 'Auditório com projetor 4K e acústica tratada', capacidade: 50, empresaId: novaEmpresa.id })
    })).json();
    assert.ok(novoEspaco.id);
    assert.equal(novoEspaco.empresaId, novaEmpresa.id);
    console.log('✓ Criado espaço ID:', novoEspaco.id, 'vinculado à empresa ID:', novoEspaco.empresaId);

    const espacoAtualizado = await (await fetch(`${API_BASE}/espacos/${novoEspaco.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Auditório Principal Premium', descricao: 'Auditório com projetor 4K', capacidade: 60, empresaId: novaEmpresa.id })
    })).json();
    assert.equal(espacoAtualizado.nome, 'Auditório Principal Premium');
    assert.equal(espacoAtualizado.capacidade, 60);
    console.log('✓ Atualização de espaço realizada com sucesso');

    // 8. Testar CRUD Disponibilidades com relacionamento de Espaço
    console.log('\n[8/10] Testando CRUD completo de Disponibilidades...');
    const novaDisp = await (await fetch(`${API_BASE}/disponibilidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacoId: novoEspaco.id, data: '2026-11-20', horaInicio: '09:00', horaFim: '17:00' })
    })).json();
    assert.ok(novaDisp.id);
    assert.equal(novaDisp.espacoId, novoEspaco.id);
    console.log('✓ Criada disponibilidade ID:', novaDisp.id, 'para espaço ID:', novoEspaco.id);

    const dispAtualizada = await (await fetch(`${API_BASE}/disponibilidades/${novaDisp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacoId: novoEspaco.id, data: '2026-11-20', horaInicio: '08:30', horaFim: '17:30' })
    })).json();
    assert.equal(dispAtualizada.horaInicio, '08:30');
    console.log('✓ Atualização de disponibilidade realizada com sucesso');

    // 9. Testar CRUD Reservas com relacionamentos (Usuário + Espaço)
    console.log('\n[9/10] Testando CRUD completo de Reservas...');
    const novaReserva = await (await fetch(`${API_BASE}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: novoUsuario.id, espacoId: novoEspaco.id, data: '2026-11-20', horaInicio: '10:00', horaFim: '12:00', status: 'confirmada' })
    })).json();
    assert.ok(novaReserva.id);
    assert.equal(novaReserva.usuarioId, novoUsuario.id);
    assert.equal(novaReserva.espacoId, novoEspaco.id);
    console.log('✓ Criada reserva ID:', novaReserva.id, 'Usuário:', novoUsuario.id, 'Espaço:', novoEspaco.id);

    const reservaAtualizada = await (await fetch(`${API_BASE}/reservas/${novaReserva.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: novoUsuario.id, espacoId: novoEspaco.id, data: '2026-11-20', horaInicio: '10:00', horaFim: '13:00', status: 'confirmada' })
    })).json();
    assert.equal(reservaAtualizada.horaFim, '13:00');
    console.log('✓ Atualização de reserva realizada com sucesso');

    // Testar exclusão da reserva
    const delReserva = await (await fetch(`${API_BASE}/reservas/${novaReserva.id}`, { method: 'DELETE' })).json();
    console.log('✓ Exclusão de reserva confirmada:', delReserva.mensagem);

    // Testar exclusão da disponibilidade
    const delDisp = await (await fetch(`${API_BASE}/disponibilidades/${novaDisp.id}`, { method: 'DELETE' })).json();
    console.log('✓ Exclusão de disponibilidade confirmada:', delDisp.mensagem);

    // Testar exclusão do espaço
    const delEspaco = await (await fetch(`${API_BASE}/espacos/${novoEspaco.id}`, { method: 'DELETE' })).json();
    console.log('✓ Exclusão de espaço confirmada:', delEspaco.mensagem);

    // Testar exclusão da empresa
    const delEmpresa = await (await fetch(`${API_BASE}/empresas/${novaEmpresa.id}`, { method: 'DELETE' })).json();
    console.log('✓ Exclusão de empresa confirmada:', delEmpresa.mensagem);

    // Testar exclusão do usuário
    const delUsuario = await (await fetch(`${API_BASE}/usuarios/${novoUsuario.id}`, { method: 'DELETE' })).json();
    console.log('✓ Exclusão de usuário confirmada:', delUsuario.mensagem);

    // 10. Testar Indicadores do Dashboard
    console.log('\n[10/10] Testando indicadores consolidados do Dashboard (/dashboard/stats)...');
    const statsRes = await (await fetch(`${API_BASE}/dashboard/stats`)).json();
    assert.ok(typeof statsRes.usuarios === 'number');
    assert.ok(typeof statsRes.empresas === 'number');
    assert.ok(typeof statsRes.espacos === 'number');
    assert.ok(typeof statsRes.disponibilidades === 'number');
    assert.ok(typeof statsRes.reservas === 'number');
    assert.ok(Array.isArray(statsRes.ultimasReservas));
    console.log('✓ Indicadores reais retornados da API:', JSON.stringify(statsRes, null, 2));

    console.log('\n======================================================');
    console.log('TODOS OS 10 TESTES END-TO-END PASSARAM COM SUCESSO! 100%');
    console.log('======================================================');
}

runTests().catch((err) => {
    console.error('FALHA NOS TESTES E2E:', err);
    process.exit(1);
});

