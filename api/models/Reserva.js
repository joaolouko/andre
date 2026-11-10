const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true, min: 1 },
        usuarioId: { type: Number, required: true, min: 1 },
        espacoId: { type: Number, required: true, min: 1 },
        data: { type: String, required: true, trim: true },
        horaInicio: { type: String, required: true, trim: true },
        horaFim: { type: String, required: true, trim: true },
        status: { type: String, required: true, default: 'confirmada', trim: true }
    },
    {
        versionKey: false,
        id: false,
        toJSON: {
            transform(_doc, ret) {
                delete ret._id;
                return ret;
            }
        }
    }
);

module.exports = mongoose.model('Reserva', reservaSchema);
