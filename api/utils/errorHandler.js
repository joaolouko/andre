function errorHandler(error, _req, res, _next) {
    if (error.name === 'ValidationError' || error.name === 'CastError' || error.name === 'StrictModeError') {
        return res.status(400).json({ mensagem: 'Dados inválidos', erro: error.message });
    }
    if (error.code === 11000) return res.status(409).json({ mensagem: 'Já existe um registro com estes dados únicos' });
    console.error(`Erro interno${error.name ? ` (${error.name})` : ''}`);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
}
module.exports = errorHandler;
