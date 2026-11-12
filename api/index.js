require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { connectDatabase } = require('./config/database');
const errorHandler = require('./utils/errorHandler');
const { authenticate, authorize } = require('./middleware/auth');
const swaggerSpecSource = require('./swagger.json');
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
const staffAuth = [authenticate, authorize('ADMIN', 'RECEPTION')];
app.use('/dashboard', ...staffAuth, dashboardRoutes);
app.use('/usuarios', authenticate, authorize('ADMIN'), usuariosRoutes);
app.use('/empresas', ...staffAuth, empresasRoutes);
app.use('/espacos', ...staffAuth, espacosRoutes);
app.use('/disponibilidades', ...staffAuth, disponibilidadesRoutes);
app.use('/reservas', ...staffAuth, reservasRoutes);
const swaggerSpec = { ...swaggerSpecSource, servers: [{ url: `http://localhost:${port}` }] };
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
if (require.main === module) startServer().catch((error) => {
    if (error.code === 'UNIQUE_CONSTRAINT_PRECHECK') console.error(error.message);
    else console.error('Não foi possível iniciar a aplicação. Verifique se o MongoDB local está ativo e as configurações locais.');
    process.exitCode = 1;
});
module.exports = { app, startServer };
