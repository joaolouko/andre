const mongoose = require('mongoose');

const espacoSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['COWORKING', 'LAB', 'MEETING_ROOM'], default: 'MEETING_ROOM', required: true },
    capacity: { type: Number, required: true, min: 1 },
    description: { type: String, default: '', trim: true },
    is_active: { type: Boolean, default: true, required: true },
    company_id: { type: Number, default: null, min: 1 }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; return ret; } }
});

module.exports = mongoose.model('Espaco', espacoSchema);
