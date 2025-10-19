const mongoose = require("mongoose");
const { getDatabase } = require("../../config/connectToCosmosDB.js");
const Rol = require("../models/mongodb/Rol.js");
const {
  BITACORA,
  DATA,
  AddMSG,
  OK,
  FAIL,
} = require("../../middlewares/respPWA.handler.js");
//conexion al container (como coleccion en mongoDB)

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

async function getRolAll(processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener todos los Roles`;
  let dataPaso = DATA();
  dataPaso.process = `Consulta a ${dbServer} para obtener roles`;
  dataPaso.method = "GET";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser };
  try {
    let roles;
    if (dbServer === "MongoDB") {
      roles = await Rol.find().lean();
    } else {
      // Consulta tipo SQL
      const querySpec = {
        query: "SELECT * FROM c",
      };
      const contaRoles = getDatabase().container("ZTROL");
      const { resources } = await contaRoles.items.query(querySpec).fetchAll();
      roles = resources;
    }
    dataPaso.dataRes = roles;
    dataPaso.messageUSR = "Roles obtenidos exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudieron obtener los roles. Intente más tarde.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;
    bitacora.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function getRolById(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener un Rol por su ID`;
  let dataPaso = DATA();
  dataPaso.process = "Consulta a MongoDB para obtener un rol específico";

  try {
    const { ROLEID } = data;
    dataPaso.dataReq = { data, processType, dbServer, loggedUser };
    dataPaso.method = "GET";
    dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
    const rol = await Rol.findOne({ ROLEID }).lean();

    if (!rol) {
      dataPaso.messageDEV = `No se encontró un rol con el ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que buscas no existe.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    dataPaso.dataRes = rol;
    dataPaso.messageUSR = "Rol obtenido exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al buscar el rol.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function getProcessByRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener procesos asociados a un Rol`;
  let dataPaso = DATA();
  dataPaso.method = "GET";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.process = "Consulta a MongoDB para obtener los procesos de un rol";
  const { ROLEID } = data;
  dataPaso.dataReq = { processType, dbServer, loggedUser, ROLEID };

  try {
    const rol = await Rol.findOne({ ROLEID }, { PROCESS: 1 }).lean();
    if (!rol || !rol.PROCESS) {
      dataPaso.messageDEV = `No se encontraron procesos asociados al ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Este rol no tiene procesos asociados.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    dataPaso.dataRes = rol.PROCESS;
    dataPaso.messageUSR = "Procesos obtenidos exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al obtener los procesos.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function getPrivilegesByRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  dataPaso.method = "GET";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  bitacora.process = `${processType} - Obtener privilegios asociados a un Rol y Proceso`;
  let dataPaso = DATA();
  dataPaso.process =
    "Consulta a MongoDB para obtener privilegios de un proceso específico";
  const { ROLEID, PROCESSID } = data;
  dataPaso.dataReq = { ROLEID, PROCESSID };

  try {
    const rol = await Rol.findOne({ ROLEID }, { PROCESS: 1 }).lean();
    if (!rol || !rol.PROCESS) {
      dataPaso.messageDEV = `No se encontraron procesos para el ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol no tiene procesos asociados.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    const proceso = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!proceso || !proceso.PRIVILEGE) {
      dataPaso.messageDEV = `No se encontró el proceso con ID: ${PROCESSID}`;
      dataPaso.messageUSR = "El proceso no tiene privilegios registrados.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    dataPaso.dataRes = proceso.PRIVILEGE;
    dataPaso.messageUSR = "Privilegios obtenidos exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al obtener los privilegios.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function postRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Crear un nuevo Rol`;
  let dataPaso = DATA();
  dataPaso.process = `Guardado de nuevo rol en ${dbServer}`;
  dataPaso.method = "POST";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };
  try {
    let roles;
    if (dbServer === "MongoDB") {
      const newRol = new Rol(data);
      roles = await newRol.save();
      roles = roles.toObject();
    } else {
      // Cosmos requiere que cada item tenga un "id"
      if (!data.id) {
        data.id = data.ROLEID;
      }
      const contaRoles = getDatabase().container("ZTROL");
      const { resources } = await contaRoles.items.create(data);
      roles = resources;
    }
    dataPaso.dataRes = roles;
    dataPaso.messageUSR = "Rol creado exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 201);
    return OK(bitacora, 201);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudo crear el rol. Verifique que los datos sean correctos.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }
}

async function UpdateRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Actualizar un Rol`;
  let dataPaso = DATA();
  dataPaso.process = `Actualizacion de un rol en ${dbServer}`; // Mensaje dinámico
  dataPaso.method = "PUT";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  try {
    const { ROLEID } = data;

    // 1. Validar que el ROLEID venga en la data (común para ambas DB)
    if (!ROLEID) {
      dataPaso.messageDEV = "El campo 'ROLEID' es requerido para actualizar.";
      dataPaso.messageUSR = "No se proporcionó el identificador del rol.";
      // ... (código de error)
      AddMSG(bitacora, dataPaso, "FAIL", 400);
      return FAIL(bitacora);
    }

    let updatedRol; // Variable para almacenar el resultado

    // 2. Lógica separada por tipo de base de datos
    if (dbServer === "MongoDB") {
      // --- LÓGICA PARA MONGODB ---
      updatedRol = await Rol.findOneAndUpdate({ ROLEID: ROLEID }, data, {
        new: true,
      });
      if (updatedRol) {
        updatedRol = updatedRol.toObject(); // Convertir a objeto plano
      }
    } else {

      const contaRoles = getDatabase().container("ZTROL");

      const querySpec = {
        query: "SELECT * FROM c WHERE c.ROLEID = @roleId",
        parameters: [
          {
            name: "@roleId",
            value: ROLEID,
          },
        ],
      };

      const { resources: items } = await contaRoles.items
        .query(querySpec)
        .fetchAll();

      if (items.length === 0) {
        finalUpdatedRol = null;
      } else {
        const rolToUpdate = items[0];

        const updatedData = { ...rolToUpdate, ...data };

        const { resource: replacedItem } = await contaRoles
          .item(rolToUpdate.id, rolToUpdate.ROLEID)
          .replace(updatedData);
        finalUpdatedRol = replacedItem;
        updatedRol = true;
      }
    }

    // 3. Manejar el caso si no se encuentra el rol para actualizar
    if (!updatedRol) {
      dataPaso.messageDEV = `No se encontró un rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que intenta actualizar no existe.";
      // ... (código de error)
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // 4. Éxito: El rol fue actualizado
    dataPaso.dataRes = updatedRol;
    dataPaso.messageUSR = "Rol actualizado exitosamente.";

    // ... (código de éxito)
    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;
    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    // El catch manejará errores de conexión o si el item no existe en Cosmos DB
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudo actualizar el rol. Verifique que los datos sean correctos.";

    // ... (código de error)
    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }
}

async function addProcessRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Añadir proceso a un Rol`;
  let dataPaso = DATA();
  dataPaso.process = "Añadir proceso dentro de un rol en MongoDB";
  dataPaso.method = "POST";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  try {
    const { ROLEID, PROCESS } = data;
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `No se encontró el rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const processExist = rol.PROCESS.some(
      (p) => p.PROCESSID === PROCESS[0].PROCESSID
    );
    if (processExist) {
      dataPaso.messageDEV = `El proceso con ID '${PROCESS[0].PROCESSID}' ya existe en este rol.`;
      dataPaso.messageUSR = "El proceso ya existe en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 409);
      return FAIL(bitacora);
    }

    rol.PROCESS.push({
      NAMEAPP: PROCESS[0].NAMEAPP,
      PROCESSID: PROCESS[0].PROCESSID,
      PRIVILEGEID: PROCESS[0].PRIVILEGEID || [],
    });

    const updatedRol = await rol.save();
    dataPaso.dataRes = updatedRol.toObject();
    dataPaso.messageUSR = "Proceso añadido exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "No se pudo añadir el proceso.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function addPrivilege(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Añadir privilegio a un proceso en Rol`;
  let dataPaso = DATA();
  dataPaso.process = "Añadir privilegio dentro de un proceso en MongoDB";
  dataPaso.method = "POST";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };
  try {
    const { ROLEID, PROCESSID, PRIVILEGEID } = data;
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `No se encontró el rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    const targetProcess = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!targetProcess) {
      dataPaso.messageDEV = `No se encontró el proceso con ID: ${PROCESSID}`;
      dataPaso.messageUSR = "Proceso no encontrado en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    const privilegeExist = targetProcess.PRIVILEGE?.some(
      (priv) => priv.PRIVILEGEID === PRIVILEGEID
    );
    if (privilegeExist) {
      dataPaso.messageDEV = `El privilegio con ID '${PRIVILEGEID}' ya existe en este proceso.`;
      dataPaso.messageUSR = "El privilegio ya existe en el proceso.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 409);
      return FAIL(bitacora);
    }

    if (!targetProcess.PRIVILEGE) targetProcess.PRIVILEGE = [];
    targetProcess.PRIVILEGE.push({ PRIVILEGEID });

    const updatedRol = await rol.save();
    dataPaso.dataRes = updatedRol.toObject();
    dataPaso.messageUSR = "Privilegio añadido exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "No se pudo añadir el privilegio.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function deleteRolHard(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Eliminación física de un Rol`;
  let dataPaso = DATA();
  const { ROLEID } = data;

  dataPaso.process = `Búsqueda y eliminación de rol en ${dbServer}`;
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  // 1. Validar que el ROLEID venga en la data (común para ambas DB)
  if (!ROLEID) {
    dataPaso.messageDEV = "El campo 'ROLEID' es requerido para eliminar.";
    dataPaso.messageUSR = "No se proporcionó el identificador del rol.";
    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }

  try {
    let deletedRol; // Variable para almacenar el resultado

    // 2. Lógica separada por tipo de base de datos
    if (dbServer === "MongoDB") {
      // --- LÓGICA PARA MONGODB ---
      const mongoResult = await Rol.findOneAndDelete({ ROLEID });
      if (mongoResult) {
        deletedRol = mongoResult.toObject();
      }
    } else {
      // --- LÓGICA PARA AZURE COSMOS DB ---
      const contaRoles = getDatabase().container("ZTROL");

      // a. Crear la consulta para buscar el documento por ROLEID
      const querySpec = {
        query: "SELECT * FROM c WHERE c.ROLEID = @roleId",
        parameters: [{ name: "@roleId", value: ROLEID }],
      };

      // b. Ejecutar la consulta para encontrar el documento
      const { resources: items } = await contaRoles.items
        .query(querySpec)
        .fetchAll();

      if (items.length > 0) {
        const rolToDelete = items[0]; // El documento a eliminar

        // c. Eliminar el documento usando su 'id' y su partition key ('ROLEID')
        await contaRoles.item(rolToDelete.id, rolToDelete.ROLEID).delete();
        
        // Guardamos el objeto que acabamos de eliminar para devolverlo en la respuesta
        deletedRol = rolToDelete; 
      }
    }

    // 3. Manejar el caso si no se encontró el rol para eliminar
    if (!deletedRol) {
      dataPaso.messageDEV = `No se encontró un rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que intenta eliminar no existe.";
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // 4. Éxito: El rol fue eliminado
    dataPaso.dataRes = deletedRol;
    dataPaso.messageUSR = "Rol eliminado exitosamente.";

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;
    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
    
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al intentar eliminar el rol.";
    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function removeProcess(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Eliminar proceso de un Rol`;
  let dataPaso = DATA();
  const { ROLEID } = data;
  const { PROCESSID } = data.PROCESS[0];
  dataPaso.process = "Eliminar proceso de rol en MongoDB";
  dataPaso.dataReq = { ROLEID, PROCESSID };

  try {
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `El rol con ID '${ROLEID}' no fue encontrado.`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const procesoExiste = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!procesoExiste) {
      dataPaso.messageDEV = `El proceso con ID '${PROCESSID}' no existe en este rol.`;
      dataPaso.messageUSR = "Proceso no encontrado en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const updatedRol = await Rol.findOneAndUpdate(
      { ROLEID },
      { $pull: { PROCESS: { PROCESSID } } },
      { new: true }
    );
    dataPaso.dataRes = updatedRol ? updatedRol.toObject() : null;
    dataPaso.messageUSR = "Proceso eliminado exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al eliminar el proceso.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function removePrivilege(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Eliminar privilegio de un proceso en Rol`;
  let dataPaso = DATA();
  const { ROLEID } = data;
  const { PROCESSID } = data.PROCESS[0];
  const { PRIVILEGEID } = data.PROCESS[0].PRIVILEGE[0];
  dataPaso.process = "Eliminar privilegio dentro de proceso en MongoDB";
  dataPaso.dataReq = { ROLEID, PROCESSID, PRIVILEGEID };

  try {
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `El rol con ID '${ROLEID}' no fue encontrado.`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const procesoExiste = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!procesoExiste) {
      dataPaso.messageDEV = `El proceso con ID '${PROCESSID}' no existe en este rol.`;
      dataPaso.messageUSR = "Proceso no encontrado en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const updatedRol = await Rol.findOneAndUpdate(
      { ROLEID },
      { $pull: { "PROCESS.$[proc].PRIVILEGE": { PRIVILEGEID } } },
      {
        arrayFilters: [{ "proc.PROCESSID": PROCESSID }],
        new: true,
      }
    );
    dataPaso.dataRes = updatedRol ? updatedRol.toObject() : null;
    dataPaso.messageUSR = "Privilegio eliminado exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al eliminar el privilegio.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

// Dispatcher centralizado
async function crudRol(req) {
  let bitacora = BITACORA();
  let data = DATA();

  let { ProcessType, LoggedUser, DBServer } = req.req.query;
  const body = req.req.body.rol;
  console.log(body);

  bitacora.loggedUser = LoggedUser;
  bitacora.processType = ProcessType;
  bitacora.dbServer = DBServer;

  await connectDB(DBServer);

  switch (ProcessType) {
    case "getAll":
      bitacora = await getRolAll(ProcessType, DBServer, LoggedUser);
      break;
    case "getById":
      bitacora = await getRolById(body, ProcessType, DBServer, LoggedUser);
      break;
    case "getProcess":
      bitacora = await getProcessByRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "getPrivileges":
      bitacora = await getPrivilegesByRol(
        body,
        ProcessType,
        DBServer,
        LoggedUser
      );
      break;
    case "postRol":
      bitacora = await postRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "addProcessRol":
      bitacora = await addProcessRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "addPrivilege":
      bitacora = await addPrivilege(body, ProcessType, DBServer, LoggedUser);
      break;
    case "deleteRol":
      bitacora = await deleteRolHard(body, ProcessType, DBServer, LoggedUser);
      break;
    case "removeProcess":
      bitacora = await removeProcess(body, ProcessType, DBServer, LoggedUser);
      break;
    case "removePrivilege":
      bitacora = await removePrivilege(body, ProcessType, DBServer, LoggedUser);
      break;
    case "updateOne":
      bitacora = await UpdateRol(body, ProcessType, DBServer, LoggedUser);
      break;
    default:
      data.status = 400;
      data.messageDEV = `Proceso no reconocido: ${ProcessType}`;
      data.messageUSR = "Tipo de proceso inválido";
      data.dataRes = null;
      throw new Error(data.messageDEV);
  }
  bitacora.success = true;
  return OK(bitacora);
}

module.exports = {
  crudRol,
  connectDB,
};
