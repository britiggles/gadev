const cds = require("@sap/cds");
const {
  crudRol
} = require("../service/us-rol-service.js");

class RolGetController extends cds.ApplicationService {
  async init() {

    // --- INTERCEPTOR DE LIMPIEZA DEFINITIVO ---
    this.before("crud", (req) => {
      if (req.data && req.data.rol) {
        
        // 1. Definimos EXACTAMENTE qué campos acepta tu archivo .cds (RolInput)
        const camposPermitidos = [
            "ROLEID", 
            "ROLENAME", 
            "DESCRIPTION", 
            "ACTIVED", 
            "DELETED", 
            "PROCESS"
        ];

        const rolLimpio = {};

        // 2. Copiamos SOLO los campos permitidos del objeto original al nuevo
        camposPermitidos.forEach(campo => {
            if (req.data.rol[campo] !== undefined) {
                rolLimpio[campo] = req.data.rol[campo];
            }
        });

        // 3. Reemplazamos el objeto sucio por el limpio
        // Esto elimina _id, __v, DETAIL_ROW_REG y cualquier otra cosa extra de un solo golpe.
        req.data.rol = rolLimpio;
      }
    });
    // ------------------------------------------

    this.on("crud", async (req) => {
      return crudRol(req);
    });

    await super.init();
  }
}

module.exports = RolGetController;