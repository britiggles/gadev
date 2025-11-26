const mongoose = require("mongoose");
const { getDatabase } = require("../../config/connectToCosmosDB.js");
const Usuario = require("../models/mongodb/Usuario.js");
const {
    BITACORA,
    DATA,
    AddMSG,
    OK,
    FAIL,
} = require("../../middlewares/respPWA.handler.js");

function sanitizeUserId(value) {
    if (!value) {
        return "";
    }
    var normalized = value.toString().trim().toUpperCase();
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var letters = "";
    var digits = "";
    for (var i = 0; i < normalized.length; i++) {
        var ch = normalized.charAt(i);
        if (letters.length < 3 && /[A-Z]/.test(ch)) {
            letters += ch;
        } else if (letters.length >= 3 && digits.length < 7 && /[0-9]/.test(ch)) {
            digits += ch;
        }
        if (letters.length === 3 && digits.length === 7) {
            break;
        }
    }
    return letters + digits;
}

function normalizeBirthdate(value) {
    if (!value) {
        return "";
    }
    if (typeof value === "string" && value.length >= 10) {
        var slice = value.slice(0, 10);
        var dateFromSlice = new Date(slice);
        if (!isNaN(dateFromSlice.getTime())) {
            return dateFromSlice.toISOString().slice(0, 10);
        }
    }
    var date = new Date(value);
    if (isNaN(date.getTime())) {
        return "";
    }
    return date.toISOString().slice(0, 10);
}

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

async function getUsuariosAll(processType, dbServer, loggedUser) {
    const bitacora = BITACORA();
    bitacora.loggedUser = loggedUser;
    bitacora.process = `${processType} - Obtener todos los Usuarios`;
    let dataPaso = DATA();
    dataPaso.process = `Consulta a ${dbServer} para obtener usuarios`;
    dataPaso.method = "GET";
    dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
    dataPaso.dataReq = { processType, dbServer, loggedUser };
    try {
        let usuarios;
        if (dbServer === "MongoDB") {
            usuarios = await Usuario.find().lean();
        } else {
            // Consulta tipo SQL (Cosmos)
            const querySpec = {
                query: "SELECT * FROM c",
            };
            const conta = getDatabase().container("ZTUSERS");
            const { resources } = await conta.items.query(querySpec).fetchAll();
            usuarios = resources;
        }
        dataPaso.dataRes = usuarios;
        dataPaso.messageUSR = "Usuarios obtenidos exitosamente.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        bitacora.processType = processType;
        bitacora.dbServer = dbServer;

        AddMSG(bitacora, dataPaso, "OK", 200);
        return OK(bitacora);
    } catch (error) {
        dataPaso.messageDEV = error.message;
        dataPaso.messageUSR = "No se pudieron obtener los usuarios. Intente más tarde.";

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

async function getUsuarioById(data, processType, dbServer, loggedUser) {
    const bitacora = BITACORA();
    bitacora.loggedUser = loggedUser;
    bitacora.process = `${processType} - Obtener un Usuario por su ID`;
    let dataPaso = DATA();
    dataPaso.process = "Consulta a MongoDB para obtener un usuario específico";

    try {
        const { USERID } = data;
        dataPaso.dataReq = { data, processType, dbServer, loggedUser };
        dataPaso.method = "GET";
        dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
        const usuario = await Usuario.findOne({ USERID }).lean();

        if (!usuario) {
            dataPaso.messageDEV = `No se encontró un usuario con el USERID: ${USERID}`;
            dataPaso.messageUSR = "El usuario que buscas no existe.";

            dataPaso.processType = processType;
            dataPaso.dbServer = dbServer;
            dataPaso.loggedUser = loggedUser;

            AddMSG(bitacora, dataPaso, "FAIL", 404);
            return FAIL(bitacora);
        }
        dataPaso.dataRes = usuario;
        dataPaso.messageUSR = "Usuario obtenido exitosamente.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        bitacora.processType = processType;
        bitacora.dbServer = dbServer;

        AddMSG(bitacora, dataPaso, "OK", 200);
        return OK(bitacora);
    } catch (error) {
        dataPaso.messageDEV = error.message;
        dataPaso.messageUSR = "Ocurrió un error al buscar el usuario.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        AddMSG(bitacora, dataPaso, "FAIL", 500);
        return FAIL(bitacora);
    }
}

async function postUsuario(data, processType, dbServer, loggedUser) {
    const bitacora = BITACORA();
    bitacora.loggedUser = loggedUser;
    bitacora.process = `${processType} - Crear un nuevo Usuario`;
    let dataPaso = DATA();
    dataPaso.process = `Guardado de nuevo usuario en ${dbServer}`;
    dataPaso.method = "POST";
    dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
    dataPaso.dataReq = { processType, dbServer, loggedUser, data };
    try {
        const payload = { ...data };
        const normalizedBirthdate = normalizeBirthdate(payload.BIRTHDATE);
        if (normalizedBirthdate) {
            payload.BIRTHDATE = normalizedBirthdate;
        } else {
            delete payload.BIRTHDATE;
        }
        let usuarioRes;
        if (dbServer === "MongoDB") {
            const newUsuario = new Usuario(payload);
            usuarioRes = await newUsuario.save();
            usuarioRes = usuarioRes.toObject();
        } else {
            // Cosmos requiere que cada item tenga un "id"
            if (!payload.id) {
                payload.id = payload.USERID;
            }
            const conta = getDatabase().container("ZTUSERS");
            const { resources } = await conta.items.create(payload);
            usuarioRes = resources;
        }
        dataPaso.dataRes = usuarioRes;
        dataPaso.messageUSR = "Usuario creado exitosamente.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        bitacora.processType = processType;
        bitacora.dbServer = dbServer;

        AddMSG(bitacora, dataPaso, "OK", 201);
        return OK(bitacora, 201);
    } catch (error) {
        dataPaso.messageDEV = error.message;
        dataPaso.messageUSR = "No se pudo crear el usuario. Verifique que los datos sean correctos.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        AddMSG(bitacora, dataPaso, "FAIL", 400);
        return FAIL(bitacora);
    }
}

async function UpdateUsuario(data, processType, dbServer, loggedUser) {
    const bitacora = BITACORA();
    bitacora.loggedUser = loggedUser;
    bitacora.process = `${processType} - Actualizar un Usuario`;
    let dataPaso = DATA();
    dataPaso.process = `Actualizacion de un usuario en ${dbServer}`; // Mensaje dinámico
    dataPaso.method = "PUT";
    dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
    dataPaso.dataReq = { processType, dbServer, loggedUser, data };

    try {
        const rawNewUserId = data.USERID ? data.USERID.toString().trim() : "";
        const rawOriginalUserId = data.ORIGINAL_USERID ? data.ORIGINAL_USERID.toString().trim() : "";
        const sanitizedNewUserId = sanitizeUserId(rawNewUserId);
        const sanitizedOriginalUserId = sanitizeUserId(rawOriginalUserId);
        const lookupUserId = rawOriginalUserId || rawNewUserId || sanitizedOriginalUserId || sanitizedNewUserId;
        const targetUserId = sanitizedNewUserId || sanitizedOriginalUserId || lookupUserId;
        const reUserId = /^[A-Z]{3}\d{7}$/;

        if (!targetUserId || !reUserId.test(targetUserId)) {
            dataPaso.messageDEV = "El nuevo USERID no cumple con el formato requerido LLLNNNNNNN.";
            dataPaso.messageUSR = "El ID debe tener 3 letras seguidas de 7 números.";
            AddMSG(bitacora, dataPaso, "FAIL", 400);
            return FAIL(bitacora);
        }

        // 1. Validar que exista algún identificador para localizar el registro
        if (!lookupUserId) {
            dataPaso.messageDEV = "Se requiere 'USERID' u 'ORIGINAL_USERID' para actualizar.";
            dataPaso.messageUSR = "No se proporcionó el identificador del usuario.";
            AddMSG(bitacora, dataPaso, "FAIL", 400);
            return FAIL(bitacora);
        }

        const updatePayload = { ...data, USERID: targetUserId };
        const normalizedBirthdate = normalizeBirthdate(updatePayload.BIRTHDATE);
        if (normalizedBirthdate) {
            updatePayload.BIRTHDATE = normalizedBirthdate;
        } else {
            delete updatePayload.BIRTHDATE;
        }
        delete updatePayload.ORIGINAL_USERID;
        delete updatePayload._id;

        // 1.1 Verificar duplicados si se intenta cambiar el USERID
        const shouldCheckDuplicate =
            targetUserId && targetUserId !== sanitizedOriginalUserId;
        if (shouldCheckDuplicate) {
            if (dbServer === "MongoDB") {
                const duplicated = await Usuario.findOne({ USERID: targetUserId }).lean();
                if (duplicated) {
                    dataPaso.messageDEV = `Ya existe un usuario con USERID: ${targetUserId}`;
                    dataPaso.messageUSR = "El nuevo ID seleccionado ya está en uso.";
                    AddMSG(bitacora, dataPaso, "FAIL", 409);
                    return FAIL(bitacora);
                }
            } else {
                const conta = getDatabase().container("ZTUSERS");
                const duplicateQuery = {
                    query: "SELECT * FROM c WHERE c.USERID = @userId",
                    parameters: [
                        {
                            name: "@userId",
                            value: targetUserId,
                        },
                    ],
                };
                const { resources: duplicates } = await conta.items.query(duplicateQuery).fetchAll();
                const hasDifferentRecord = duplicates.some((item) => {
                    if (!item) {
                        return false;
                    }
                    if (rawOriginalUserId && item.USERID === rawOriginalUserId) {
                        return false;
                    }
                    if (sanitizedOriginalUserId && item.USERID === sanitizedOriginalUserId) {
                        return false;
                    }
                    return true;
                });
                if (hasDifferentRecord) {
                    dataPaso.messageDEV = `Ya existe un usuario con USERID: ${targetUserId}`;
                    dataPaso.messageUSR = "El nuevo ID seleccionado ya está en uso.";
                    AddMSG(bitacora, dataPaso, "FAIL", 409);
                    return FAIL(bitacora);
                }
            }
        }

        let updatedUsuario; // Variable para almacenar el resultado

        // 2. Lógica separada por tipo de base de datos
        if (dbServer === "MongoDB") {
            // --- LÓGICA PARA MONGODB ---
            const lookupCandidates = [];
            if (lookupUserId) {
                lookupCandidates.push(lookupUserId);
            }
            if (sanitizedOriginalUserId && !lookupCandidates.includes(sanitizedOriginalUserId)) {
                lookupCandidates.push(sanitizedOriginalUserId);
            }
            if (targetUserId && !lookupCandidates.includes(targetUserId)) {
                lookupCandidates.push(targetUserId);
            }

            for (const candidate of lookupCandidates) {
                updatedUsuario = await Usuario.findOneAndUpdate(
                    { USERID: candidate },
                    updatePayload,
                    {
                        new: true,
                    }
                );
                if (updatedUsuario) {
                    break;
                }
            }
            if (updatedUsuario) {
                updatedUsuario = updatedUsuario.toObject(); // Convertir a objeto plano
            }
        } else {

            const conta = getDatabase().container("ZTUSERS");

            const lookupCandidates = [];
            if (lookupUserId) {
                lookupCandidates.push(lookupUserId);
            }
            if (sanitizedOriginalUserId && !lookupCandidates.includes(sanitizedOriginalUserId)) {
                lookupCandidates.push(sanitizedOriginalUserId);
            }
            if (targetUserId && !lookupCandidates.includes(targetUserId)) {
                lookupCandidates.push(targetUserId);
            }

            let usuarioToUpdate = null;

            for (const candidate of lookupCandidates) {
                const querySpec = {
                    query: "SELECT * FROM c WHERE c.USERID = @userId",
                    parameters: [
                        {
                            name: "@userId",
                            value: candidate,
                        },
                    ],
                };

                const queryResult = await conta.items.query(querySpec).fetchAll();
                if (queryResult.resources && queryResult.resources.length > 0) {
                    usuarioToUpdate = queryResult.resources[0];
                    break;
                }
            }

            if (!usuarioToUpdate) {
                updatedUsuario = null;
            } else {
                const updatedData = { ...usuarioToUpdate, ...updatePayload };

                // Reemplazamos/creamos el item con los datos actualizados
                const { resource: replacedItem } = await conta.items
                    .create(updatedData);
                // Asignamos el objeto resultante a updatedUsuario para
                // que la lógica posterior lo trate como éxito
                updatedUsuario = replacedItem;
            }
        }

        // 3. Manejar el caso si no se encuentra el usuario para actualizar
        if (!updatedUsuario) {
            dataPaso.messageDEV = `No se encontró un usuario con identificadores proporcionados.`;
            dataPaso.messageUSR = "El usuario que intenta actualizar no existe.";
            // ... (código de error)
            AddMSG(bitacora, dataPaso, "FAIL", 404);
            return FAIL(bitacora);
        }

        // 4. Éxito: El usuario fue actualizado
        dataPaso.dataRes = updatedUsuario;
        dataPaso.messageUSR = "Usuario actualizado exitosamente.";

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
        dataPaso.messageUSR = "No se pudo actualizar el usuario. Verifique que los datos sean correctos.";

        // ... (código de error)
        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        AddMSG(bitacora, dataPaso, "FAIL", 400);
        return FAIL(bitacora);
    }
}

async function deleteUsuarioHard(data, processType, dbServer, loggedUser) {
    const bitacora = BITACORA();
    bitacora.loggedUser = loggedUser;
    bitacora.process = `${processType} - Eliminación física de un Usuario`;
    let dataPaso = DATA();
    const { USERID } = data;

    dataPaso.process = `Búsqueda y eliminación de usuario en ${dbServer}`;
    dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
    dataPaso.dataReq = { processType, dbServer, loggedUser, data };

    // 1. Validar que el USERID venga en la data (común para ambas DB)
    if (!USERID) {
        dataPaso.messageDEV = "El campo 'USERID' es requerido para eliminar.";
        dataPaso.messageUSR = "No se proporcionó el identificador del usuario.";
        AddMSG(bitacora, dataPaso, "FAIL", 400);
        return FAIL(bitacora);
    }

    try {
        let deletedUsuario; // Variable para almacenar el resultado

        // 2. Lógica separada por tipo de base de datos
        if (dbServer === "MongoDB") {
            // --- LÓGICA PARA MONGODB ---
            const mongoResult = await Usuario.findOneAndDelete({ USERID });
            if (mongoResult) {
                deletedUsuario = mongoResult.toObject();
            }
        } else {
            // --- LÓGICA PARA AZURE COSMOS DB ---
            const conta = getDatabase().container("ZTUSERS");

            // a. Crear la consulta para buscar el documento por USERID
            const querySpec = {
                query: "SELECT * FROM c WHERE c.USERID = @userId",
                parameters: [{ name: "@userId", value: USERID }],
            };

            // b. Ejecutar la consulta para encontrar el documento
            const { resources: items } = await conta.items
                .query(querySpec)
                .fetchAll();

            if (items.length > 0) {
                const usuarioToDelete = items[0]; // El documento a eliminar

                // c. Eliminar el documento usando su 'id' y su partition key ('USERID')
                await conta.item(usuarioToDelete.id, usuarioToDelete.USERID).delete();
        
                // Guardamos el objeto que acabamos de eliminar para devolverlo en la respuesta
                deletedUsuario = usuarioToDelete; 
            }
        }

        // 3. Manejar el caso si no se encontró el usuario para eliminar
        if (!deletedUsuario) {
            dataPaso.messageDEV = `No se encontró un usuario con USERID: ${USERID}`;
            dataPaso.messageUSR = "El usuario que intenta eliminar no existe.";
            AddMSG(bitacora, dataPaso, "FAIL", 404);
            return FAIL(bitacora);
        }

        // 4. Éxito: El usuario fue eliminado
        dataPaso.dataRes = deletedUsuario;
        dataPaso.messageUSR = "Usuario eliminado exitosamente.";

        bitacora.processType = processType;
        bitacora.dbServer = dbServer;
        AddMSG(bitacora, dataPaso, "OK", 200);
        return OK(bitacora);
    
    } catch (error) {
        dataPaso.messageDEV = error.message;
        dataPaso.messageUSR = "Ocurrió un error al intentar eliminar el usuario.";
        AddMSG(bitacora, dataPaso, "FAIL", 500);
        return FAIL(bitacora);
    }
}

async function removeUsuarioField(data, processType, dbServer, loggedUser) {
    const bitacora = BITACORA();
    bitacora.loggedUser = loggedUser;
    bitacora.process = `${processType} - Eliminar campo específico de un Usuario`;
    let dataPaso = DATA();
    const { USERID } = data;
    const { FIELD } = data.FIELD ? data.FIELD[0] : {};
    dataPaso.process = "Eliminar campo de usuario en MongoDB";
    dataPaso.dataReq = { USERID, FIELD };

    try {
        const usuario = await Usuario.findOne({ USERID });
        if (!usuario) {
            dataPaso.messageDEV = `El usuario con ID '${USERID}' no fue encontrado.`;
            dataPaso.messageUSR = "Usuario no encontrado.";

            dataPaso.processType = processType;
            dataPaso.dbServer = dbServer;
            dataPaso.loggedUser = loggedUser;

            AddMSG(bitacora, dataPaso, "FAIL", 404);
            return FAIL(bitacora);
        }
        // Using $unset to remove the field
        const updatedUsuario = await Usuario.findOneAndUpdate(
            { USERID },
            { $unset: { [FIELD]: "" } },
            { new: true }
        );
        dataPaso.dataRes = updatedUsuario ? updatedUsuario.toObject() : null;
        dataPaso.messageUSR = "Campo eliminado exitosamente.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        bitacora.processType = processType;
        bitacora.dbServer = dbServer;

        AddMSG(bitacora, dataPaso, "OK", 200);
        return OK(bitacora);
    } catch (error) {
        dataPaso.messageDEV = error.message;
        dataPaso.messageUSR = "Ocurrió un error al eliminar el campo.";

        dataPaso.processType = processType;
        dataPaso.dbServer = dbServer;
        dataPaso.loggedUser = loggedUser;

        AddMSG(bitacora, dataPaso, "FAIL", 500);
        return FAIL(bitacora);
    }
}

// Dispatcher centralizado
async function crudUsuario(req) {
    let bitacora = BITACORA();
    let data = DATA();

    let { ProcessType, LoggedUser, DBServer } = req.req.query;
    const body = req.req.body.usuario;
    console.log(body);

    bitacora.loggedUser = LoggedUser;
    bitacora.processType = ProcessType;
    bitacora.dbServer = DBServer;

    await connectDB(DBServer);

    switch (ProcessType) {
        case "getAll":
            bitacora = await getUsuariosAll(ProcessType, DBServer, LoggedUser);
            break;
        case "getById":
            bitacora = await getUsuarioById(body, ProcessType, DBServer, LoggedUser);
            break;
        case "postUsuario":
            bitacora = await postUsuario(body, ProcessType, DBServer, LoggedUser);
            break;
        case "addField":
            bitacora = await removeUsuarioField(body, ProcessType, DBServer, LoggedUser);
            break;
        case "deleteUsuario":
            bitacora = await deleteUsuarioHard(body, ProcessType, DBServer, LoggedUser);
            break;
        case "updateOne":
            bitacora = await UpdateUsuario(body, ProcessType, DBServer, LoggedUser);
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
    crudUsuario,
    connectDB,
};