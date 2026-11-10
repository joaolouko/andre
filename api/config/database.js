require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'gestao_espacos';

async function connectDatabase() {
    await mongoose.connect(MONGODB_URI, { dbName: DATABASE_NAME });
    console.log(`MongoDB ligado em ${MONGODB_URI}/${DATABASE_NAME}`);
}

module.exports = { connectDatabase, MONGODB_URI, DATABASE_NAME };
