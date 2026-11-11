const express = require('express');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const Espaco = require('../models/Espaco');
const Disponibilidade = require('../models/Disponibilidade');
const Reserva = require('../models/Reserva');
const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();
router.get('/stats', asyncHandler(async (_req, res) => {
    const [usuarios, empresas, espacos, disponibilidades, reservas, ultimasReservas] = await Promise.all([
        Usuario.countDocuments(), Empresa.countDocuments(), Espaco.countDocuments(), Disponibilidade.countDocuments(), Reserva.countDocuments(), Reserva.find().sort({ id: -1 }).limit(5)
    ]);
    return res.json({ usuarios, empresas, espacos, disponibilidades, reservas, ultimasReservas });
}));
module.exports = router;
