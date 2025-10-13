const cds = require('@sap/cds');
const { getUsuariosAll, getUsuarioById, createUsuario, updateUsuarioById, deleteUsuarioById} = require('../service/us-usuarios-service.js');

class UsuariosList extends cds.ApplicationService{
    async init (){
//--------- 2. GET Mostrar todos los usuarios ---------------
        this.on('getall', async (req)=> {
           return getUsuariosAll(req);
        });
//----------- 3. GET Mostrar usuario por Id --------------

        this.on('READ', 'ztusers', async (req) => {
            const keyObject  = req.params[0];

            if (keyObject ) {
                const userIdValue = keyObject.USERID;

                console.log(`Buscando usuario con ID: ${userIdValue}`);

                const usuario = await getUsuarioById(userIdValue);

                if (!usuario) {
                    return req.error(404, `Usuario con USERID '${userId}' no encontrado.`);
                }
                return usuario;

            } else {
                console.log('Obteniendo todos los usuarios');
                return getUsuariosAll(req);
            }
        });


//---------- 1. POST Crear un usuario ------------
        this.on('create', async (req) => {
            try {
                console.log("Payload recibido para crear:", req.data.usuario);
                
                const resultado = await createUsuario(req.data.usuario);
                
                return resultado;
            } catch (error) {
                req.error(500, `Error al crear el usuario: ${error.message}`);
            }
        });


//-------- 4. PUT Actualizar un usuarios por Id ---------
        this.on('UPDATE', 'ztusers', async (req) => {
            try {
                // El ID del usuario a actualizar viene en req.params, como en el GET
                const userIdValue = req.params[0].USERID;
                
                // Los datos para actualizar vienen en el cuerpo de la petición (req.data)
                const dataForUpdate = req.data;
                
                console.log(`Actualizando usuario con ID: ${userIdValue}`);
                
                const updatedUser = await updateUsuarioById(userIdValue, dataForUpdate);

                // Si el servicio no encontró al usuario, devolvemos un error 404
                if (!updatedUser) {
                    return req.error(404, `No se pudo actualizar. Usuario con USERID '${userIdValue}' no encontrado.`);
                }
                
                // Si todo sale bien, retornamos el usuario actualizado.
                return updatedUser;

            } catch (error) {
                req.error(500, `Error al actualizar el usuario: ${error.message}`);
            }
        });

//------------- 5. DELETE Eliminar un usuario por Id ------------
        this.on('DELETE', 'ztusers', async (req) => {
            try {
                // El ID del usuario a eliminar viene en req.params
                const userIdValue = req.params[0].USERID;
                
                console.log(`Eliminando usuario con ID: ${userIdValue}`);
                
                const deletedUser = await deleteUsuarioById(userIdValue);

                // Si el servicio no encontró al usuario, devolvemos un error 404
                if (!deletedUser) {
                    return req.error(404, `No se pudo eliminar. Usuario con USERID '${userIdValue}' no encontrado.`);
                }
                
                // Si todo sale bien, retornamos el usuario que fue eliminado.
                // CAP enviará automáticamente una respuesta HTTP 204 No Content, que es el estándar para un DELETE exitoso.
                console.log('Usuario eliminado exitosamente:', deletedUser);
                return deletedUser;

            } catch (error) {
                req.error(500, `Error al eliminar el usuario: ${error.message}`);
            }
        });


        return await super.init();
    };

};

module.exports = UsuariosList;