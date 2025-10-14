const Application = require("../models/mongodb/Applications.js");

async function postApplication(data) {
  try {
    const newApplication = new Application(data);

    const saveApplication = await newApplication.save();

    return saveApplication.toObject();
  } catch (error) {
    console.error("Error en el servicio postApplication:", error);
    throw error;
  }
}

async function addViewToApplication(appId, viewData) {
  try {
    // 1. Buscar la aplicación por su APPID
    const application = await Application.findOne({ APPID: appId });

    // 2. Si no se encuentra, lanzar un error claro
    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3.  Verificar si la vista ya existe
    const viewExists = application.VIEWS.some(
      (view) => view.VIEWSID === viewData.VIEWSID
    );
    if (viewExists) {
      const error = new Error(
        `La vista con el ID '${viewData.VIEWSID}' ya existe en esta aplicación.`
      );
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 4. Crear el nuevo objeto de vista
    const newView = {
      VIEWSID: viewData.VIEWSID,
      PROCESS: viewData.PROCESS || [], // Usa el array de procesos si viene, si no, uno vacío
    };

    // 5. Añadir la nueva vista al array 'VIEWS'
    application.VIEWS.push(newView);

    // 6. Guardar los cambios en la base de datos
    const updatedApplication = await application.save();

    // 7. Devolver el documento actualizado
    return updatedApplication.toObject();
  } catch (error) {
    console.error("Error en el servicio addViewToApplication:", error);
    // Re-lanzar el error para que el controlador lo maneje
    throw error;
  }
}

//Añadir un process
async function addProcessToView(appId, viewId, processId) {
  try {
    // 1. Encuentra la aplicación por su APPID.
    const application = await Application.findOne({ APPID: appId });

    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 2. Encuentra la vista específica dentro del array 'VIEWS'.
    const targetView = application.VIEWS.find(view => view.VIEWSID === viewId);

    if (!targetView) {
      const error = new Error("Vista no encontrada en esta aplicación");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3. (Recomendado) Verifica si el proceso ya existe en esa vista.
    const processExists = targetView.PROCESS.some(proc => proc.PROCESSID === processId);
    if (processExists) {
        const error = new Error(`El proceso con ID '${processId}' ya existe en esta vista.`);
        error.statusCode = 409; // Conflict
        throw error;
    }

    // 4. Añade el nuevo proceso al array 'PROCESS' de la vista encontrada.
    targetView.PROCESS.push({ PROCESSID: processId });

    // 5. Guarda el documento principal modificado.
    const updatedApplication = await application.save();

    return updatedApplication.toObject();

  } catch (error) {
    console.error("Error en el servicio addProcessToView:", error);
    throw error;
  }
}

module.exports = { postApplication,addViewToApplication,addProcessToView };
