//srv\api\models\mongodb\Applications.js
const mongoose = require('mongoose');

// Sub-schema para los procesos dentro de una vista
const processSchema = new mongoose.Schema({
    PROCESSID: { type: String, required: true },
    PRIVILEGE: [
        {
            PRIVILEGEID: { type: String, required: true },
        },
    ]
}, { _id: false }); // _id: false evita que Mongoose cree un ObjectId para cada proceso

// Sub-schema para el log de auditoría (tu DETAIL_ROW_REG)
const auditLogSchema = new mongoose.Schema({
    CURRENT: { type: Boolean, default: true },
    REGDATE: { type: Date, default: () => new Date() },
    REGUSER: { type: String, required: true }
}, { _id: false });

// Sub-schema para las vistas
const viewSchema = new mongoose.Schema({
    VIEWSID: { type: String, required: true },
    PROCESS: [processSchema] // Array de procesos
}, { _id: false });

// Schema principal de la aplicación
const applicationSchema = new mongoose.Schema({
    APPID: { type: String, required: true, unique: true },
    NAME: { type: String, maxlength: 150 },
    DESCRIPTION: { type: String, maxlength: 500 },
    VIEWS: [viewSchema], // Array de vistas
    DETAIL_ROW: { // Objeto anidado para metadatos
        ACTIVED: { type: Boolean, default: true },
        DELETED: { type: Boolean, default: false },
        DETAIL_ROW_REG: [auditLogSchema] // Array para el log de registros
    }
});

module.exports = mongoose.model(
    'ZTAPPLICATION',      // Nombre del modelo en la aplicación
    applicationSchema,  // Schema que define la estructura
    'ZTAPPLICATION'      // Nombre de la colección en la base de datos MongoDB
);