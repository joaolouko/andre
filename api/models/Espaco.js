const mongoose = require('mongoose');
const { spaceNameKey } = require('../utils/uniqueKeys');

const espacoSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['COWORKING', 'LAB', 'MEETING_ROOM'], default: 'MEETING_ROOM', required: true },
    capacity: { type: Number, required: true, min: 1 },
    description: { type: String, default: '', trim: true },
    equipment: { type: [{ type: String, trim: true }], default: [] },
    is_active: { type: Boolean, default: true, required: true },
    company_id: { type: Number, default: null, min: 1 },
    _name_key: { type: String, default: null, select: false }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; delete ret._name_key; return ret; } }
});

espacoSchema.pre('validate', function setUniqueKeys() {
    this._name_key = spaceNameKey(this.name);
    this.equipment = [...new Set((this.equipment || []).map((item) => String(item).trim()).filter(Boolean))];
});
espacoSchema.index({ company_id: 1, _name_key: 1 }, { unique: true, name: 'uniq_espaco_empresa_nome', partialFilterExpression: { _name_key: { $type: 'string' } } });

module.exports = mongoose.model('Espaco', espacoSchema);
