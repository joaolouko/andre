require('dotenv').config();
const mongoose = require('mongoose');
const { ensureUniqueIndexes } = require('./uniqueIndexes');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'gestao_espacos';

async function connectDatabase() {
    await mongoose.connect(MONGODB_URI, { dbName: DATABASE_NAME, autoIndex: false });
    await ensureUniqueIndexes();
    console.log(`MongoDB conectado ao banco ${DATABASE_NAME}; índices de unicidade verificados`);
}

module.exports = { connectDatabase, MONGODB_URI, DATABASE_NAME };
