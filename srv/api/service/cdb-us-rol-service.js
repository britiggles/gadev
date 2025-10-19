const { CosmosClient } = require("@azure/cosmos");
const {getDatabase} = require("../../config/connectToCosmosDB.js")
const {
  BITACORA,
  DATA,
  AddMSG,
  OK,
  FAIL,
} = require("../../middlewares/respPWA.handler.js");

//Ruta para pruebas
//http://localhost:3333/api/roles/ccrud?ProcessType=postRol&DBServer=AZURECOSMOS&LoggedUser=AGUIZARE
const{connectDB} = require("./us-rol-service.js"); //se ocupa o truena la conexion segun el DBServer
//conexion al container (como coleccion en mongoDB)
const contaRoles = getDatabase().container("ZTROL")

// Dispatcher centralizado
async function crudRolC(req) {
  let bitacora = BITACORA();
  let data = DATA();

  let { ProcessType, LoggedUser, DBServer } = req.req.query;
  const body = req.req.body.rol;
  console.log(body);

  bitacora.loggedUseroggedUser = LoggedUser;
  bitacora.processType = ProcessType;
  bitacora.dbServer = DBServer;

  await connectDB(DBServer);

  switch (ProcessType) {
    case "getAll":
      bitacora = await getRolAll(ProcessType, DBServer, LoggedUser);
      break;
    // case "getById":
    //   bitacora = await getRolById(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "getProcess":
    //   bitacora = await getProcessByRol(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "getPrivileges":
    //   bitacora = await getPrivilegesByRol(
    //     body,
    //     ProcessType,
    //     DBServer,
    //     LoggedUser
    //   );
    //   break;
    case "postRol":
      bitacora = await postRol(body, ProcessType, DBServer, LoggedUser);
      break;
    // case "addProcessRol":
    //   bitacora = await addProcessRol(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "addPrivilege":
    //   bitacora = await addPrivilege(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "deleteRol":
    //   bitacora = await deleteRolHard(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "removeProcess":
    //   bitacora = await removeProcess(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "removePrivilege":
    //   bitacora = await removePrivilege(body, ProcessType, DBServer, LoggedUser);
    //   break;
    // case "updateOne":
    //   bitacora = await UpdateRol(body, ProcessType, DBServer, LoggedUser);
    //   break;
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


async function getRolAll(processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener todos los Roles`;

  let dataPaso = DATA();
  dataPaso.process = "Consulta a Cosmos DB para obtener roles";
  dataPaso.method = "GET";
  dataPaso.api = `ccrud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
 dataPaso.dataReq = { processType, dbServer, loggedUser };

  try {
    // Consulta tipo SQL
    const querySpec = {
      query: "SELECT * FROM c",
    };

    const { resources: roles } = await contaRoles.items
      .query(querySpec)
      .fetchAll();

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


async function postRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Crear un nuevo Rol`;

  let dataPaso = DATA();
  dataPaso.process = "Guardado de nuevo rol en Cosmos DB";
  dataPaso.method = "POST";
  dataPaso.api = `ccrud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  try {
    // Cosmos requiere que cada item tenga un "id"
    if (!data.id) {
      data.id = data.ROLEID; // o usa tu propia lógica si ya manejas IDs
    }

    const { resource: savedRol } = await contaRoles.items.create(data);

    dataPaso.dataRes = savedRol;
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

module.exports = {
  crudRolC
};