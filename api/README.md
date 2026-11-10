# Gestão de Espaços — API

API REST em Node.js e Express para gerir usuários, empresas, espaços, disponibilidades e reservas. A persistência da aplicação é feita em MongoDB local através do Mongoose; os ficheiros em `data/` servem apenas para a importação inicial opcional.

## Requisitos

- Node.js 18 ou superior e npm.
- MongoDB Community Server instalado localmente e em execução. Esta aplicação não utiliza MongoDB Atlas.

A ligação predefinida é `mongodb://127.0.0.1:27017`, com a base de dados `gestao_espacos`. Pode alterar a URI através de `MONGODB_URI` e o nome da base através de `MONGODB_DATABASE`.

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

Por omissão, a API fica disponível em `http://localhost:3000` e a documentação Swagger em `http://localhost:3000/api-docs`. Para usar outra porta, defina a variável `PORT`. Em desenvolvimento, pode usar `npm run dev`.

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

Os IDs numéricos e os campos relacionais (`empresaId`, `espacoId` e `usuarioId`) foram preservados para manter compatibilidade com os dados e os contratos anteriores. Novos IDs são gerados por contadores atómicos no MongoDB. Os erros de validação retornam HTTP 400, referências inexistentes HTTP 404 e erros inesperados HTTP 500.

## Testes

```bash
npm test
```

O comando usa o executor de testes nativo do Node.js. A execução da API e do importador requer que o serviço MongoDB esteja acessível localmente.
