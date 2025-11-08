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
    console.error(`Error conectando a DB [${DBServer}]:`, err.message || err);
    throw err;
  }
}

// Modelo simple para MongoDB (si se utiliza)
const ProcessSchema = new mongoose.Schema({
  PROCESSID: { type: String, required: true, unique: true },
  DESCRIPCION: { type: String }
}, { collection: "ZTPROCESSES", versionKey: false });

const ProcessesModel = mongoose.models.ZTPROCESSES || mongoose.model("ZTPROCESSES", ProcessSchema);

async function crudProcess(req) {
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
      case "addProcess":
        bitacora = await createProcessMethod(bitacora, body.data, req);
        break;
      case "updateProcess":
        bitacora = await updateProcessMethod(bitacora, body.processId || params.processId, body.data, req);
        break;
      case "getProcess":
        bitacora = await getProcessMethod(bitacora, body.processId || params.processId, req);
        break;
      case "getAll":
        bitacora = await getProcessesMethod(bitacora, req);
        break;
      case "deleteProcess":
        bitacora = await deleteProcessMethod(bitacora, body.processId || params.processId, req);
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

/* createProcess: body debe contener PROCESSID y opcional DESCRIPCION */
async function createProcessMethod(bitacora, processData, req) {
  let response = DATA();
  bitacora.process = "Creación de proceso";
  response.process = bitacora.process;
  response.method = "POST";
  response.api = "/processes/create";

  const dbServer = req.req.query?.dbserver;

  if (!processData || !processData.PROCESSID) {
    response.status = 400;
    response.messageDEV = "PROCESSID requerido";
    response.messageUSR = "<<ERROR>> PROCESSID es obligatorio";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const exists = await ProcessesModel.findOne({ PROCESSID: processData.PROCESSID }).lean();
      if (exists) {
        response.status = 409;
        response.messageDEV = "PROCESSID ya existe (MongoDB)";
        response.messageUSR = "<<ERROR>> Ya existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
      }
      const saved = await ProcessesModel.create(processData);
      response.status = 201;
      response.messageUSR = "<<OK>> Proceso creado (MongoDB)";
      response.dataRes = saved.toObject ? saved.toObject() : saved;
      return OK(AddMSG(bitacora, response, "OK", 201, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo crear el proceso (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTPROCESSES");
      const querySpec = { query: "SELECT TOP 1 c.PROCESSID FROM c WHERE c.PROCESSID = @pid", parameters: [{ name: "@pid", value: processData.PROCESSID }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      if (resources && resources.length) {
        response.status = 409;
        response.messageDEV = "PROCESSID ya existe (Cosmos)";
        response.messageUSR = "<<ERROR>> Ya existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 409, true));
      }
      const { resource } = await container.items.create(processData);
      response.status = 201;
      response.messageUSR = "<<OK>> Proceso creado (Cosmos)";
      response.dataRes = resource;
      return OK(AddMSG(bitacora, response, "OK", 201, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo crear el proceso (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* updateProcess: processId y data */
async function updateProcessMethod(bitacora, processId, data, req) {
  let response = DATA();
  bitacora.process = "Actualización de proceso";
  response.process = bitacora.process;
  response.method = "PATCH";
  response.api = "/processes/update";

  const dbServer = req.req.query?.dbserver;

  if (!processId || !data) {
    response.status = 400;
    response.messageDEV = "Parámetros faltantes";
    response.messageUSR = "<<ERROR>> processId y data requeridos";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const proc = await ProcessesModel.findOne({ PROCESSID: processId });
      if (!proc) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (MongoDB)";
        response.messageUSR = "<<ERROR>> No existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      Object.assign(proc, data);
      const updated = await proc.save();
      response.status = 200;
      response.messageUSR = "<<OK>> Proceso actualizado (MongoDB)";
      response.dataRes = updated.toObject();
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo actualizar el proceso (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTPROCESSES");
      const querySpec = { query: "SELECT TOP 1 c.* FROM c WHERE c.PROCESSID = @pid", parameters: [{ name: "@pid", value: processId }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      const proc = resources[0];
      if (!proc) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (Cosmos)";
        response.messageUSR = "<<ERROR>> No existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      const updatedDoc = { ...proc, ...data };
      const { resource } = await container.items.upsert(updatedDoc);
      response.status = 200;
      response.messageUSR = "<<OK>> Proceso actualizado (Cosmos)";
      response.dataRes = resource;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo actualizar el proceso (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* getProcess */
async function getProcessMethod(bitacora, processId, req) {
  let response = DATA();
  bitacora.process = "Obtener proceso";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/processes/get";

  const dbServer = req.req.query?.dbserver;

  if (!processId) {
    response.status = 400;
    response.messageDEV = "processId requerido";
    response.messageUSR = "<<ERROR>> processId es obligatorio";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const proc = await ProcessesModel.findOne({ PROCESSID: processId }).lean();
      if (!proc) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (MongoDB)";
        response.messageUSR = "<<ERROR>> No existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      response.status = 200;
      response.messageUSR = "<<OK>> Proceso obtenido (MongoDB)";
      response.dataRes = proc;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo obtener el proceso (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTPROCESSES");
      const querySpec = { query: "SELECT TOP 1 c.* FROM c WHERE c.PROCESSID = @pid", parameters: [{ name: "@pid", value: processId }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      const proc = resources[0];
      if (!proc) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (Cosmos)";
        response.messageUSR = "<<ERROR>> No existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      response.status = 200;
      response.messageUSR = "<<OK>> Proceso obtenido (Cosmos)";
      response.dataRes = proc;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo obtener el proceso (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* get all processes */
async function getProcessesMethod(bitacora, req) {
  let response = DATA();
  bitacora.process = "Obtener todos los procesos";
  response.process = bitacora.process;
  response.method = "GET";
  response.api = "/processes";

  const dbServer = req.req.query?.dbserver;

  if (dbServer === "MongoDB") {
    try {
      const procs = await ProcessesModel.find().lean();
      response.status = 200;
      response.messageUSR = "<<OK>> Procesos obtenidos (MongoDB)";
      response.dataRes = procs;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudieron obtener los procesos (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTPROCESSES");
      const { resources } = await container.items.query({ query: "SELECT * FROM c" }).fetchAll();
      response.status = 200;
      response.messageUSR = "<<OK>> Procesos obtenidos (Cosmos)";
      response.dataRes = resources;
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudieron obtener los procesos (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

/* deleteProcess */
async function deleteProcessMethod(bitacora, processId, req) {
  let response = DATA();
  bitacora.process = "Eliminar proceso";
  response.process = bitacora.process;
  response.method = "DELETE";
  response.api = "/processes/delete";

  const dbServer = req.req.query?.dbserver;

  if (!processId) {
    response.status = 400;
    response.messageDEV = "processId requerido";
    response.messageUSR = "<<ERROR>> processId es obligatorio";
    return FAIL(AddMSG(bitacora, response, "FAIL", 400, true));
  }

  if (dbServer === "MongoDB") {
    try {
      const deleted = await ProcessesModel.deleteOne({ PROCESSID: processId });
      if (!deleted || deleted.deletedCount === 0) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (MongoDB)";
        response.messageUSR = "<<ERROR>> No existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      response.status = 200;
      response.messageUSR = "<<OK>> Proceso eliminado (MongoDB)";
      response.dataRes = { PROCESSID: processId };
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.status || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar el proceso (MongoDB)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  } else {
    try {
      const container = getDatabase().container("ZTPROCESSES");
      const querySpec = { query: "SELECT TOP 1 c.id, c.PROCESSID FROM c WHERE c.PROCESSID = @pid", parameters: [{ name: "@pid", value: processId }] };
      const { resources } = await container.items.query(querySpec).fetchAll();
      const proc = resources[0];
      if (!proc) {
        response.status = 404;
        response.messageDEV = "Proceso no encontrado (Cosmos)";
        response.messageUSR = "<<ERROR>> No existe el proceso";
        return FAIL(AddMSG(bitacora, response, "FAIL", 404, true));
      }
      await container.item(proc.id, proc.PROCESSID).delete();
      response.status = 200;
      response.messageUSR = "<<OK>> Proceso eliminado (Cosmos)";
      response.dataRes = { PROCESSID: processId };
      return OK(AddMSG(bitacora, response, "OK", 200, true));
    } catch (err) {
      response.status = err.code || 500;
      response.messageDEV = err.message || err;
      response.messageUSR = "<<ERROR>> No se pudo eliminar el proceso (Cosmos)";
      response.dataRes = err;
      return FAIL(AddMSG(bitacora, response, "FAIL", response.status, true));
    }
  }
}

module.exports = {
  crudProcess
};
