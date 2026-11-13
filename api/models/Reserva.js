const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    action: { type: String, enum: ['REQUESTED', 'UPDATED', 'APPROVED', 'REJECTED', 'CANCELLED'], required: true },
    from_status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: null },
    to_status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], required: true },
    changed_by: { type: Number, required: true, min: 1 },
    changed_at: { type: Date, default: Date.now, required: true },
    note: { type: String, default: null, trim: true }
}, { _id: false, versionKey: false });

const reservaSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true, min: 1 },
    space_id: { type: Number, required: true, min: 1 },
    user_id: { type: Number, required: true, min: 1 },
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING', required: true },
    rejection_reason: { type: String, default: null, trim: true },
    created_at: { type: Date, default: Date.now, required: true },
    history: { type: [historySchema], default: [] }
}, {
    versionKey: false,
    id: false,
    toJSON: { transform(_doc, ret) { delete ret._id; return ret; } }
});

reservaSchema.pre('validate', function validateRange() {
    if (this.start_datetime && this.end_datetime && this.end_datetime <= this.start_datetime) {
        this.invalidate('end_datetime', 'end_datetime deve ser posterior a start_datetime');
    }
});

module.exports = mongoose.model('Reserva', reservaSchema);
