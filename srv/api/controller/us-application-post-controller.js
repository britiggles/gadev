// srv/api/controller/us-application-post-controller.js
const cds = require("@sap/cds");
const {
  postApplication,
  addViewToApplication,
  addProcessToView,
} = require("../service/us-apllication-post-service");

class ApplicationPostController extends cds.ApplicationService {
  async init() {
    //API crear APP   
    this.on("create", async (req) => {
      try {
        console.log(
          "Datos recibidos en req.data:",
          JSON.stringify(req.data, null, 2)
        );
        const dataPayload = req.data.application;

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
        const resultado = await postApplication(dataPayload);
        return resultado;
      } catch (error) {
        req.error(500, `Error en el controlador: ${error.message}`);
      }
    });
    //API añadir view
    this.on("addView", async (req) => {
      try {
        // 1. CAP nos da el ID de la URL en req.params[0]
        //const appId = req.params[0].APPID;

        // 2. Los datos del body vienen en req.data
        const viewData = {
          APPID: req.data.APPID,
          VIEWSID: req.data.VIEWSID,
          PROCESS: req.data.PROCESS,
        };

        console.log(
          `Intentando agregar vista a la app: ${viewData.APPID} con datos:`,
          viewData
        );

        // 3. Llamar a la lógica del servicio
        const resultado = await addViewToApplication(viewData.APPID, viewData);

        // 4. Devolver el resultado
        return resultado;
      } catch (error) {
        // 5. Manejar errores específicos del servicio
        // Usa el statusCode que definimos en el servicio (404, 409) o un 500 genérico.
        req.error(error.statusCode || 500, error.message);
      }
    });

    //API añadir process
    this.on("addProcess", async (req) => {
      try {
        // 1. Extrae los tres identificadores del body.
        const { APPID, VIEWSID, PROCESSID } = req.data;

        // 2. Llama a la nueva función del servicio con los datos.
        const resultado = await addProcessToView(APPID, VIEWSID, PROCESSID);

        // 3. Devuelve la aplicación actualizada.
        return resultado;
      } catch (error) {
        req.error(error.statusCode || 500, error.message);
      }
    });

    await super.init();
  }
}

module.exports = ApplicationPostController;
