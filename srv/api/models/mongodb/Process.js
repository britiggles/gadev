//srv\api\models\mongodb\Usuario.js
const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
    PROCESSID: {type: String, required: true, unique: true},
    DESCRIPCION: {type: String},
});

module.exports = mongoose.model(
    'ZTPROCESSES',
    processSchema,
    'ZTPROCESSES'
)