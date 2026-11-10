const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true, min: 1 },
        nome: { type: String, required: true, trim: true },
        cnpj: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        telefone: { type: String, required: true, trim: true }
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

module.exports = mongoose.model('Empresa', empresaSchema);
