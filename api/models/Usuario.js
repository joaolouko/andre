const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: ['ADMIN', 'CLIENT', 'RECEPTION'], default: 'CLIENT', required: true },
    cpf_cnpj: { type: String, default: null, trim: true },
    company_id: { type: Number, default: null, min: 1 },
    phone: { type: String, default: null, trim: true },
    created_at: { type: Date, default: Date.now, required: true }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; delete ret.password_hash; delete ret.senha; delete ret.password; return ret; } },
    toObject: { transform(_doc, ret) { delete ret._id; delete ret.password_hash; delete ret.senha; delete ret.password; return ret; } }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
