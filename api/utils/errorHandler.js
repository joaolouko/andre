function duplicateKeyMessage(error) {
    const fields = Object.keys(error.keyPattern || {});
    if (fields.includes('_email_key')) return 'Este e-mail já está cadastrado em outro usuário.';
    if (fields.includes('_cpf_cnpj_key')) return 'Este CPF/CNPJ já está cadastrado em outro usuário.';
    if (fields.includes('_cnpj_key')) return 'Este CNPJ já está cadastrado em outra empresa.';
    if (fields.includes('_name_key')) return 'Já existe um espaço com esse nome cadastrado nesta empresa.';
    if (fields.includes('valid_on') || fields.includes('day_of_week')) return 'Esta disponibilidade já está cadastrada para o mesmo espaço e período.';
    if (fields.includes('id')) return 'Já existe um cadastro com este identificador.';
    return 'Já existe um cadastro com estes dados únicos.';
}

function errorHandler(error, _req, res, _next) {
    if (error.status === 409) return res.status(409).json({ mensagem: error.message });
    if (error.name === 'ValidationError' || error.name === 'CastError' || error.name === 'StrictModeError') {
        return res.status(400).json({ mensagem: 'Dados inválidos', erro: error.message });
    }
    if (error.code === 11000) return res.status(409).json({ mensagem: duplicateKeyMessage(error) });
    console.error(`Erro interno${error.name ? ` (${error.name})` : ''}`);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
}
module.exports = errorHandler;
