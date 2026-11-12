const mongoose = require('mongoose');

const disponibilidadeSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    space_id: { type: Number, required: true, min: 1 },
    day_of_week: { type: Number, required: true, min: 0, max: 6 },
    start_time: { type: String, required: true, trim: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end_time: { type: String, required: true, trim: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    is_external_allowed: { type: Boolean, default: false, required: true },
    valid_on: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; return ret; } }
});

disponibilidadeSchema.index(
    { space_id: 1, day_of_week: 1, start_time: 1, end_time: 1 },
    { unique: true, name: 'uniq_disponibilidade_recorrente', partialFilterExpression: { valid_on: null } }
);
disponibilidadeSchema.index(
    { space_id: 1, valid_on: 1, start_time: 1, end_time: 1 },
    { unique: true, name: 'uniq_disponibilidade_data', partialFilterExpression: { valid_on: { $type: 'string' } } }
);

module.exports = mongoose.model('Disponibilidade', disponibilidadeSchema);
