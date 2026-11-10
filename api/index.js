require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { connectDatabase } = require('./config/database');
const errorHandler = require('./utils/errorHandler');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const usuariosRoutes = require('./routes/usuarios');
const empresasRoutes = require('./routes/empresas');
const espacosRoutes = require('./routes/espacos');
const disponibilidadesRoutes = require('./routes/disponibilidades');
const reservasRoutes = require('./routes/reservas');

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/empresas', empresasRoutes);
app.use('/espacos', espacosRoutes);
app.use('/disponibilidades', disponibilidadesRoutes);
app.use('/reservas', reservasRoutes);

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Reservas de Espaços',
            version: '1.0.0',
            description: 'API de gestão de espaços, empresas, disponibilidades, reservas e usuários'
        },
        servers: [{ url: `http://localhost:${port}` }]
    },
    apis: [path.join(__dirname, 'routes/*.js')]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

try {
    fs.writeFileSync(path.join(__dirname, 'swagger.json'), JSON.stringify(swaggerSpec, null, 2));
} catch (e) {
    // ignorar caso não tenha permissão de escrita
}

app.get('/swagger.json', (_req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((_req, res) => res.status(404).json({ mensagem: 'Rota não encontrada' }));
app.use(errorHandler);

async function startServer() {
    await connectDatabase();
    return app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
        console.log(`Documentação Swagger em http://localhost:${port}/api-docs`);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Não foi possível iniciar a aplicação. Verifique se o MongoDB local está ativo.', error.message);
        process.exitCode = 1;
    });
}

module.exports = { app, startServer };
