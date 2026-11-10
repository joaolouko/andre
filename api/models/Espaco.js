const mongoose = require('mongoose');

const espacoSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true, min: 1 },
        nome: { type: String, required: true, trim: true },
        descricao: { type: String, required: true, trim: true },
        capacidade: { type: Number, required: true, min: 1 },
        empresaId: { type: Number, required: true, min: 1 }
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

module.exports = mongoose.model('Espaco', espacoSchema);
