const Rol = require("../models/mongodb/Rol.js");

async function postRol(data) {
  try {
    const newRol = new Rol(data);

    const saveRol = await newRol.save();

    return saveRol.toObject();
  } catch (error) {
    console.error("Error en el servicio postRol :", error);
    throw error;
  }
}




async function addProcessRol(roleId, processData) {
  try {
    // 1. Buscar la aplicación por su APPID
    console.log(roleId,processData)
    const rol = await Rol.findOne({ ROLEID: roleId });

    // 2. Si no se encuentra, lanzar un error claro
    if (!rol) {
      const error = new Error("rol no encontrada");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3.  Verificar si la vista ya existe
    const processExist = rol.PROCESS.some(
      (process) => process.PROCESSID === processData.PROCESSID
    );
    if (processExist) {
      const error = new Error(
        `El processos con el ID '${processData.PROCESSID}' ya existe en este rol.`
      );
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 4. Crear el nuevo objeto de vista
    const newProcess = {
      NAMEAPP: processData.NAMEAPP,
      PROCESSID: processData.PROCESSID,
      PRIVILEGEID: processData.PRIVILEGEID || [], // Usa el array de procesos si viene, si no, uno vacío
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
    const targetProcess = rol.PROCESS.find(process => process.PROCESSID === processId);

    if (!targetProcess) {
      const error = new Error("Proceso no encontrada en este rol");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3. (Recomendado) Verifica si el privilegio ya existe en esa proceso.
    const privilegeExist = targetProcess.PRIVILEGE.some(proc => proc.PRIVILEGEID === privilegeId);
    if (privilegeExist) {
        const error = new Error(`El privilegio con ID '${PRIVILEGEID}' ya existe en esta proceso.`);
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

module.exports = { postRol,addProcessRol,addPrivilege };
