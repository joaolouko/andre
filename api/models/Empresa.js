const mongoose = require('mongoose');
const { cnpjKey } = require('../utils/uniqueKeys');

const empresaSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    corporate_name: { type: String, required: true, trim: true },
    trade_name: { type: String, required: true, trim: true },
    cnpj: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    created_at: { type: Date, default: Date.now, required: true },
    _cnpj_key: { type: String, default: null, select: false }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; delete ret._cnpj_key; return ret; } }
});

empresaSchema.pre('validate', function setUniqueKeys() {
    this._cnpj_key = cnpjKey(this.cnpj);
});
empresaSchema.index({ _cnpj_key: 1 }, { unique: true, name: 'uniq_empresa_cnpj_key', partialFilterExpression: { _cnpj_key: { $type: 'string' } } });

module.exports = mongoose.model('Empresa', empresaSchema);
