const cds = require("@sap/cds");

const { postRol, addProcessRol,addPrivilege } = require("../service/us-rol-post-service");

class rolPostController extends cds.ApplicationService {
  async init() {
    //Crear Rol
    this.on("create", async (req) => {
      try {
        console.log(
          "Datos recibidos en req.data:",
          JSON.stringify(req.data, null, 2)
        );
        const dataPayload = req.data.rol;

        if (!dataPayload) {
          req.error(
            400,
            "El payload de la aplicación es nulo o indefinido. Asegúrese de que el body del request sea correcto."
          );
          return;
        }
        dataPayload.DETAIL_ROW = {
          DETAIL_ROW_REG: [
            {
              REGUSER: "SYSTEM_USER", // Modificar esto
            },
          ],
        };
        const resultado = await postRol(dataPayload);
        return resultado;
      } catch (error) {
        req.error(500, `Error en el controlador: ${error.message}`);
      }
    });

    //AÑADIR PROCESS AL ROL
    this.on("addProcess", async (req) => {
      try {
        // 1. CAP nos da el ID de la URL en req.params[0]
        //const appId = req.params[0].APPID;

        // 2. Los datos del body vienen en req.data
        const processData = {
          ROLEID: req.data.ROLEID,
          NAMEAPP: req.data.NAMEAPP,
          PROCESSID: req.data.PROCESSID,
          PRIVILEGEID: req.data.PRIVILEGEID,
        };
        /* NAMEAPP: { type: String },
    PROCESSID: { type: String },
    PRIVILEGEID: [String] */
        console.log(
          `Intentando agregar process al rol: ${processData.ROLEID} con datos:`,
          processData
        );

        // 3. Llamar a la lógica del servicio
        const resultado = await addProcessRol(processData.ROLEID, processData);

        // 4. Devolver el resultado
        return resultado;
      } catch (error) {
        // 5. Manejar errores específicos del servicio
        // Usa el statusCode que definimos en el servicio (404, 409) o un 500 genérico.
        req.error(error.statusCode || 500, error.message);
      }
    });

    //añadir privilegio
    this.on("addPrivilege", async (req) => {
      try {
        // 1. Extrae los tres identificadores del body.
        const { ROLEID, PROCESSID, PRIVILEGEID } = req.data;

        // 2. Llama a la nueva función del servicio con los datos.
        const resultado = await addPrivilege(ROLEID, PROCESSID, PRIVILEGEID);

        // 3. Devuelve la aplicación actualizada.
        return resultado;
      } catch (error) {
        req.error(error.statusCode || 500, error.message);
      }
    });

    return await super.init();
  }
}

module.exports = rolPostController;
