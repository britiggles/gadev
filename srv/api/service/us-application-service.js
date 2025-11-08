const { error } = require("@sap/cds");
const mongoose = require("mongoose");
const { OK, BITACORA, DATA, FAIL, AddMSG } = require("../../middlewares/respPWA.handler.js")
const { getDatabase } = require("../../config/connectToCosmosDB.js");
const Application = require("../models/mongodb/Applications.js");


async function connectDB(DBServer) {
  try {
    switch (DBServer) {
      case "MongoDB":
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGO_URI);
          console.log("✅ Conectado a MongoDB local.");
        }
        break;

      case "AZURECOSMOS":
        console.log(
          "✅ CosmosDB ya está conectado desde el archivo de config."
        );
        break;

      default:
        throw new Error(`DBServer no reconocido: ${DBServer}`);
    }
  } catch (error) {
    console.error(`❌ Error al conectar a ${DBServer}:`, error.message);
    throw error;
  }
}

async function crudApplication(req) {
  let bitacora = BITACORA();
  let data = DATA();

  const ProcessType = req.req.query?.ProcessType;
  const LoggedUser = req.req.query?.LoggedUser;
  const dbServer = req.req.query?.dbserver;
  const params = req.req.query;
  const paramString = new URLSearchParams(params).toString().trim();
  const body = req.req.body;

  bitacora.loggedUser = LoggedUser;
  bitacora.processType = ProcessType;
  bitacora.dbServer = dbServer;

  try {
    await connectDB(dbServer);

    switch (ProcessType) {
      case "createApp":
        bitacora = await postApplicationMethod(bitacora, body.data, req);
        break;

      case "addView":
        bitacora = await addViewMethod(bitacora, body.appId, body.data, req);
        break;

      case "addProcess":
        bitacora = await addProcessMethod(bitacora, body.appId, body.viewId, body.processId, req);
        break;

      case "updateApp":
        bitacora = await updateApplicationMethod(bitacora, body.appId, body.data, req);
        break;

      case "updateView":
        bitacora = await updateViewMethod(bitacora, body.appId, body.viewId, body.data, req);
        break;

      case "updateProcess":
        bitacora = await updateProcessMethod(bitacora, body.appId, body.viewId, body.processId, body.data, req);
        break;

      case "deleteAppSoft":
        bitacora = await deleteApplicationMethod(bitacora, body.appId, req);
        break;

      case "restoreApp":
        bitacora = await restoreApplicationMethod(bitacora, body.appId, req);
        break;
      case "deleteHardApp":
        bitacora = await deleteHardApplicationMethod(bitacora, body.appId, req);
        break;
      case "deleteHardView":
        bitacora = await deleteHardViewMethod(bitacora, body.appId, body.viewId, req);
        break;

      case "deleteHardProcess":
        bitacora = await deleteHardProcessMethod(bitacora, body.appId, body.viewId, body.processId, req);
        break;
      case "getAplications":
        bitacora = await getAplicationsMethod(bitacora, req);
        break;

      case "getAplicationID":
        bitacora = await getAplicationIDMethod(bitacora, body.appId, req);
        break;

      case "getAplicationProcess":
        bitacora = await getAplicationProcessMethod(bitacora, body.appId, req);
        break;


      default:
        data.status = 400;
        data.messageDEV = `Proceso no reconocido: ${ProcessType}`;
        data.messageUSR = "Tipo de proceso inválido";
        data.dataRes = null;
        throw response;
    }

    req.res.status(bitacora.status).send(bitacora);
    return OK(bitacora);

  } catch (errorBita) {
    if (!errorBita?.finalRes) {
      data.status = data.status || 500;
      data.messageDEV = errorBita.message || "Error inesperado";
      data.messageUSR = "<<ERROR CATCH>> El proceso no se completó";
      data.dataRes = errorBita;
      errorBita = AddMSG(bitacora, data, "FAIL");
    }

    console.error(`<<Message USR>> ${errorBita.messageUSR}`);
    console.error(`<<Message DEV>> ${errorBita.messageDEV}`);

    req.error({
      code: "Internal-Server-Error",
      status: errorBita.status,
      message: errorBita.messageUSR,
      target: errorBita.messageDEV,
      numericSeverity: 1,
      innererror: errorBita
    });

    return FAIL(errorBita);
  }
};

async function postApplicationMethod(bitacora, data, req) {
  let response = DATA();
  bitacora.process = "Creación de aplicación";
  response.process = bitacora.process;
  response.method = "POST";
  response.api = "/createApp";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: data.APPID })
      .then(exists => {
        if (exists) {
          response.status = 409;
          response.messageDEV = "La aplicación ya existe";
          response.messageUSR = "<<ERROR>> Ya existe una aplicación con ese APPID";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }
        const newApp = new Application(data);
        return newApp.save()
          .then(saved => {
            response.status = 201;
            response.messageDEV = "Aplicación creada correctamente";
            response.messageUSR = "<<OK>> La aplicación fue creada correctamente";
            response.dataRes = saved.toObject();
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo crear la aplicación";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c.id FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: data.APPID }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        if (res.resources && res.resources.length) {
          response.status = 409;
          response.messageDEV = "La aplicación ya existe";
          response.messageUSR = "<<ERROR>> Ya existe una aplicación con ese APPID";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }
        return container.items.create(data)
          .then(createRes => {
            response.status = 201;
            response.messageDEV = "Aplicación creada correctamente (Cosmos SQL)";
            response.messageUSR = "<<OK>> La aplicación fue creada correctamente (Cosmos SQL)";
            response.dataRes = createRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo crear la aplicación (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

async function updateApplicationMethod(bitacora, appId, data, req) {
  let response = DATA();
  bitacora.process = "Actualizacion de aplicacion";
  response.process = bitacora.process;
  response.method = "PATCH";
  response.api = "/updateApp";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        Object.assign(application, data);
        return application.save()
          .then(updated => {
            response.messageDEV = "Aplicación actualizada correctamente";
            response.messageUSR = "<<OK>> La aplicación fue actualizada correctamente";
            response.dataRes = updated.toObject();
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo actualizar la aplicación";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const updatedDoc = { ...application, ...data };
        return container.items.upsert(updatedDoc)
          .then(upsertRes => {
            response.messageDEV = "Aplicación actualizada correctamente (Cosmos SQL)";
            response.messageUSR = "<<OK>> La aplicación fue actualizada correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo actualizar la aplicación (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

// 🔧 Actualiza una vista
async function updateViewMethod(bitacora, appId, viewId, data, req) {
  let response = DATA();
  bitacora.process = "Actualizacion de vista";
  response.process = bitacora.process;
  response.method = "PATCH";
  response.api = "/updateView";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const index = (application.VIEWS || []).findIndex(v => v.VIEWSID === viewId);
        if (index === -1) {
          response.status = 404;
          response.messageDEV = "Vista no encontrada";
          response.messageUSR = "<<ERROR>> La vista no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        application.VIEWS[index] = { ...application.VIEWS[index], ...data };
        return application.save()
          .then(updated => {
            response.messageUSR = "<<OK>> La vista fue actualizada correctamente";
            response.dataRes = updated.toObject();
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo actualizar la vista";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const index = (application.VIEWS || []).findIndex(v => v.VIEWSID === viewId);
        if (index === -1) {
          response.status = 404;
          response.messageDEV = "Vista no encontrada";
          response.messageUSR = "<<ERROR>> La vista no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        application.VIEWS[index] = { ...application.VIEWS[index], ...data };
        return container.items.upsert(application)
          .then(upsertRes => {
            response.messageUSR = "<<OK>> La vista fue actualizada correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo actualizar la vista (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

// 🔧 Actualiza un proceso
async function updateProcessMethod(bitacora, appId, viewId, processId, data, req) {
  let response = DATA();
  bitacora.process = "Actualizacion de procesos";
  response.process = bitacora.process;
  response.method = "PATCH";
  response.api = "/updateProcess";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const view = (application.VIEWS || []).find(v => v.VIEWSID === viewId);
        if (!view) {
          response.status = 404;
          response.messageDEV = "Vista no encontrada";
          response.messageUSR = "<<ERROR>> La vista no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const index = view.PROCESS.findIndex(p => p.PROCESSID === processId);
        if (index === -1) {
          response.status = 404;
          response.messageDEV = "Proceso no encontrado";
          response.messageUSR = "<<ERROR>> El proceso no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        view.PROCESS[index] = { ...view.PROCESS[index], ...data };
        return application.save()
          .then(updated => {
            response.messageUSR = "<<OK>> El proceso fue actualizado correctamente";
            response.dataRes = updated.toObject();
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo actualizar el proceso";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const view = (application.VIEWS || []).find(v => v.VIEWSID === viewId);
        if (!view) {
          response.status = 404;
          response.messageDEV = "Vista no encontrada";
          response.messageUSR = "<<ERROR>> La vista no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        const index = view.PROCESS.findIndex(p => p.PROCESSID === processId);
        if (index === -1) {
          response.status = 404;
          response.messageDEV = "Proceso no encontrado";
          response.messageUSR = "<<ERROR>> El proceso no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        view.PROCESS[index] = { ...view.PROCESS[index], ...data };
        return container.items.upsert(application)
          .then(upsertRes => {
            response.messageUSR = "<<OK>> El proceso fue actualizado correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo actualizar el proceso (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

// 🔧 Elimina una aplicación (soft delete)
async function deleteApplicationMethod(bitacora, appId, req) {
  let response = DATA();
  bitacora.process = "Eliminacion logica de aplicacion";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/deleteAppSoft";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        application.DETAIL_ROW = application.DETAIL_ROW || {};
        application.DETAIL_ROW.DELETED = true;
        return application.save()
          .then(updated => {
            response.messageUSR = "<<OK>> La aplicación fue eliminada correctamente";
            response.dataRes = updated.toObject();
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo eliminar la aplicación";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: `SELECT TOP 1 c FROM c WHERE c.APPID = @appId`,
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        application.DETAIL_ROW = application.DETAIL_ROW || {};
        application.DETAIL_ROW.DELETED = true;
        return container.items.upsert(application)
          .then(upsertRes => {
            response.messageUSR = "<<OK>> La aplicación fue eliminada correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo eliminar la aplicación (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

// 🔧 Restaura una aplicación eliminada
async function restoreApplicationMethod(bitacora, appId, req) {
  let response = DATA();
  bitacora.process = "Restauracion de aplicacion";
  response.process = bitacora.process;
  response.method = "PATCH";
  response.api = "/restoreApp";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        application.DETAIL_ROW = application.DETAIL_ROW || {};
        application.DETAIL_ROW.DELETED = false;
        return application.save()
          .then(updated => {
            response.messageUSR = "<<OK>> La aplicación fue restaurada correctamente";
            response.dataRes = updated.toObject();
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo restaurar la aplicación";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c.* FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }
        application.DETAIL_ROW = application.DETAIL_ROW || {};
        application.DETAIL_ROW.DELETED = false;
        return container.items.upsert(application)
          .then(upsertRes => {
            response.messageUSR = "<<OK>> La aplicación fue restaurada correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo restaurar la aplicación (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

// ➕ Añade una nueva vista a una aplicación
async function addViewMethod(bitacora, appId, data, req) {
  let response = DATA();
  bitacora.process = "Añadir vista a aplicación";
  response.process = bitacora.process;
  response.method = "POST";
  response.api = "/addView";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        application.VIEWS = application.VIEWS || [];
        const viewExists = application.VIEWS.some(v => v.VIEWSID === data.VIEWSID);
        if (viewExists) {
          response.status = 409;
          response.messageDEV = `La vista con ID ${data.VIEWSID} ya existe`;
          response.messageUSR = "<<ERROR>> Ya existe una vista con ese VIEWSID";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }

        const newView = {
          VIEWSID: data.VIEWSID,
          PROCESS: data.PROCESS || []
        };

        application.VIEWS.push(newView);
        return application.save()
          .then(saved => {
            response.status = 201;
            response.messageDEV = "Vista añadida correctamente";
            response.messageUSR = "<<OK>> La vista fue añadida correctamente";
            response.dataRes = saved.toObject();
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo añadir la vista";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        application.VIEWS = application.VIEWS || [];
        const viewExists = application.VIEWS.some(v => v.VIEWSID === data.VIEWSID);
        if (viewExists) {
          response.status = 409;
          response.messageDEV = `La vista con ID ${data.VIEWSID} ya existe`;
          response.messageUSR = "<<ERROR>> Ya existe una vista con ese VIEWSID";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }

        const newView = {
          VIEWSID: data.VIEWSID,
          PROCESS: data.PROCESS || []
        };

        application.VIEWS.push(newView);
        return container.items.upsert(application)
          .then(upsertRes => {
            response.status = 201;
            response.messageDEV = "Vista añadida correctamente (Cosmos SQL)";
            response.messageUSR = "<<OK>> La vista fue añadida correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo añadir la vista (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}

// ➕ Añade un nuevo proceso a una vista existente
async function addProcessMethod(bitacora, appId, viewId, processId, req) {
  let response = DATA();
  bitacora.process = "Añadir proceso a vista";
  response.process = bitacora.process;
  response.method = "POST";
  response.api = "/addProcess";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        const view = (application.VIEWS || []).find(v => v.VIEWSID === viewId);
        if (!view) {
          response.status = 404;
          response.messageDEV = "Vista no encontrada";
          response.messageUSR = "<<ERROR>> La vista no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        view.PROCESS = view.PROCESS || [];
        const processExists = view.PROCESS.some(p => p.PROCESSID === processId);
        if (processExists) {
          response.status = 409;
          response.messageDEV = `El proceso con ID ${processId} ya existe en la vista`;
          response.messageUSR = "<<ERROR>> El proceso ya existe en la vista";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }

        view.PROCESS.push({ PROCESSID: processId });
        return application.save()
          .then(saved => {
            response.status = 201;
            response.messageDEV = "Proceso añadido correctamente";
            response.messageUSR = "<<OK>> El proceso fue añadido correctamente";
            response.dataRes = saved.toObject();
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo añadir el proceso";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };
    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];
        if (!application) {
          response.status = 404;
          response.messageDEV = "Aplicación no encontrada";
          response.messageUSR = "<<ERROR>> La aplicación no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        const view = (application.VIEWS || []).find(v => v.VIEWSID === viewId);
        if (!view) {
          response.status = 404;
          response.messageDEV = "Vista no encontrada";
          response.messageUSR = "<<ERROR>> La vista no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        view.PROCESS = view.PROCESS || [];
        const processExists = view.PROCESS.some(p => p.PROCESSID === processId);
        if (processExists) {
          response.status = 409;
          response.messageDEV = `El proceso con ID ${processId} ya existe en la vista`;
          response.messageUSR = "<<ERROR>> El proceso ya existe en la vista";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }

        view.PROCESS.push({ PROCESSID: processId });
        return container.items.upsert(application)
          .then(upsertRes => {
            response.status = 201;
            response.messageDEV = "Proceso añadido correctamente (Cosmos SQL)";
            response.messageUSR = "<<OK>> El proceso fue añadido correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo añadir el proceso (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}


//deletes

async function deleteHardApplicationMethod(bitacora, appId, req) {
  let response = DATA();
  bitacora.process = "Eliminación física de aplicación";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/deleteApp";

  const dbServer = req.req.query?.dbserver;

  // ================== MONGODB ==================
  if (dbServer === "MongoDB") {
    try {
      const application = await Application.findOne({ APPID: appId });

      if (!application) {
        response.status = 404;
        response.messageDEV = "Aplicación no encontrada";
        response.messageUSR = "<<ERROR>> La aplicación no existe";
        response.dataRes = null;
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      // Hard delete: eliminación física del documento
      await Application.deleteOne({ APPID: appId });

      response.messageUSR = "<<OK>> La aplicación fue eliminada permanentemente";
      response.messageDEV = `Aplicación ${appId} eliminada correctamente de MongoDB`;
      response.status = 200;
      response.dataRes = { APPID: appId };

      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar la aplicación (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }

    // ================== COSMOS SQL ==================
  } else {
    try {
      const container = getDatabase().container("ZTAPPLICATION");
      const querySpec = {
        query: "SELECT TOP 1 c.id, c.APPID FROM c WHERE c.APPID = @appId",
        parameters: [{ name: "@appId", value: appId }]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      const application = resources[0];

      if (!application) {
        response.status = 404;
        response.messageDEV = "Aplicación no encontrada";
        response.messageUSR = "<<ERROR>> La aplicación no existe (Cosmos SQL)";
        response.dataRes = null;
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      // Hard delete: eliminación directa por ID
      await container.item(application.id, application.APPID).delete();

      response.messageUSR = "<<OK>> La aplicación fue eliminada permanentemente (Cosmos SQL)";
      response.messageDEV = `Aplicación ${appId} eliminada correctamente de Cosmos DB`;
      response.status = 200;
      response.dataRes = { APPID: appId };

      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar la aplicación (Cosmos SQL)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

async function deleteHardViewMethod(bitacora, appId, viewId, req) {
  let response = DATA();
  bitacora.process = "Eliminación permanente de vista";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/deleteHardView";

  const dbServer = req.req.query?.dbserver;

  if (!appId || !viewId) {
    response.status = 400;
    response.messageDEV = "Parámetros appId y viewId son requeridos";
    response.messageUSR = "<<ERROR>> Debe proporcionar el ID de la aplicación y de la vista";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  // --- MONGODB IMPLEMENTATION ---
  if (dbServer === "MongoDB") {
    try {
      const app = await Application.findOne({ APPID: appId });

      if (!app) {
        response.status = 404;
        response.messageDEV = "Aplicación no encontrada";
        response.messageUSR = "<<ERROR>> La aplicación no existe";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      const viewIndex = app.VIEWS.findIndex(v => v.VIEWSID === viewId);
      if (viewIndex === -1) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada en la aplicación";
        response.messageUSR = "<<ERROR>> La vista especificada no existe en la aplicación";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      // Eliminar la vista del arreglo
      app.VIEWS.splice(viewIndex, 1);
      await app.save();

      response.status = 200;
      response.messageUSR = "<<OK>> La vista fue eliminada permanentemente";
      response.dataRes = app.toObject();
      return OK(AddMSG(bitacora, response, "OK", 200, true));

    } catch (err) {
      response.status = 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar la vista";
      return FAIL(AddMSG(bitacora, response, "FAIL", 500, true));
    }
  }

  // --- COSMOSDB IMPLEMENTATION ---
  else {
    try {
      const container = getDatabase().container("ZTAPPLICATION");

      const querySpec = {
        query: "SELECT TOP 1 c.* FROM c WHERE c.APPID = @appId",
        parameters: [{ name: "@appId", value: appId }]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      const app = resources[0];

      if (!app) {
        response.status = 404;
        response.messageDEV = "Aplicación no encontrada (CosmosDB)";
        response.messageUSR = "<<ERROR>> La aplicación no existe";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      const viewIndex = app.VIEWS.findIndex(v => v.VIEWSID === viewId);
      if (viewIndex === -1) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada en la aplicación (CosmosDB)";
        response.messageUSR = "<<ERROR>> La vista especificada no existe";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      // Eliminar la vista del arreglo
      app.VIEWS.splice(viewIndex, 1);

      const { resource: updatedApp } = await container.items.upsert(app);

      response.status = 200;
      response.messageUSR = "<<OK>> La vista fue eliminada permanentemente (CosmosDB)";
      response.dataRes = updatedApp;
      return OK(AddMSG(bitacora, response, "OK", 200, true));

    } catch (err) {
      response.status = 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar la vista (CosmosDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", 500, true));
    }
  }
}




async function deleteHardProcessMethod(bitacora, appId, viewId, processId, req) {

  let response = DATA();
  bitacora.process = "Eliminación permanente de proceso";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/deleteHardProcess";

  const dbServer = req.req.query?.dbserver;


  if (!appId || !viewId || !processId) {
    response.status = 400;
    response.messageDEV = "Parámetros appId, viewId y processId son requeridos";
    response.messageUSR = "<<ERROR>> Debe proporcionar el ID de la aplicación, la vista y el proceso";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  // --- MONGODB IMPLEMENTATION ---
  if (dbServer === "MongoDB") {
    try {
      const app = await Application.findOne({ APPID: appId });

      if (!app) {
        response.status = 404;
        response.messageDEV = "Aplicación no encontrada";
        response.messageUSR = "<<ERROR>> La aplicación no existe";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      const view = app.VIEWS.find(v => v.VIEWSID === viewId);
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada en la aplicación";
        response.messageUSR = "<<ERROR>> La vista especificada no existe en la aplicación";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      const processIndex = view.PROCESS.findIndex(p => p.PROCESSID === processId);
      if (processIndex === -1) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado en la vista";
        response.messageUSR = "<<ERROR>> El proceso especificado no existe en la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      // Eliminar el proceso del arreglo
      view.PROCESS.splice(processIndex, 1);
      await app.save();

      response.status = 200;
      response.messageUSR = "<<OK>> El proceso fue eliminado permanentemente";
      response.dataRes = app.toObject();
      return OK(AddMSG(bitacora, response, "OK", 200, true));

    } catch (err) {
      response.status = 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar el proceso";
      return FAIL(AddMSG(bitacora, response, "FAIL", 500, true));
    }
  }

  // --- COSMOSDB IMPLEMENTATION ---
  else {
    try {
      const container = getDatabase().container("ZTAPPLICATION");

      const querySpec = {
        query: "SELECT TOP 1 c.* FROM c WHERE c.APPID = @appId",
        parameters: [{ name: "@appId", value: appId }]
      };

      const { resources } = await container.items.query(querySpec).fetchAll();
      const app = resources[0];

      if (!app) {
        response.status = 404;
        response.messageDEV = "Aplicación no encontrada (CosmosDB)";
        response.messageUSR = "<<ERROR>> La aplicación no existe";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      const view = app.VIEWS.find(v => v.VIEWSID === viewId);
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (CosmosDB)";
        response.messageUSR = "<<ERROR>> La vista especificada no existe en la aplicación";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      const processIndex = view.PROCESS.findIndex(p => p.PROCESSID === processId);
      if (processIndex === -1) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (CosmosDB)";
        response.messageUSR = "<<ERROR>> El proceso especificado no existe en la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      // Eliminar el proceso del arreglo
      view.PROCESS.splice(processIndex, 1);

      const { resource: updatedApp } = await container.items.upsert(app);

      response.status = 200;
      response.messageUSR = "<<OK>> El proceso fue eliminado permanentemente (CosmosDB)";
      response.dataRes = updatedApp;
      return OK(AddMSG(bitacora, response, "OK", 200, true));

    } catch (err) {
      response.status = 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar el proceso (CosmosDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", 500, true));
    }
  }
}


async function getAplicationsMethod(bitacora, req) {

  let response = DATA();
  bitacora.process = "Consulta de todas las Aplicaciones";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/getAplications";

  const dbServer = req.req.query?.dbserver;

   if (dbServer === "MongoDB") {
    try {
      const applications = await Application.find().lean();

      if (!applications || applications.length === 0) {
        response.status = 404;
        response.messageDEV = "No se encontraron aplicaciones en MongoDB";
        response.messageUSR = "<<ERROR>> No existen aplicaciones registradas";
        response.dataRes = [];
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      response.status = 200;
      response.messageDEV = "Consulta de aplicaciones realizada correctamente (MongoDB)";
      response.messageUSR = "<<OK>> Aplicaciones obtenidas correctamente";
      response.dataRes = applications;

      return OK(AddMSG(bitacora, response, "OK", 200, true));

    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudieron obtener las aplicaciones (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }

  } else {
    // Caso para Azure Cosmos DB
    try {
      const container = getDatabase().container("ZTAPPLICATION");
      const querySpec = {
        query: "SELECT * FROM c"
      };

      const { resources } = await container.items.query(querySpec).fetchAll();

      if (!resources || resources.length === 0) {
        response.status = 404;
        response.messageDEV = "No se encontraron aplicaciones (Cosmos SQL)";
        response.messageUSR = "<<ERROR>> No existen aplicaciones registradas (Cosmos SQL)";
        response.dataRes = [];
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }

      response.status = 200;
      response.messageDEV = "Consulta de aplicaciones realizada correctamente (Cosmos SQL)";
      response.messageUSR = "<<OK>> Aplicaciones obtenidas correctamente (Cosmos SQL)";
      response.dataRes = resources;

      return OK(AddMSG(bitacora, response, "OK", 200, true));

    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudieron obtener las aplicaciones (Cosmos SQL)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
  
}


async function getAplicationIDMethod(bitacora, appId, req) {
  let response = DATA();
  bitacora.process = "Consulta de aplicación por ID";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/getAplicationID";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = `Aplicación con APPID ${appId} no encontrada (MongoDB)`;
          response.messageUSR = "<<ERROR>> La aplicación solicitada no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        response.status = 200;
        response.messageDEV = `Consulta de aplicación ${appId} realizada correctamente (MongoDB)`;
        response.messageUSR = "<<OK>> Aplicación obtenida correctamente";
        response.dataRes = application.toObject();
        return OK(AddMSG(bitacora, response, "OK", 200, true));
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo obtener la aplicación (MongoDB)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });

  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };

    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];

        if (!application) {
          response.status = 404;
          response.messageDEV = `Aplicación con APPID ${appId} no encontrada (Cosmos SQL)`;
          response.messageUSR = "<<ERROR>> La aplicación solicitada no existe (Cosmos SQL)";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        response.status = 200;
        response.messageDEV = `Consulta de aplicación ${appId} realizada correctamente (Cosmos SQL)`;
        response.messageUSR = "<<OK>> Aplicación obtenida correctamente (Cosmos SQL)";
        response.dataRes = application;
        return OK(AddMSG(bitacora, response, "OK", 200, true));
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo obtener la aplicación (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}


async function getAplicationProcessMethod(bitacora, appId, req) {
  let response = DATA();
  bitacora.process = "Consulta de procesos por aplicación";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/getAplicationProcess";

  const dbServer = req.query?.dbserver || req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    return Application.findOne({ APPID: appId })
      .then(application => {
        if (!application) {
          response.status = 404;
          response.messageDEV = `Aplicación con APPID ${appId} no encontrada (MongoDB)`;
          response.messageUSR = "<<ERROR>> La aplicación solicitada no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        // Aplanar los procesos de todas las vistas
        const applicationProcesses = [];
        application.VIEWS.forEach(view => {
          view.PROCESS.forEach(proc => {
            applicationProcesses.push({
              viewId: view.VIEWSID,
              processId: proc.PROCESSID
            });
          });
        });

        response.status = 200;
        response.messageDEV = `Procesos de la aplicación ${appId} obtenidos correctamente (MongoDB)`;
        response.messageUSR = "<<OK>> Procesos obtenidos correctamente";
        response.dataRes = applicationProcesses;
        return OK(AddMSG(bitacora, response, "OK", 200, true));
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo obtener los procesos (MongoDB)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });

  } else {
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 c FROM c WHERE c.APPID = @appId",
      parameters: [{ name: "@appId", value: appId }]
    };

    return container.items.query(querySpec).fetchAll()
      .then(res => {
        const application = res.resources[0];

        if (!application) {
          response.status = 404;
          response.messageDEV = `Aplicación con APPID ${appId} no encontrada (Cosmos SQL)`;
          response.messageUSR = "<<ERROR>> La aplicación solicitada no existe (Cosmos SQL)";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        // Aplanar los procesos de todas las vistas
        const applicationProcesses = [];
        application.VIEWS.forEach(view => {
          view.PROCESS.forEach(proc => {
            applicationProcesses.push({
              viewId: view.VIEWSID,
              processId: proc.PROCESSID
            });
          });
        });

        response.status = 200;
        response.messageDEV = `Procesos de la aplicación ${appId} obtenidos correctamente (Cosmos SQL)`;
        response.messageUSR = "<<OK>> Procesos obtenidos correctamente (Cosmos SQL)";
        response.dataRes = applicationProcesses;
        return OK(AddMSG(bitacora, response, "OK", 200, true));
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo obtener los procesos (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}




module.exports = {
  crudApplication
};