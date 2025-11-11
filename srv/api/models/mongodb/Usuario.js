//srv\api\models\mongodb\Usuario.js
const mongoose = require('mongoose');

const rolAsignadoSchema = new mongoose.Schema(
    {
        ROLEID: { type: String, required: true },
    },
    { _id: false } // No crear _id para cada sub-documento de rol
);

const usuariosSchema = new mongoose.Schema({
    USERID: {type: String, required: true, unique: true},
    USERNAME: {type: String, maxlength: 100},
    COMPANYID: {type: Number},
    CEDIID: {type: Number},
    EMPLOYEEID: {type: Number},
    EMAIL: {type: String,maxlength: 255},
    REGUSER: {type: String,default: 'SYSHANA'},
    REGDATE: {type: Date,default: () => new Date()},
    REGTIME: {type: String,default: () => new Date().toTimeString().split(' ')[0]}, // HH:MM:SS
    MODUSER: {type: String,default: 'SYSHANA'},
    MODDATE: {type: Date,default: () => new Date()},
    MODTIME: {type: String,default: () => new Date().toTimeString().split(' ')[0]}, // HH:MM:SS
    ACTIVED: {type: Boolean,default: true},
    DELETED: {type: Boolean,default: false},
    ROLES: [rolAsignadoSchema],
    ALIAS: {type: String,maxlength: 50},
    PHONENUMBER: {type: String,maxlength: 50},
    EXTENSION: {type: String,maxlength: 20}
    ,
    // Subdocumento para metadata consistente con el modelo CDS
    DETAIL_ROW: {
        ACTIVED: { type: Boolean, default: true },
        DELETED: { type: Boolean, default: false },
        DETAIL_ROW_REG: [
            {
                CURRENT: { type: Boolean, default: false },
                REGDATE: { type: Date, default: () => new Date() },
                REGTIME: { type: String, default: () => new Date().toTimeString().split(' ')[0] },
                REGUSER: { type: String, default: 'SYSHANA' }
            }
        ]
    }
});

module.exports = mongoose.model(
    'ZTUSERS',
    usuariosSchema,
    'ZTUSERS'
)