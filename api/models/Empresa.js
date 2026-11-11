const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    corporate_name: { type: String, required: true, trim: true },
    trade_name: { type: String, required: true, trim: true },
    cnpj: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    created_at: { type: Date, default: Date.now, required: true }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; return ret; } }
});

module.exports = mongoose.model('Empresa', empresaSchema);
