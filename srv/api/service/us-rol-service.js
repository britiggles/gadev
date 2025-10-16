const Rol = require("../models/mongodb/Rol.js");
const {
  BITACORA,
  DATA,
  AddMSG,
  OK,
  FAIL,
} = require("../../middlewares/respPWA.handler.js");

// GET

//--------- 1. GET Mostrar todos los roles ---------------
async function getRolAll() {
  const bitacora = BITACORA();
  bitacora.process = "Obtener todos los Roles";

  let dataPaso = DATA();
  dataPaso.process = "Consulta a MongoDB para obtener roles";

  try {
    const roles = await Rol.find().lean();

    dataPaso.dataRes = roles;
    dataPaso.messageUSR = "Roles obtenidos exitosamente.";
    AddMSG(bitacora, dataPaso, "OK", 200);

    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudieron obtener los roles. Intente más tarde.";
    AddMSG(bitacora, dataPaso, "FAIL", 500);

    return FAIL(bitacora);
  }
}

//--------- 2. GET Mostrar un rol por roleid ---------------
async function getRolById(req) {
  const bitacora = BITACORA();
  bitacora.process = "Obtener un Rol por su ID";

  let dataPaso = DATA();
  dataPaso.process = "Consulta a MongoDB para obtener un rol específico";

  try {
    const { ROLEID } = req;
    dataPaso.dataReq = { ROLEID };

    const rol = await Rol.findOne({ ROLEID: ROLEID }).lean();

    if (!rol) {
      dataPaso.messageDEV = `No se encontró un rol con el ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que buscas no existe.";
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    dataPaso.dataRes = rol;
    dataPaso.messageUSR = "Rol obtenido exitosamente.";
    AddMSG(bitacora, dataPaso, "OK", 200);

    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al buscar el rol.";
    AddMSG(bitacora, dataPaso, "FAIL", 500);

    return FAIL(bitacora);
  }
}

//--------- 3. GET Procesos asociados a un rol ---------------
async function getProcessByRol(ROLEID) {
  const bitacora = BITACORA();
  bitacora.process = "Obtener procesos asociados a un Rol";

  let dataPaso = DATA();
  dataPaso.process = "Consulta a MongoDB para obtener los procesos de un rol";
  dataPaso.dataReq = { ROLEID };

  try {
    const rol = await Rol.findOne({ ROLEID }, { PROCESS: 1 }).lean();

    if (!rol || !rol.PROCESS) {
      dataPaso.messageDEV = `No se encontraron procesos asociados al ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Este rol no tiene procesos asociados.";
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    dataPaso.dataRes = rol.PROCESS;
    dataPaso.messageUSR = "Procesos obtenidos exitosamente.";
    AddMSG(bitacora, dataPaso, "OK", 200);

    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al obtener los procesos.";
    AddMSG(bitacora, dataPaso, "FAIL", 500);

    return FAIL(bitacora);
  }
}


//--------- 4. GET Privilegios asociados a un rol y proceso específico ---------------
async function getPrivilegesByRol(ROLEID, PROCESSID) {
  const bitacora = BITACORA();
  bitacora.process = "Obtener privilegios asociados a un Rol y Proceso";

  let dataPaso = DATA();
  dataPaso.process = "Consulta a MongoDB para obtener privilegios de un proceso específico";
  dataPaso.dataReq = { ROLEID, PROCESSID };

  try {
    const rol = await Rol.findOne({ ROLEID }, { PROCESS: 1 }).lean();

    if (!rol || !rol.PROCESS) {
      dataPaso.messageDEV = `No se encontraron procesos para el ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol no tiene procesos asociados.";
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    const proceso = rol.PROCESS.find(p => p.PROCESSID === PROCESSID);

    if (!proceso || !proceso.PRIVILEGE) {
      dataPaso.messageDEV = `No se encontró el proceso con ID: ${PROCESSID}`;
      dataPaso.messageUSR = "El proceso no tiene privilegios registrados.";
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    dataPaso.dataRes = proceso.PRIVILEGE;
    dataPaso.messageUSR = "Privilegios obtenidos exitosamente.";
    AddMSG(bitacora, dataPaso, "OK", 200);

    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al obtener los privilegios.";
    AddMSG(bitacora, dataPaso, "FAIL", 500);

    return FAIL(bitacora);
  }
}

async function postRol(data) {
  const bitacora = BITACORA();
  bitacora.process = "Crear un nuevo Rol";
  let dataPaso = DATA();
  dataPaso.process = "Guardado de nuevo rol en MongoDB";
  dataPaso.dataReq = data;
  try {
    const newRol = new Rol(data);
    const savedRol = await newRol.save();
    dataPaso.dataRes = savedRol.toObject();
    dataPaso.messageUSR = "Rol creado exitosamente.";
    AddMSG(bitacora, dataPaso, "OK", 201);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudo crear el rol. Por favor, verifique que los datos sean correctos.";
    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }
}

async function addProcessRol(roleId, processDataR) {
  try {
    // 1. Buscar la aplicación por su APPID
    console.log(roleId, processDataR);
    const rol = await Rol.findOne({ ROLEID: roleId });
    const processData = processDataR.PROCESS;
    // 2. Si no se encuentra, lanzar un error claro
    if (!rol) {
      const error = new Error("rol no encontrada");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3.  Verificar si la vista ya existe
    const processExist = rol.PROCESS.some(
      (process) => process.PROCESSID === processData[0].PROCESSID
    );
    if (processExist) {
      const error = new Error(
        `El processos con el ID '${processData[0].PROCESSID}' ya existe en este rol.`
      );
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 4. Crear el nuevo objeto de vista
    const newProcess = {
      NAMEAPP: processData[0].NAMEAPP,
      PROCESSID: processData[0].PROCESSID,
      PRIVILEGEID: processData[0].PRIVILEGEID || [], // Usa el array de procesos si viene, si no, uno vacío
    };

    // 5. Añadir la nueva vista al array 'VIEWS'
    rol.PROCESS.push(newProcess);

    // 6. Guardar los cambios en la base de datos
    const updatedRol = await rol.save();

    // 7. Devolver el documento actualizado
    return updatedRol.toObject();
  } catch (error) {
    console.error("Error en el servicio addProcessRol:", error);
    // Re-lanzar el error para que el controlador lo maneje
    throw error;
  }
}

async function addPrivilege(rolId, processId, privilegeId) {
  try {
    // 1. Encuentra el rol.
    const rol = await Rol.findOne({ ROLEID: rolId });

    // 2. Si no se encuentra, lanzar un error claro
    if (!rol) {
      const error = new Error("rol no encontrada");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 2. Encuentra el process indicado
    const targetProcess = rol.PROCESS.find(
      (process) => process.PROCESSID === processId
    );

    if (!targetProcess) {
      const error = new Error("Proceso no encontrada en este rol");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3. (Recomendado) Verifica si el privilegio ya existe en esa proceso.
    const privilegeExist = targetProcess.PRIVILEGE.some(
      (proc) => proc.PRIVILEGEID === privilegeId
    );
    if (privilegeExist) {
      const error = new Error(
        `El privilegio con ID '${PRIVILEGEID}' ya existe en esta proceso.`
      );
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 4. Añade el nuevo proceso al array 'PROCESS' de la vista encontrada.
    targetProcess.PRIVILEGE.push({ PRIVILEGEID: privilegeId });

    // 5. Guarda el documento principal modificado.
    const updatedRol = await rol.save();

    return updatedRol.toObject();
  } catch (error) {
    console.error("Error en el servicio addPrivilege:", error);
    throw error;
  }
}

//DELETE HARD ROL por ID
async function DeleteHard(rolId) {

  const bitacora = BITACORA();
  bitacora.process = "Eliminación física (hard delete) de un Rol";


  let dataPaso = DATA();
  dataPaso.process = "Búsqueda y eliminación de rol en MongoDB";
  dataPaso.dataReq = { ROLEID: rolId }; 

  try {

    const deletedRol = await Rol.findOneAndDelete({ ROLEID: rolId });


    if (!deletedRol) {

      dataPaso.messageDEV = `No se encontró un rol con el ROLEID: ${rolId} para eliminar.`;
      dataPaso.messageUSR = "El rol que intentas eliminar no existe.";
      AddMSG(bitacora, dataPaso, "FAIL", 404); 
      return FAIL(bitacora);
    }


    dataPaso.dataRes = deletedRol.toObject(); 
    dataPaso.messageUSR = "Rol eliminado exitosamente.";
    AddMSG(bitacora, dataPaso, "OK", 200); 

 
    return OK(bitacora);
  } catch (error) {

    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al intentar eliminar el rol.";
    AddMSG(bitacora, dataPaso, "FAIL", 500); 

    return FAIL(bitacora);
  }
}

async function RemoveProcess(rolId, processId) {
  try {
    // --- Buscar el documento principal del rol ---
    const rol = await Rol.findOne({ ROLEID: rolId });

    // Valida que exista el rol
    if (!rol) {
      //error personalizado con un código de estado
      const error = new Error(`El rol con ID '${rolId}' no fue encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    // ------Verificar que el proceso exista DENTRO del rol ---
    const procesoExiste = rol.PROCESS.find((p) => p.PROCESSID === processId);

    // Valida que exista el proceso
    if (!procesoExiste) {
      const error = new Error(
        `El proceso con ID '${processId}' no existe en este rol.`
      );
      error.statusCode = 404;
      throw error;
    }
    //-------Borrar proceso anidado dentro de rol-------
    // Usamos findOneAndUpdate para encontrar el rol y modificarlo
    const updatedRol = await Rol.findOneAndUpdate(
      { ROLEID: rolId }, // 1. Condición: Encuentra el rol con este ID
      {
        $pull: {
          // 2. Operación: Extrae ($pull) un elemento del array...
          PROCESS: { PROCESSID: processId }, // ...del array 'processes' donde el 'PROCESSID' coincida.
        },
      },
      { new: true } // 3. Opción: Devuelve el documento DESPUÉS de la actualización.
    );

    return updatedRol ? updatedRol.toObject() : null;
  } catch (error) {
    console.error("Error al eliminar el subdocumento del rol:", error);
    throw error;
  }
}
async function RemovePrivilege(rolId, processId, privilegeId) {
  try {
    // --- Buscar el documento principal del rol ---
    const rol = await Rol.findOne({ ROLEID: rolId });

    // Valida que exista el rol
    if (!rol) {
      //error personalizado con un código de estado
      const error = new Error(`El rol con ID '${rolId}' no fue encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    // ------Verificar que el proceso exista DENTRO del rol ---
    const procesoExiste = rol.PROCESS.find((p) => p.PROCESSID === processId);

    // Valida que exista el proceso
    if (!procesoExiste) {
      const error = new Error(
        `El proceso con ID '${processId}' no existe en este rol.`
      );
      error.statusCode = 404;
      throw error;
    }

    //-------Borrar privilegio anidado en proceso anidado dentro de rol anidado-------
    const updatedRol = await Rol.findOneAndUpdate(
      { ROLEID: rolId }, // 1. Condición: Encuentra el rol principal
      {
        // 2. Operación: Extrae ($pull) del array anidado
        $pull: {
          "PROCESS.$[proc].PRIVILEGE": { PRIVILEGEID: privilegeId },
        },
      },
      {
        // 3. Buscamos el proceso específico dentro del array 'PROCESS'
        arrayFilters: [{ "proc.PROCESSID": processId }], // Define qué es [proc]
        new: true, // Devuelve el documento ya actualizado
      }
    );

    return updatedRol ? updatedRol.toObject() : null;
  } catch (error) {
    console.error("Error al eliminar el privilegio:", error);
    throw error;
  }
}

module.exports = {
  getRolAll,
  getRolById,
  getProcessByRol,
  getPrivilegesByRol,
  postRol,
  addProcessRol,
  addPrivilege,
  DeleteHard,
  RemoveProcess,
  RemovePrivilege,
};
