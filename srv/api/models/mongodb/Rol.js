const mongoose = require("mongoose");

const processSchema = new mongoose.Schema(
  {
    NAMEAPP: { type: String },
    PROCESSID: { type: String },
    PRIVILEGE: [
      {
        PRIVILEGEID: { type: String, required: true },
      },
    ],
  },
  { _id: false }
); // _id: false para que no genere un ObjectId para cada proceso

// Sub-schema para el log de auditoría
const auditLogSchema = new mongoose.Schema(
  {
    CURRENT: { type: Boolean, default: true },
    REGDATE: { type: Date, default: () => new Date() },
    REGUSER: { type: String, required: true },
  },
  { _id: false }
);

// Schema principal del ROL
const roleSchema = new mongoose.Schema({
  ROLEID: { type: String, required: true, unique: true },
  ROLENAME: { type: String, maxlength: 150 },
  DESCRIPTION: { type: String, maxlength: 500 },
  PROCESS: [processSchema],
  ACTIVED: { type: Boolean, default: true },
  DELETED: { type: Boolean, default: false },
  DETAIL_ROW_REG: [auditLogSchema],
});

module.exports = mongoose.model(
  "ZTROL", // Nombre del modelo en la aplicación
  roleSchema, // Schema que define la estructura
  "ZTROL" // Nombre de la colección en MongoDB
);
