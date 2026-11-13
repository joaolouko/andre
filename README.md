# Gestão de Espaços

Aplicação full-stack para administrar usuários, empresas, espaços, disponibilidades e reservas. O projeto mantém a API REST Express e o frontend Next.js existentes, agora com persistência MongoDB local via Mongoose e contrato de dados alinhado ao esquema da disciplina.

## Tecnologias

- **API:** Node.js, Express, Mongoose, JWT, bcryptjs, Swagger/OpenAPI 3.
- **Interface:** Next.js App Router, React, TypeScript, Axios e Tailwind CSS.
- **Banco:** MongoDB Community Server local — `mongodb://127.0.0.1:27017`, base `gestao_espacos`.

## Pré-requisitos

- Node.js 20.9 ou superior e npm.
- MongoDB Community Server instalado localmente. Não é usado MongoDB Atlas.
- Para importação ou migração, mantenha uma cópia de segurança dos dados existentes.

## Executar localmente

### 1. Iniciar o MongoDB local

A partir da pasta raiz deste projeto, crie a pasta de dados local e inicie o `mongod`:

```bash
mkdir -p mongo-data
mongod --dbpath ./mongo-data --port 27017
```

No Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force mongo-data
mongod --dbpath .\mongo-data --port 27017
```

Também é possível iniciar o serviço MongoDB instalado pelo sistema operacional. A API conecta-se ao endereço local `mongodb://127.0.0.1:27017` e usa a base `gestao_espacos` por padrão.

### 2. Configurar e iniciar a API

Noutro terminal:

```bash
cd api
npm ci
cp .env.example .env
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`. Abra `api/.env` e defina um segredo próprio para os tokens, por exemplo, gerando-o com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guarde o resultado em `JWT_SECRET` no ficheiro `api/.env`; não o publique nem o envie para o repositório. As restantes configurações mantêm os valores locais do exemplo. Para a primeira execução, importe os dados de demonstração:

```bash
npm run import-json
npm run dev
```

A importação é idempotente: cria os registos de amostra que ainda não existem e não substitui os registos já armazenados. Para executar em produção local, pode usar `npm start`.

- API: <http://localhost:3001>
- Swagger UI: <http://localhost:3001/api-docs>
- Especificação OpenAPI: <http://localhost:3001/swagger.json>

### 3. Iniciar o frontend

Noutro terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```
No PowerShell, use `Copy-Item .env.example .env.local`. O exemplo aponta para `http://localhost:3001`; ajuste `NEXT_PUBLIC_API_URL` apenas se a API estiver noutra porta. A aplicação fica disponível em <http://localhost:3000>. Para um build de produção, use `npm run build` e depois `npm start`.

### Inicialização automática no Windows

Também pode executar `start-all.bat` ou `start-all.ps1` na raiz do projeto. O script aguarda o MongoDB local, executa `npm run import-json` na API e só depois inicia a API e o frontend. A importação é idempotente: cria os dados de demonstração que faltarem, incluindo o usuário administrador, sem substituir os registros existentes.

## Login de demonstração

Depois de executar `npm run import-json` manualmente ou iniciar pelo `start-all.bat`/`start-all.ps1`, a base de dados de demonstração inclui contas para testar cada perfil:

| Perfil | E-mail | Senha local |
|---|---|---|
| ADMIN | `joao@email.com` | `123456` |
| CLIENT | `cliente.demo@email.com` | `123456` |
| RECEPTION | `recepcao.demo@email.com` | `123456` |

Essas credenciais são exclusivamente para avaliação/desenvolvimento local. Os usuários são inseridos na persistência MongoDB pelo importador e as senhas são armazenadas como hashes bcrypt em `password_hash`; o hash nunca é devolvido pela API. Troque as credenciais antes de qualquer utilização real.

## Entidades e campos

Os nomes abaixo são os nomes canônicos armazenados no MongoDB e enviados pela API. Os rótulos da interface permanecem em português.

| Entidade | Campos principais |
|---|---|
| Usuários (`/usuarios`) | `id`, `name`, `email`, `password_hash` (somente persistência), `role` (`ADMIN`, `CLIENT`, `RECEPTION`), `cpf_cnpj`, `company_id`, `created_at`; `phone` é mantido como campo opcional de compatibilidade. |
| Empresas (`/empresas`) | `id`, `corporate_name`, `trade_name`, `cnpj`, `phone`, `created_at`; `email` continua opcional para compatibilidade com o cadastro anterior. |
| Espaços (`/espacos`) | `id`, `name`, `type` (`COWORKING`, `LAB`, `MEETING_ROOM`), `capacity`, `description`, `equipment` (lista de equipamentos), `is_active`, `company_id` (referência numérica à empresa). |
| Disponibilidades (`/disponibilidades`) | `id`, `space_id`, `day_of_week` (0 domingo a 6 sábado), `start_time`, `end_time`, `is_external_allowed`. `valid_on` é uma extensão opcional para conservar disponibilidades legadas de uma data específica; sem ela, a disponibilidade é semanal. |
| Reservas (`/reservas`) | `id`, `space_id`, `user_id`, `start_datetime`, `end_datetime`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), `rejection_reason`, `created_at`, `history` (trilha de alterações). |
| Bloqueios (`/bloqueios`) | `id`, `space_id`, `kind` (`MAINTENANCE` ou `INTERNAL_EVENT`), título/descrição, início/fim e responsável. |

`id` e as referências são numéricos para preservar o contrato da aplicação existente; o `_id` interno do MongoDB não faz parte da resposta pública. Datas de reservas trafegam como valores ISO 8601 com fuso horário.

## Rotas principais

Todas as rotas de gestão continuam sob os caminhos anteriores e exigem token Bearer obtido em `POST /auth/login`. `ADMIN` e `RECEPTION` podem usar as rotas de gestão; a gestão de usuários é restrita a `ADMIN`.

- Autenticação: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- Dashboard: `GET /dashboard/stats`.
- Portal CLIENT: `GET /portal/spaces`, `GET /portal/availability`, `GET/POST /portal/reservations` e cancelamento de reservas próprias.
- Agenda: `GET /agenda?from=AAAA-MM-DD&to=AAAA-MM-DD`; visualizações mensais, semanais e diárias no frontend.
- Manutenção e eventos internos: CRUD em `/bloqueios`, com validação de conflito no backend.
- CRUD de usuários, empresas, espaços, disponibilidades e reservas: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `PATCH /:id`, `DELETE /:id` nos respetivos caminhos.
- Pesquisa por data mantida para compatibilidade: `GET /reservas/data/:data` e `GET /disponibilidades/data/:data`.

`ADMIN` possui gestão completa e pode aprovar/rejeitar reservas. `RECEPTION` controla a operação sem acesso à gestão de usuários nem poder de aprovação. `CLIENT` recebe um portal separado, só pode solicitar/cancelar reservas próprias e nunca define o próprio `user_id` ou estado da reserva.

Toda solicitação inicia em `PENDING`; a equipe ADMIN pode aprovar ou rejeitar, com justificativa obrigatória para rejeição. Reservas e seus históricos são mantidos após cancelamento. Os bloqueios de manutenção e eventos são gravados no MongoDB e entram tanto na agenda quanto na verificação de disponibilidade.

### Prevenção de cadastros duplicados

A API e os índices únicos do MongoDB impedem usuários com e-mail ou CPF/CNPJ repetido, empresas com CNPJ repetido, espaços com o mesmo nome dentro da mesma empresa e disponibilidades com o mesmo espaço/dia (ou data específica) e horário. Comparações de e-mail e nomes ignoram caixa e espaços; CPF/CNPJ são comparados pelos dígitos. Criar ou atualizar com uma chave já usada por outro registro retorna HTTP `409 Conflict`. Os índices também protegem contra requisições simultâneas; na primeira inicialização, campos internos de comparação são preparados sem apagar registros. Se a base já tiver duplicatas, corrija-as antes de iniciar a API.

### Validação automática de reservas

Ao criar ou alterar uma reserva ativa (`PENDING`/`APPROVED`), a API exige uma disponibilidade aplicável ao `space_id`, à data e ao dia da semana. O intervalo completo, incluindo sua duração, precisa caber em uma única janela. Reservas no mesmo espaço não podem se sobrepor; os intervalos são semiabertos, então uma reserva pode começar exatamente quando a anterior termina. Reservas `REJECTED`/`CANCELLED` não ocupam o recurso. Conflitos ou horários fora da janela retornam HTTP `409`.

O horário de negócio usa `BUSINESS_TIMEZONE` (por padrão `America/Sao_Paulo`, configurável em `api/.env`). A validação é executada no backend e serializa operações concorrentes por espaço dentro de uma instância da API.

A criação de usuário recebe `password` (texto simples apenas no request protegido); o backend gera o hash. Nunca envie nem defina `password_hash` pelo frontend. Os dados de resposta e `/auth/me` não incluem credenciais.

## Migrar documentos já existentes

Se já tem documentos MongoDB no formato anterior em português, **faça primeiro uma cópia de segurança**. A migração disponibilizada pelo backend (`npm run migrate-mongo`) converte esses documentos no lugar sem apagar as coleções. Reveja as regras abaixo, valide o resultado e só depois inicie a nova API:

- `nome`, `telefone` e `senha` de usuários passam para os campos correspondentes; a senha legada é convertida para bcrypt e removida do documento. Usuários sem papel recebem `CLIENT`, exceto o usuário de demonstração `joao@email.com`, que recebe `ADMIN`. CPF/CNPJ e empresa ausentes ficam nulos.
- Em empresas, `nome` é copiado inicialmente para `corporate_name` e `trade_name`, pois o dado legado não distingue os dois; `telefone` vira `phone` e o e-mail opcional é conservado.
- Espaços sem tipo recebem `MEETING_ROOM` e `is_active: true`; os vínculos de empresa são conservados.
- Disponibilidades legadas com uma data específica mantêm-na em `valid_on`; `day_of_week` é derivado dessa data, sem converter silenciosamente uma ocorrência pontual em recorrência semanal.
- Reservas combinam a data e hora antigas em `start_datetime`/`end_datetime`, interpretadas no fuso horário local da máquina que executa a migração; `confirmada`, `pendente` e `cancelada` passam para `APPROVED`, `PENDING` e `CANCELLED`. Registos migrados sem `created_at` recebem o instante da migração.

Exemplo de cópia de segurança antes da migração:

```bash
mongodump --uri="mongodb://127.0.0.1:27017/gestao_espacos" --out=./backup-antes-da-migracao
```

Depois da cópia:

```bash
cd api
npm run migrate-mongo
```

Em base nova, não é necessário executar a migração; use apenas `npm run import-json` para dados de demonstração. `npm run reset-data` é destrutivo: apaga os registos das coleções geridas e recarrega os JSON de amostra. Execute-o somente quando aceitar perder esses dados.

## Testes

```bash
cd api
npm test
```

Os testes de modelos e da especificação Swagger não exigem MongoDB. O teste E2E pode criar, atualizar e excluir registos; execute-o apenas contra uma base descartável e nunca contra dados que queira preservar:

```bash
cd api
npm run test:e2e
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Arquivos de configuração

- `api/.env.example`: porta, URI/base MongoDB local, fuso de negócio (`BUSINESS_TIMEZONE`) e variável para segredo JWT.
- `frontend/.env.example`: URL pública da API.
- `mongo-data/`: arquivos de dados locais do MongoDB; não devem ser versionados ou enviados junto do código.

Não inclua `.env`, `.env.local`, `node_modules`, `.next`, `mongo-data` ou cópias de segurança no arquivo de entrega.
