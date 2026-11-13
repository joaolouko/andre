const mongoose = require('mongoose');

const bloqueioSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    space_id: { type: Number, required: true, min: 1 },
    kind: { type: String, enum: ['MAINTENANCE', 'INTERNAL_EVENT'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date, required: true },
    created_by: { type: Number, required: true, min: 1 },
    created_at: { type: Date, default: Date.now, required: true }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; return ret; } }
});

bloqueioSchema.pre('validate', function validateRange() {
    if (this.start_datetime && this.end_datetime && this.end_datetime <= this.start_datetime) {
        this.invalidate('end_datetime', 'end_datetime deve ser posterior a start_datetime');
    }
});
bloqueioSchema.index({ space_id: 1, start_datetime: 1, end_datetime: 1 }, { name: 'bloqueio_espaco_periodo' });

module.exports = mongoose.model('Bloqueio', bloqueioSchema);
