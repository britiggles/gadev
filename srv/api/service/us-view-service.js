const mongoose = require("mongoose");
const { OK, BITACORA, DATA, FAIL, AddMSG } = require("../../middlewares/respPWA.handler.js");
const { getDatabase } = require("../../config/connectToCosmosDB.js");

async function connectDB(DBServer) {
  try {
    switch (DBServer) {
      case "MongoDB":
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        }
        break;
      case "AZURECOSMOS":
        // Conexión gestionada por getDatabase()
        break;
      default:
        throw new Error(`DBServer no reconocido: ${DBServer}`);
    }
  } catch (err) {
    console.error(`❌ Error al conectar a ${DBServer}:`, err.message || err);
    throw err;
  }
}

// Definición simple de modelo Mongo (si se usa MongoDB)
const ViewsSchema = new mongoose.Schema({
  VIEWSID: { type: String, required: true, unique: true },
  DESCRIPCION: { type: String }
}, { collection: "ZTVIEWS", versionKey: false });

const ViewsModel = mongoose.model("ZTVIEWS", ViewsSchema);

async function crudView(req) {
  let bitacora = BITACORA();
  let data = DATA();

  const ProcessType = req.req.query?.ProcessType;
  const dbServer = req.req.query?.dbserver;
  const body = req.req.body;
  const params = req.req.query || {};

  bitacora.processType = ProcessType;
  bitacora.dbServer = dbServer;

  try {
    await connectDB(dbServer);

    switch (ProcessType) {
      case "addView":
        bitacora = await createViewMethod(bitacora, body.data, req);
        break;
      case "updateView":
        bitacora = await updateViewMethod(bitacora, body.viewId || params.VIEWSID, body.data, req);
        break;
      case "getView":
        bitacora = await getViewMethod(bitacora, body.viewId || params.VIEWSID, req);
        break;
      case "getAll":
        bitacora = await getViewsMethod(bitacora, req);
        break;
      case "deleteView":
        bitacora = await deleteViewMethod(bitacora, body.viewId || params.VIEWSID, req);
        break;
      default:
        data.status = 400;
        data.messageDEV = `Proceso no reconocido: ${ProcessType}`;
        data.messageUSR = "Tipo de proceso inválido";
        throw AddMSG(bitacora, data, "FAIL", 400, true);
    }

    req.res.status(bitacora.status || 200).send(bitacora);
    return OK(bitacora);

  } catch (err) {
    if (!err?.finalRes) {
      data.status = data.status || 500;
      data.messageDEV = err.message || err;
      data.messageUSR = "<<ERROR>> El proceso no se completó";
      data.dataRes = err;
      err = AddMSG(bitacora, data, "FAIL");
    }

    req.error && req.error({
      code: "Internal-Server-Error",
      status: err.status,
      message: err.messageUSR,
      target: err.messageDEV,
      numericSeverity: 1,
      innererror: err
    });

    return FAIL(err);
  }
}

/* createView: body debe contener VIEWSID y opcional DESCRIPCION */
async function createViewMethod(bitacora, viewData, req) {
  let response = DATA();
  bitacora.process = "Creación de vista";
  response.process = bitacora.process;
  response.method = "POST";
  response.api = "/views/addView";

  const dbServer = req.req.query?.dbserver;

  if (!viewData || !viewData.VIEWSID) {
    response.status = 400;
    response.messageDEV = "VIEWSID requerido";
    response.messageUSR = "<<ERROR>> VIEWSID es obligatorio";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const exists = await ViewsModel.findOne({ VIEWSID: viewData.VIEWSID }).lean();
      if (exists) {
        response.status = 409;
        response.messageDEV = "VIEWSID ya existe (MongoDB)";
        response.messageUSR = "<<ERROR>> Ya existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
      }
      const saved = await ViewsModel.create(viewData);
      response.status = 201;
      response.messageUSR = "<<OK>> Vista creada (MongoDB)";
      response.dataRes = saved.toObject ? saved.toObject() : saved;
      return OK(AddMSG(bitacora, response, "OK", 201, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo crear la vista (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTVIEWS");
      // Comprobar existencia
      const querySpec = { query: "SELECT TOP 1 c.VIEWSID FROM c WHERE c.VIEWSID = @vid", parameters: [{ name: "@vid", value: viewData.VIEWSID }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      if (resources && resources.length) {
        response.status = 409;
        response.messageDEV = "VIEWSID ya existe (Cosmos)";
        response.messageUSR = "<<ERROR>> Ya existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
      }
      const { resource } = await container.items.create(viewData);
      response.status = 201;
      response.messageUSR = "<<OK>> Vista creada (Cosmos)";
      response.dataRes = resource;
      return OK(AddMSG(bitacora, response, "OK", 201, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo crear la vista (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* updateView: VIEWSID y data */
async function updateViewMethod(bitacora, VIEWSID, data, req) {
  let response = DATA();
  bitacora.process = "Actualización de vista";
  response.process = bitacora.process;
  response.method = "PATCH";
  response.api = "/views/update";

  const dbServer = req.req.query?.dbserver;

  if (!VIEWSID || !data) {
    response.status = 400;
    response.messageDEV = "Parámetros faltantes";
    response.messageUSR = "<<ERROR>> VIEWSID y data requeridos";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const view = await ViewsModel.findOne({ VIEWSID: VIEWSID });
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (MongoDB)";
        response.messageUSR = "<<ERROR>> No existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      Object.assign(view, data);
      const updated = await view.save();
      response.status = 200;
      response.messageUSR = "<<OK>> Vista actualizada (MongoDB)";
      response.dataRes = updated.toObject();
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo actualizar la vista (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTVIEWS");
      const querySpec = { query: "SELECT TOP 1 c.* FROM c WHERE c.VIEWSID = @vid", parameters: [{ name: "@vid", value: VIEWSID }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      const view = resources[0];
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (Cosmos)";
        response.messageUSR = "<<ERROR>> No existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      const updatedDoc = { ...view, ...data };
      const { resource } = await container.items.upsert(updatedDoc);
      response.status = 200;
      response.messageUSR = "<<OK>> Vista actualizada (Cosmos)";
      response.dataRes = resource;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo actualizar la vista (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* getView */
async function getViewMethod(bitacora, VIEWSID, req) {
  let response = DATA();
  bitacora.process = "Obtener vista";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/views/get";

  const dbServer = req.req.query?.dbserver;

  if (!VIEWSID) {
    response.status = 400;
    response.messageDEV = "VIEWSID requerido";
    response.messageUSR = "<<ERROR>> VIEWSID es obligatorio";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const view = await ViewsModel.findOne({ VIEWSID: VIEWSID }).lean();
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (MongoDB)";
        response.messageUSR = "<<ERROR>> No existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      response.status = 200;
      response.messageUSR = "<<OK>> Vista obtenida (MongoDB)";
      response.dataRes = view;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo obtener la vista (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTVIEWS");
      const querySpec = { query: "SELECT TOP 1 c.* FROM c WHERE c.VIEWSID = @vid", parameters: [{ name: "@vid", value: VIEWSID }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      const view = resources[0];
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (Cosmos)";
        response.messageUSR = "<<ERROR>> No existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      response.status = 200;
      response.messageUSR = "<<OK>> Vista obtenida (Cosmos)";
      response.dataRes = view;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo obtener la vista (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* get all views */
async function getViewsMethod(bitacora, req) {
  let response = DATA();
  bitacora.process = "Obtener todas las vistas";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/views";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    try {
      const views = await ViewsModel.find().lean();
      response.status = 200;
      response.messageUSR = "<<OK>> Vistas obtenidas (MongoDB)";
      response.dataRes = views;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudieron obtener las vistas (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTVIEWS");
      const { resources } = await container.items.query({ query: "SELECT * FROM c" }).fetchAll();
      response.status = 200;
      response.messageUSR = "<<OK>> Vistas obtenidas (Cosmos)";
      response.dataRes = resources;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudieron obtener las vistas (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* deleteView */
async function deleteViewMethod(bitacora, VIEWSID, req) {
  let response = DATA();
  bitacora.process = "Eliminar vista";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/views/delete";

  const dbServer = req.req.query?.dbserver;

  if (!VIEWSID) {
    response.status = 400;
    response.messageDEV = "VIEWSID requerido";
    response.messageUSR = "<<ERROR>> VIEWSID es obligatorio";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const deleted = await ViewsModel.deleteOne({ VIEWSID: VIEWSID });
      if (!deleted || deleted.deletedCount === 0) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (MongoDB)";
        response.messageUSR = "<<ERROR>> No existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      response.status = 200;
      response.messageUSR = "<<OK>> Vista eliminada (MongoDB)";
      response.dataRes = { VIEWSID: VIEWSID };
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar la vista (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTVIEWS");
      const querySpec = { query: "SELECT TOP 1 c.id, c.VIEWSID FROM c WHERE c.VIEWSID = @vid", parameters: [{ name: "@vid", value: VIEWSID }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      const view = resources[0];
      if (!view) {
        response.status = 404;
        response.messageDEV = "Vista no encontrada (Cosmos)";
        response.messageUSR = "<<ERROR>> No existe la vista";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      await container.item(view.id, view.VIEWSID).delete();
      response.status = 200;
      response.messageUSR = "<<OK>> Vista eliminada (Cosmos)";
      response.dataRes = { VIEWSID: VIEWSID };
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar la vista (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

module.exports = {
  crudView
};