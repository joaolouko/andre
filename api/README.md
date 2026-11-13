# Gestão de Espaços — API

API REST em Node.js e Express para gerir usuários, empresas, espaços, disponibilidades e reservas. A persistência da aplicação é feita em MongoDB local através do Mongoose; os ficheiros em `data/` servem apenas para a importação inicial opcional.

## Requisitos

- Node.js 18 ou superior e npm.
- MongoDB Community Server instalado localmente e em execução. Esta aplicação não utiliza MongoDB Atlas.

A ligação predefinida é `mongodb://127.0.0.1:27017`, com a base de dados `gestao_espacos`. Pode alterar a URI através de `MONGODB_URI` e o nome da base através de `MONGODB_DATABASE`.

Depois de `npm run import-json`, o banco de demonstração tem contas para `ADMIN`, `CLIENT` e `RECEPTION`; os e-mails e a senha local constam na tabela do README da raiz. Os hashes bcrypt, e não as senhas em texto simples, são persistidos.

## Instalação e execução

Na pasta do projeto, instale as dependências:

```bash
npm install
```

Inicie o serviço MongoDB local antes da API. Exemplos de comandos para sistemas com systemd:

```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

Arranque a aplicação:

```bash
npm start
```

Por omissão, a API fica disponível em `http://localhost:3001` e a documentação Swagger em `http://localhost:3001/api-docs`. Para usar outra porta, defina a variável `PORT`. Em desenvolvimento, pode usar `npm run dev`.

## Importação dos dados JSON existentes

Os registos existentes em `data/*.json` não são lidos durante o funcionamento normal da API. Para os importar uma vez para o MongoDB local, execute:

```bash
npm run import-json
```

O script faz upsert por `id`: registos já existentes não são substituídos; os novos são inseridos, e os contadores são atualizados para que os IDs criados pela API continuem a sequência. Pode executar novamente o importador sem criar duplicados. Faça uma cópia de segurança da base antes de operações de migração relevantes.

## Rotas

| Método | Caminho | Operação |
|---|---|---|
| GET, POST | `/usuarios` | Listar ou criar usuários |
| GET, PUT, DELETE | `/usuarios/:id` | Consultar, atualizar ou remover um usuário |
| GET, POST | `/empresas` | Listar ou criar empresas |
| GET, PUT, DELETE | `/empresas/:id` | Consultar, atualizar ou remover uma empresa |
| GET, POST | `/espacos` | Listar ou criar espaços |
| GET, PUT, DELETE | `/espacos/:id` | Consultar, atualizar ou remover um espaço |
| GET | `/disponibilidades` | Listar disponibilidades |
| GET | `/disponibilidades/data/:data` | Pesquisar disponibilidades por data (`AAAA-MM-DD`) |
| GET, PUT, DELETE | `/disponibilidades/:id` | Consultar, atualizar ou remover uma disponibilidade |
| POST | `/disponibilidades` | Criar uma disponibilidade |
| GET, POST | `/reservas` | Listar ou criar reservas |
| GET | `/reservas/data/:data` | Pesquisar reservas por data (`AAAA-MM-DD`) |
| GET, PUT, DELETE | `/reservas/:id` | Consultar, atualizar ou remover uma reserva |
| GET | `/reservas/options` | Opções limitadas de solicitantes e espaços para a equipe |
| POST | `/reservas/:id/approve` | Aprovar uma solicitação (ADMIN) |
| POST | `/reservas/:id/reject` | Rejeitar com justificativa (ADMIN) |
| GET | `/agenda?from=AAAA-MM-DD&to=AAAA-MM-DD` | Agenda de até 62 dias (ADMIN/RECEPTION) |
| GET, POST | `/bloqueios` | Consultar ou criar manutenção/evento interno |
| GET, PUT, PATCH, DELETE | `/bloqueios/:id` | Consultar, editar ou remover bloqueio |
| GET | `/portal/spaces` | Catálogo de espaços ativos (CLIENT) |
| GET | `/portal/availability?space_id=1&date=AAAA-MM-DD` | Consultar janelas e períodos ocupados (CLIENT) |
| GET, POST | `/portal/reservations` | Consultar reservas próprias ou solicitar espaço (CLIENT) |
| PATCH | `/portal/reservations/:id/cancel` | Cancelar apenas a própria reserva (CLIENT) |

Os IDs numéricos e os campos relacionais (`empresaId`, `espacoId` e `usuarioId`) foram preservados para manter compatibilidade com os dados e os contratos anteriores. Novos IDs são gerados por contadores atómicos no MongoDB. Os erros de validação retornam HTTP 400, referências inexistentes HTTP 404 e erros inesperados HTTP 500.

### Prevenção de cadastros duplicados

A API verifica duplicidades antes de criar ou atualizar registros e o MongoDB mantém índices únicos para proteger também contra requisições concorrentes. São considerados duplicados: usuários com o mesmo e-mail (ignorando maiúsculas/minúsculas e espaços externos) ou CPF/CNPJ (comparado apenas pelos dígitos); empresas com o mesmo CNPJ (apenas dígitos); espaços com o mesmo nome na mesma empresa (ignorando caixa e espaços externos); e disponibilidades do mesmo espaço com o mesmo dia recorrente e horário, ou com a mesma data específica e horário. As disponibilidades só são consideradas iguais quando os limites de início e fim são iguais; a regra não bloqueia, por si só, intervalos parcialmente sobrepostos.

Uma atualização pode manter os identificadores do próprio registro, mas não pode assumir os dados únicos de outro. Conflitos retornam HTTP `409 Conflict` com uma mensagem indicando o campo duplicado. Na inicialização, os índices são verificados e os dados existentes são preparados; se a base já contiver duplicatas, a API informa os registros envolvidos e não inicia até que sejam corrigidos.

### Perfis, reservas e bloqueios

`ADMIN` tem gestão completa e é o único perfil que aprova ou rejeita. `RECEPTION` opera reservas, agenda, espaços, disponibilidades, empresas e bloqueios, mas não pode gerir usuários nem alterar pedidos para `APPROVED`/`REJECTED`. `CLIENT` usa as rotas `/portal`; a API deriva a identidade do token JWT e limita as consultas e os cancelamentos às próprias reservas.

Novas solicitações começam em `PENDING`. As transições de estado permitidas são `PENDING → APPROVED/REJECTED/CANCELLED` e `APPROVED → CANCELLED`; a rejeição exige justificativa. Cada solicitação, edição, aprovação, rejeição e cancelamento é preservado em `history`. `DELETE /reservas/:id` cancela de forma lógica, não apaga a trilha de auditoria.

Espaços aceitam `equipment` como lista estruturada de textos. `Bloqueio` representa um período pontual `MAINTENANCE` ou `INTERNAL_EVENT`; a API recusa bloqueios que se sobreponham a uma reserva ativa ou a outro bloqueio e também recusa novas reservas que atinjam esses períodos. O endpoint de agenda combina reservas, janelas, espaços e bloqueios.

O dashboard calcula para o mês corrente as horas aprovadas, ocupação relativa às horas de disponibilidade publicadas, pendências, espaços ativos e horas de início com maior procura.

Os campos auxiliares de normalização são internos e não aparecem nas respostas da API. A primeira inicialização após esta alteração prepara as chaves dos documentos existentes e cria os índices únicos; essa preparação não apaga registros. Se já houver duplicatas, ajuste ou remova os registros repetidos no banco antes de reiniciar.

## Testes

```bash
npm test
```

O comando usa o executor de testes nativo do Node.js. A execução da API e do importador requer que o serviço MongoDB esteja acessível localmente.
