# Gestão de Espaços — Sistema Completo

Sistema web full-stack completo para gestão de espaços físicos, empresas proprietárias, disponibilidades, reservas e usuários, com persistência em MongoDB, API REST documentada com Swagger e frontend moderno no estilo Dashboard SaaS desenvolvido em React / Next.js com Tailwind CSS e Axios.

---

## 🚀 Arquitetura e Tecnologias

- **Frontend:**
  - Next.js (App Router) + React
  - Tailwind CSS para estilização moderna e responsiva
  - Axios para camada centralizada de comunicação HTTP
  - Lucide React para iconografia profissional
  - Context API para controle de autenticação e sessão

- **Backend:**
  - Node.js + Express
  - Express Router com arquitetura modular
  - Mongoose ODM para modelagem e persistência
  - Swagger UI e OpenAPI 3.0 (`/api-docs` e `/swagger.json`)
  - Suporte completo a CORS e tratamento global de erros

- **Banco de Dados:**
  - MongoDB Community Server local (`mongodb://127.0.0.1:27017/gestao_espacos`)

---

## 📋 Credenciais para Acesso

O sistema já conta com usuário administrador pré-cadastrado no banco:
- **E-mail:** `joao@email.com`
- **Senha:** `123456`

*(A tela de login conta também com um botão de preenchimento rápido para demonstração e avaliação acadêmica).*

---

## ⚙️ Como Executar a Aplicação Localmente

### 1. Iniciar o MongoDB Local

Caso o serviço do MongoDB não esteja ativo, inicie apontando para o diretório de dados:

```powershell
& "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "c:\Users\lab202a\Documents\andre\mongo-data" --port 27017
```

### 2. Iniciar o Backend (API REST)

Em um terminal:

```bash
cd api
npm install
npm run import-json    # (opcional: importa dados iniciais para o MongoDB)
npm start
```

- A API estará rodando em: `http://localhost:3001`
- A documentação Swagger estará em: `http://localhost:3001/api-docs`
- A especificação OpenAPI JSON estará em: `http://localhost:3001/swagger.json`

### 3. Iniciar o Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run build          # Compila o build otimizado de produção
npm start              # Inicia o servidor em http://localhost:3000
```
*(Ou use `npm run dev` para modo de desenvolvimento).*

Acesse o sistema no navegador em: **`http://localhost:3000`**

---

## 🧪 Execução de Testes Automatizados

O projeto possui tanto testes unitários de modelos quanto testes end-to-end (E2E) completos:

### Testes Unitários do Backend:
```bash
cd api
npm test
```

### Testes End-to-End (E2E) de Todas as Rotas e Funcionalidades:
```bash
cd api
npm run test:e2e
```
*O teste E2E valida a documentação Swagger, todas as rotas do frontend, autenticação (login válido e inválido), verificação de sessão, o CRUD completo das 5 entidades com seus relacionamentos e os indicadores do dashboard.*

---

## 📦 Entidades e Operações CRUD Implementadas

1. **Usuários (`/usuarios`):** Cadastro de nome, e-mail, telefone e senha, com busca e ações completas de CRUD.
2. **Empresas (`/empresas`):** Cadastro de razão social, CNPJ, e-mail e telefone de contato.
3. **Espaços (`/espacos`):** Salas e auditórios associados à empresa proprietária (via select dinâmico), capacidade e descrição.
4. **Disponibilidades (`/disponibilidades`):** Janelas de datas e horários disponíveis por espaço físico.
5. **Reservas (`/reservas`):** Agendamentos relacionando Usuário Solicitante, Espaço Físico, Data, Horário e Status (`confirmada`, `pendente`, `cancelada`).
6. **Dashboard (`/dashboard`):** Indicadores em tempo real obtidos diretamente da API com métricas consolidadas e tabela das últimas reservas.

