const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true, min: 1 },
        nome: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        telefone: { type: String, required: true, trim: true },
        senha: { type: String, required: false, default: '123456', trim: true }
    },
    {
        versionKey: false,
        id: false,
        toJSON: {
            transform(_doc, ret) {
                delete ret._id;
                delete ret.senha;
                return ret;
            }
        }
    }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
