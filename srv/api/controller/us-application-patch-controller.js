// srv/api/controller/us-application-patch-controller.js
const cds = require("@sap/cds");
const {
    updateApplication,
    updateProcess,
    updateView,
    deleteApplication,
    restoreApplication
} = require("../service/us-application-patch-service.js");

class ApplicationPatchController extends cds.ApplicationService {
  async init() {
    //Actualizar aplicacion
    this.on("update", async (req) => {
        try {
            const { data, appId } = req.data;

            if (!appId || !data) {
            req.error(400, "Faltan datos necesarios: appId o payload.");
            return;
            }

            console.log(`Actualizando aplicación ${appId} con:`, data);

            const resultado = await updateApplication(appId, data);
            return resultado;
        } catch (error) {
            req.error(error.statusCode || 500, error.message);
        }
    });

    //Actualiar Views
    this.on("updateView", async (req) => {
        try {
            const { appId, viewId, data } = req.data;

            if (!appId || !viewId || !data) {
            req.error(400, "Faltan datos: appId, viewId o payload.");
            return;
            }

            console.log(`Actualizando vista ${viewId} en app ${appId} con:`, data);

            const resultado = await updateView(appId, viewId, data);
            return resultado;
        } catch (error) {
            req.error(error.statusCode || 500, error.message);
        }
    });

    //Actualizar procesos
    this.on("updateProcess", async (req) => {
        try {
            const { appId, viewId, processId, data } = req.data;

            if (!appId || !viewId || !processId || !data) {
            req.error(400, "Faltan datos: appId, viewId, processId o payload.");
            return;
            }

            console.log(`Actualizando proceso ${processId} en vista ${viewId} de app ${appId} con:`, data);

            const resultado = await updateProcess(appId, viewId, processId, data);
            return resultado;
        } catch (error) {
            req.error(error.statusCode || 500, error.message);
        }
    });

    //Delete soft de aplicacion
    this.on("delete", async (req) => {
        try {
            const { appId } = req.data;

            if (!appId) {
            req.error(400, "Falta el identificador de la aplicación.");
            return;
            }

            console.log(`Eliminando (soft) aplicación ${appId}`);

            const resultado = await deleteApplication(appId);
            return resultado;
        } catch (error) {
            req.error(error.statusCode || 500, error.message);
        }
    });

    //Restaurar Aplicacion
    this.on("restore", async (req) => {
        try {
            const { appId } = req.data;

            if (!appId) {
            req.error(400, "Falta el identificador de la aplicación.");
            return;
            }

            console.log(`Restaurando aplicación ${appId}`);

            const resultado = await restoreApplication(appId);
            return resultado;
        } catch (error) {
            req.error(error.statusCode || 500, error.message);
        }
    });

    await super.init();
  }
}

module.exports = ApplicationPatchController;
