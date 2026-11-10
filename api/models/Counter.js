const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        sequence: { type: Number, required: true, default: 0 }
    },
    { versionKey: false }
);

module.exports = mongoose.model('Counter', counterSchema);
