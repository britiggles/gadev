//srv\api\models\mongodb\Usuario.js
const mongoose = require('mongoose');

const viewsSchema = new mongoose.Schema({
    VIEWSID: {type: String, required: true, unique: true},
    DESCRIPCION: {type: String},
});

module.exports = mongoose.model(
    'ZTVIEWS',
    viewsSchema,
    'ZTVIEWS'
)