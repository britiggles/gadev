const { error } = require("@sap/cds");
const mongoose = require("mongoose");
const { OK, BITACORA, DATA, FAIL, AddMSG } = require("../../middlewares/respPWA.handler.js")
const { getDatabase } = require("../../config/connectToCosmosDB.js");
const Application = require("../models/mongodb/Applications.js");

/**
 * Conecta a la base de datos especificada (MongoDB o Azure Cosmos DB).
 * @param {string} DBServer - El tipo de servidor de base de datos ("MongoDB" o "AZURECOSMOS").
 * @throws {Error} Si el DBServer no es reconocido o hay un error de conexión.
 */
async function connectDB(DBServer) {
  try {
    // Evaluar el tipo de servidor de base de datos proporcionado
    switch (DBServer) {
      case "MongoDB":
        // Verificar si la conexión a MongoDB no está ya establecida
        if (mongoose.connection.readyState === 0) {
          // Establecer conexión a MongoDB usando la URI del entorno
          await mongoose.connect(process.env.MONGO_URI);
          console.log("✅ Conectado a MongoDB local.");
        }
        break;

      case "AZURECOSMOS":
        // CosmosDB se conecta desde el archivo de configuración, no requiere acción adicional aquí
        console.log(
          "✅ CosmosDB ya está conectado desde el archivo de config."
        );
        break;

      default:
        // Lanzar error si el DBServer no es reconocido
        throw new Error(`DBServer no reconocido: ${DBServer}`);
    }
  } catch (error) {
    // Registrar el error en consola y relanzarlo para manejo superior
    console.error(`❌ Error al conectar a ${DBServer}:`, error.message);
    throw error;
  }
}

/**
 * Función principal que maneja las operaciones CRUD para aplicaciones basadas en el ProcessType.
 * Extrae parámetros de la solicitud, conecta a la DB y ejecuta el método correspondiente.
 * Maneja errores y envía respuestas.
 * @param {Object} req - Objeto de solicitud que contiene req.req (express request), req.res (response), etc.
 * @returns {Object} Resultado de OK o FAIL con la bitácora actualizada.
 */
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
      case "addPrivilege":
        bitacora = await addPrivilegeMethod(bitacora, body.appId, body.viewId, body.processId, body.data, req);
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
      case "deleteHardPrivilege":
        bitacora = await deletePrivilegeMethod(bitacora, body.appId, body.viewId, body.processId, body.data, req);
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

/**
 * Crea una nueva aplicación en la base de datos.
 * Verifica si ya existe, y si no, la guarda.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {Object} data - Datos de la aplicación a crear (incluye APPID).
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
<<<<<<< HEAD
      query: "SELECT * FROM c WHERE c.APPID = @appId OFFSET 0 LIMIT 1",
=======
      query: "SELECT TOP 1 *.id FROM c WHERE c.APPID = @appId",
>>>>>>> b3274382efe6d99e429375c9965dd325904c0bd8
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

/**
 * Actualiza una aplicación existente en la base de datos.
 * Busca por APPID y actualiza con los nuevos datos.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación a actualizar.
 * @param {Object} data - Datos a actualizar en la aplicación.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
<<<<<<< HEAD
      query: "SELECT * FROM c WHERE c.APPID = @appId OFFSET 0 LIMIT 1",
=======
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
>>>>>>> b3274382efe6d99e429375c9965dd325904c0bd8
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
        const updatedDoc = { ...application, ...data, id: application.id, // conservar id original
      APPID: application.APPID };
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

/**
 * Actualiza una vista específica dentro de una aplicación.
 * Busca la aplicación y la vista por IDs, y actualiza con los nuevos datos.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista a actualizar.
 * @param {Object} data - Datos a actualizar en la vista.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
      query: "SELECT TOP 1 * FROM c WHERE APPID = @appId",
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

/**
 * Actualiza un proceso específico dentro de una vista de una aplicación.
 * Busca la aplicación, vista y proceso por IDs, y actualiza con los nuevos datos.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista.
 * @param {string} processId - ID del proceso a actualizar.
 * @param {Object} data - Datos a actualizar en el proceso.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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

/**
 * Realiza un soft delete de una aplicación, marcándola como eliminada.
 * Establece DETAIL_ROW.DELETED = true.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación a eliminar.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
      query: `SELECT TOP 1 * FROM c WHERE c.APPID = @appId`,
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

/**
 * Restaura una aplicación previamente eliminada (soft delete).
 * Establece DETAIL_ROW.DELETED = false.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación a restaurar.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
      query: "SELECT TOP 1 *.* FROM c WHERE c.APPID = @appId",
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

/**
 * Añade una nueva vista a una aplicación existente.
 * Verifica que no exista ya y la agrega al arreglo VIEWS.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {Object} data - Datos de la vista a añadir (VIEWSID, PROCESS opcional).
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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

/**
 * Añade un nuevo proceso a una vista existente dentro de una aplicación.
 * Verifica que no exista ya y lo agrega al arreglo PROCESS de la vista.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista.
 * @param {string} processId - ID del proceso a añadir.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
// Añade un nuevo proceso a una vista existente
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
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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

/**
 * Añade un privilegio a un proceso existente dentro de una vista de una aplicación.
 * Extrae privilegeId de data, verifica existencia y lo agrega al arreglo PRIVILEGE.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista.
 * @param {string} processId - ID del proceso.
 * @param {Object} data - Datos que incluyen privilegeId.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
// Añade un privilegio a un proceso existente dentro de una vista
async function addPrivilegeMethod(bitacora, appId, viewId, processId, data, req) {
  let response = DATA();
  bitacora.process = "Añadir privilegio a proceso";
  response.process = bitacora.process;
  response.method = "POST";
  response.api = "/addPrivilege";

  // Nuevo: extraer privilegeId desde data
  const privilegeId = data?.privilegeId;

  if (!privilegeId) {
    response.status = 400;
    response.messageDEV = "privilegeId es requerido";
    response.messageUSR = "<<ERROR>> El ID del privilegio es obligatorio";
    response.dataRes = null;
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

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

        const process = (view.PROCESS || []).find(p => p.PROCESSID === processId);
        if (!process) {
          response.status = 404;
          response.messageDEV = "Proceso no encontrado";
          response.messageUSR = "<<ERROR>> El proceso no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        process.PRIVILEGE = process.PRIVILEGE || [];
        const privilegeExists = process.PRIVILEGE.some(p => p.PRIVILEGEID === privilegeId);

        if (privilegeExists) {
          response.status = 409;
          response.messageDEV = `El privilegio con ID ${privilegeId} ya existe en el proceso`;
          response.messageUSR = "<<ERROR>> El privilegio ya existe en este proceso";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }

        process.PRIVILEGE.push({ PRIVILEGEID: privilegeId });

        return application.save()
          .then(saved => {
            response.status = 201;
            response.messageDEV = "Privilegio añadido correctamente";
            response.messageUSR = "<<OK>> Privilegio añadido correctamente";
            response.dataRes = saved.toObject();
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo añadir el privilegio";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });

  } else {
    // COSMOS SQL
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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

        const process = (view.PROCESS || []).find(p => p.PROCESSID === processId);
        if (!process) {
          response.status = 404;
          response.messageDEV = "Proceso no encontrado";
          response.messageUSR = "<<ERROR>> El proceso no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        process.PRIVILEGE = process.PRIVILEGE || [];
        const privilegeExists = process.PRIVILEGE.some(p => p.PRIVILEGEID === privilegeId);

        if (privilegeExists) {
          response.status = 409;
          response.messageDEV = `El privilegio con ID ${privilegeId} ya existe en el proceso`;
          response.messageUSR = "<<ERROR>> El privilegio ya existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
        }

        process.PRIVILEGE.push({ PRIVILEGEID: privilegeId });

        return container.items.upsert(application)
          .then(upsertRes => {
            response.status = 201;
            response.messageDEV = "Privilegio añadido correctamente (Cosmos SQL)";
            response.messageUSR = "<<OK>> Privilegio añadido correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 201, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo añadir el privilegio (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}



//deletes

/**
 * Elimina permanentemente (hard delete) una aplicación de la base de datos.
 * Elimina el documento completamente.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación a eliminar.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
        query: "SELECT TOP 1 *.id, c.APPID FROM c WHERE c.APPID = @appId",
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

/**
 * Elimina permanentemente una vista de una aplicación.
 * Remueve la vista del arreglo VIEWS.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista a eliminar.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
        query: "SELECT TOP 1 *.* FROM c WHERE c.APPID = @appId",
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




/**
 * Elimina permanentemente un proceso de una vista dentro de una aplicación.
 * Remueve el proceso del arreglo PROCESS de la vista.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista.
 * @param {string} processId - ID del proceso a eliminar.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
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
        query: "SELECT TOP 1 *.* FROM c WHERE c.APPID = @appId",
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

/**
 * Elimina un privilegio de un proceso dentro de una vista de una aplicación.
 * Extrae privilegeId de data y lo remueve del arreglo PRIVILEGE.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {string} viewId - ID de la vista.
 * @param {string} processId - ID del proceso.
 * @param {Object} data - Datos que incluyen privilegeId.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos.
 */
async function deletePrivilegeMethod(bitacora, appId, viewId, processId, data, req) {
  console.log("delete privilege");
  let response = DATA();
  bitacora.process = "Eliminar privilegio de proceso";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/deletePrivilege";

  // Extraer el privilegeId desde data
  const privilegeId = data?.privilegeId;

  if (!privilegeId) {
    response.status = 400;
    response.messageDEV = "privilegeId es requerido";
    response.messageUSR = "<<ERROR>> El ID del privilegio es obligatorio";
    response.dataRes = null;
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

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

        const process = (view.PROCESS || []).find(p => p.PROCESSID === processId);
        if (!process) {
          response.status = 404;
          response.messageDEV = "Proceso no encontrado";
          response.messageUSR = "<<ERROR>> El proceso no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        process.PRIVILEGE = process.PRIVILEGE || [];

        const index = process.PRIVILEGE.findIndex(p => p.PRIVILEGEID === privilegeId);
        if (index === -1) {
          response.status = 404;
          response.messageDEV = `El privilegio con ID ${privilegeId} no existe`;
          response.messageUSR = "<<ERROR>> El privilegio no se encuentra en este proceso";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        // Eliminar privilegio
        process.PRIVILEGE.splice(index, 1);

        return application.save()
          .then(saved => {
            response.status = 200;
            response.messageDEV = "Privilegio eliminado correctamente";
            response.messageUSR = "<<OK>> Privilegio eliminado correctamente";
            response.dataRes = saved.toObject();
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.status || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo eliminar el privilegio";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });

  } else {
    // COSMOS SQL
    const container = getDatabase().container("ZTAPPLICATION");
    const querySpec = {
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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

        const process = (view.PROCESS || []).find(p => p.PROCESSID === processId);
        if (!process) {
          response.status = 404;
          response.messageDEV = "Proceso no encontrado";
          response.messageUSR = "<<ERROR>> El proceso no existe";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        process.PRIVILEGE = process.PRIVILEGE || [];

        const index = process.PRIVILEGE.findIndex(p => p.PRIVILEGEID === privilegeId);
        if (index === -1) {
          response.status = 404;
          response.messageDEV = `El privilegio con ID ${privilegeId} no existe`;
          response.messageUSR = "<<ERROR>> El privilegio no se encuentra en este proceso";
          response.dataRes = null;
          return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
        }

        process.PRIVILEGE.splice(index, 1);

        return container.items.upsert(application)
          .then(upsertRes => {
            response.status = 200;
            response.messageDEV = "Privilegio eliminado correctamente (Cosmos SQL)";
            response.messageUSR = "<<OK>> Privilegio eliminado correctamente (Cosmos SQL)";
            response.dataRes = upsertRes.resource;
            return OK(AddMSG(bitacora, response, "OK", 200, true));
          });
      })
      .catch(err => {
        response.status = err.code || 500;
        response.messageDEV = err.message || err;
        response.messageUSR = "<<ERROR>> No se pudo eliminar el privilegio (Cosmos SQL)";
        response.dataRes = err;
        return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
      });
  }
}


/**
 * Obtiene todas las aplicaciones de la base de datos.
 * Retorna una lista de aplicaciones.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos (lista de aplicaciones).
 */
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


/**
 * Obtiene una aplicación específica por su APPID.
 * Retorna los datos de la aplicación.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación a obtener.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y datos de la aplicación.
 */
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
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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


/**
 * Obtiene todos los procesos asociados a una aplicación, aplanando vistas y procesos.
 * Retorna una lista de objetos con viewId y processId.
 * Soporta MongoDB y Azure Cosmos DB.
 * @param {Object} bitacora - Objeto de bitácora para logging.
 * @param {string} appId - ID de la aplicación.
 * @param {Object} req - Objeto de solicitud para obtener dbserver.
 * @returns {Object} Resultado de OK o FAIL con mensaje y lista de procesos.
 */
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
      query: "SELECT TOP 1 * FROM c WHERE c.APPID = @appId",
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