const Usuarios = require('../models/mongodb/Usuario.js');

async function getUsuariosAll(req) {
    try{
        let user;
        user = await Usuarios.find().lean();
        return(user);
    }catch(error){
        return error;
    } finally {

    }
}

async function getUsuarioById(userId) {
    try {
        const usuarioEncontrado = await Usuarios.findOne({ USERID: userId });

        if (usuarioEncontrado) {
            return usuarioEncontrado.toObject();
        }

        return null;

    } catch (error) {
        console.error("Error al buscar usuario por ID:", error);
        throw error;
    }
}


async function createUsuario(data) {
    try {
        const nuevoUsuario = new Usuarios(data);
        
        const usuarioGuardado = await nuevoUsuario.save();
        
        return usuarioGuardado.toObject();
    } catch (error) {
        console.error("Error al crear usuario:", error);
        throw error;
    }
}

//-------- PUT ---------
async function updateUsuarioById(userId, dataToUpdate) {
    try {
        const updatedUser = await Usuarios.findOneAndUpdate(
            { USERID: userId }, // El filtro para encontrar al usuario
            dataToUpdate,       // Los nuevos datos a aplicar
            { 
                new: true, // Esta opción asegura que nos devuelva el documento ya actualizado
                runValidators: true // Esto hace que se apliquen las validaciones del esquema
            }
        );

        if (updatedUser) {
            return updatedUser.toObject();
        }

        return null;

    } catch (error) {
        console.error("Error al actualizar usuario por ID:", error);
        throw error;
    }
}


//------------- DELETE ------------
async function deleteUsuarioById(userId) {
    try {
        // Usamos findOneAndDelete para buscar, eliminar y opcionalmente retornar el documento eliminado.
        const deletedUser = await Usuarios.findOneAndDelete({ USERID: userId });

        // Si se eliminó, lo convertimos a un objeto simple antes de retornarlo.
        // Esto es útil para confirmar qué se eliminó.
        if (deletedUser) {
            return deletedUser.toObject();
        }

        // Si no se encontró ningún usuario con ese ID, retornamos null
        return null;

    } catch (error) {
        console.error("Error al eliminar usuario por ID:", error);
        throw error;
    }
}



module.exports = { getUsuariosAll, getUsuarioById, createUsuario, updateUsuarioById, deleteUsuarioById};