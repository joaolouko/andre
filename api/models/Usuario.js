const mongoose = require('mongoose');
const { emailKey, identityKey } = require('../utils/uniqueKeys');

const usuarioSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: ['ADMIN', 'CLIENT', 'RECEPTION'], default: 'CLIENT', required: true },
    cpf_cnpj: { type: String, default: null, trim: true },
    company_id: { type: Number, default: null, min: 1 },
    phone: { type: String, default: null, trim: true },
    created_at: { type: Date, default: Date.now, required: true },
    _email_key: { type: String, default: null, select: false },
    _cpf_cnpj_key: { type: String, default: null, select: false }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; delete ret._email_key; delete ret._cpf_cnpj_key; delete ret.password_hash; delete ret.senha; delete ret.password; return ret; } },
    toObject: { transform(_doc, ret) { delete ret._id; delete ret._email_key; delete ret._cpf_cnpj_key; delete ret.password_hash; delete ret.senha; delete ret.password; return ret; } }
});

usuarioSchema.pre('validate', function setUniqueKeys() {
    this._email_key = emailKey(this.email);
    this._cpf_cnpj_key = identityKey(this.cpf_cnpj);
});
usuarioSchema.index({ _email_key: 1 }, { unique: true, name: 'uniq_usuario_email_key', partialFilterExpression: { _email_key: { $type: 'string' } } });
usuarioSchema.index({ _cpf_cnpj_key: 1 }, { unique: true, name: 'uniq_usuario_cpf_cnpj_key', partialFilterExpression: { _cpf_cnpj_key: { $type: 'string' } } });

module.exports = mongoose.model('Usuario', usuarioSchema);
