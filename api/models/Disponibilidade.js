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

module.exports = mongoose.model('Disponibilidade', disponibilidadeSchema);
