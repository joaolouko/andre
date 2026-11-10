const express = require('express');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Retorna estatísticas gerais e indicadores do sistema
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Indicadores do painel administrativo
 */
router.get('/stats', asyncHandler(async (_req, res) => {
    const [
        totalUsuarios,
        totalEmpresas,
        totalEspacos,
        totalDisponibilidades,
        totalReservas,
        ultimasReservas
    ] = await Promise.all([
        Usuario.countDocuments(),
        Empresa.countDocuments(),
        Espaco.countDocuments(),
        Disponibilidade.countDocuments(),
        Reserva.countDocuments(),
        Reserva.find().sort({ id: -1 }).limit(5)
    ]);

    res.json({
        usuarios: totalUsuarios,
        empresas: totalEmpresas,
        espacos: totalEspacos,
        disponibilidades: totalDisponibilidades,
        reservas: totalReservas,
        ultimasReservas
    });
}));

module.exports = router;

