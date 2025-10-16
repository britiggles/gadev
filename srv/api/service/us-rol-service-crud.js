

const {
  getRolAll,
  getRolById,
  postRol,
  addProcessRol,
  addPrivilege,
  DeleteHard,
  RemoveProcess,
  RemovePrivilege,
} = require("./us-rol-service"); 


const mongoHandlers = {
  get: {
    all: (data, req) => getRolAll(),
    one: (data, req) => getRolById(data),
    processByRol: (data, req) => getProcessByRol(data.ROLID, req),
    privilegesByRol: (data, req) => getPrivilegesByRol(data.ROLID, data.PROCESSID, req)
  },
  post: {
    create: (data, req) => postRol(data),
    addProcess: (data, req) => addProcessRol(data.ROLEID, data),
    addPrivilege: (data, req) => {
      const { ROLEID } = data;
      const { PROCESSID } = data.PROCESS[0];
      const { PRIVILEGEID } = data.PROCESS[0].PRIVILEGE[0];
      return addPrivilege(ROLEID, PROCESSID, PRIVILEGEID);
    },
  },
  delete: {
    hard: (data, req) => DeleteHard(data.ROLEID),
    process: (data, req) => {
      const { ROLEID } = data;
      const { PROCESSID } = data.PROCESS[0];
      return RemoveProcess(ROLEID, PROCESSID);
    },
    // Ojo: tu código original tenía 'privilage', lo corregí a 'privilege' por consistencia.
    // Si en el frontend lo mandas como 'privilage', ajústalo aquí.
    privilege: (data, req) => {
      const { ROLEID } = data;
      const { PROCESSID } = data.PROCESS[0];
      const { PRIVILEGEID } = data.PROCESS[0].PRIVILEGE[0];
      return RemovePrivilege(ROLEID, PROCESSID, PRIVILEGEID);
    },
  },
};

/**
 * @description
 * Orquesta las operaciones específicas para MongoDB.
 * Busca y ejecuta el manejador adecuado del mapa `mongoHandlers`.
 */
async function mongoServices(req) {
  const { procedure, type } = req.req.query;
  const data = req.data.rol;

  try {
    // 1. Buscamos el manejador correspondiente
    const handler = mongoHandlers[procedure]?.[type];

    // 2. Si existe, lo ejecutamos
    if (handler) {
      return await handler(data, req);
    }

    // 3. Si no, lanzamos un error claro
    throw new Error(`Operación no válida: procedure='${procedure}', type='${type}'`);

  } catch (error) {
    console.error("Error en mongoServices:", error.message);
    // Propagamos el error al manejador de CAP para una respuesta estandarizada
    req.error(500, error.message);
  }
}

async function rolCrudService(req) {
  const { db } = req.req.query;

  switch (db) {
    case "mongo":
      return mongoServices(req);

    case "cosmos":
      // Aquí iría la llamada a cosmosServices(req) en el futuro
      console.log("Cosmos DB no implementado aún.");
      req.error(501, "Cosmos DB no implementado aún."); // 501 = Not Implemented
      break;

    default:
      const errorMessage = `Base de datos no soportada: '${db}'`;
      console.log(errorMessage);
      req.error(400, errorMessage); // 400 = Bad Request
      break;
  }
}

module.exports = {
  rolCrudService,
};