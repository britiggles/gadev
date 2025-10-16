const Application = require("../models/mongodb/Applications.js");

async function updateApplication(appId, data) {
  try {
    const application = await Application.findOne({ APPID: appId });

    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404;
      throw error;
    }

    Object.assign(application, data);

    const updated = await application.save();
    return updated.toObject();
  } catch (error) {
    console.error("Error en updateApplication:", error);
    throw error;
  }
}

async function updateView(appId, viewId, data) {
  try {
    const application = await Application.findOne({ APPID: appId });

    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const viewIndex = application.VIEWS.findIndex(v => v.VIEWSID === viewId);
    if (viewIndex === -1) {
      const error = new Error("Vista no encontrada");
      error.statusCode = 404;
      throw error;
    }

    application.VIEWS[viewIndex] = { ...application.VIEWS[viewIndex], ...data };

    const updated = await application.save();
    return updated.toObject();
  } catch (error) {
    console.error("Error en updateView:", error);
    throw error;
  }
}

async function updateProcess(appId, viewId, processId, data) {
  try {
    const application = await Application.findOne({ APPID: appId });

    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const view = application.VIEWS.find(v => v.VIEWSID === viewId);
    if (!view) {
      const error = new Error("Vista no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const processIndex = view.PROCESS.findIndex(p => p.PROCESSID === processId);
    if (processIndex === -1) {
      const error = new Error("Proceso no encontrado");
      error.statusCode = 404;
      throw error;
    }

    view.PROCESS[processIndex] = { ...view.PROCESS[processIndex], ...data };

    const updated = await application.save();
    return updated.toObject();
  } catch (error) {
    console.error("Error en updateProcess:", error);
    throw error;
  }
}

async function deleteApplication(appId) {
  try {
    const application = await Application.findOne({ APPID: appId });

    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404;
      throw error;
    }

    application.DETAIL_ROW = application.DETAIL_ROW || {};
    application.DETAIL_ROW.DELETED = true;

    const updated = await application.save();
    return updated.toObject();
  } catch (error) {
    console.error("Error en deleteApplication:", error);
    throw error;
  }
}

async function restoreApplication(appId) {
  try {
    const application = await Application.findOne({ APPID: appId });

    if (!application) {
      const error = new Error("Aplicación no encontrada");
      error.statusCode = 404;
      throw error;
    }

    application.DETAIL_ROW = application.DETAIL_ROW || {};
    application.DETAIL_ROW.DELETED = false;

    const updated = await application.save();
    return updated.toObject();
  } catch (error) {
    console.error("Error en restoreApplication:", error);
    throw error;
  }
}

module.exports = {updateApplication, updateProcess, updateView, deleteApplication, restoreApplication};
