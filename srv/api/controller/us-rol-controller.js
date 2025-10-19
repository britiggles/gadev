
const cds = require("@sap/cds");

// Importa la función 'crudRolPrueba' desde el archivo de servicios 'prueba-rol-service.js'.
// Esta función contiene la lógica centralizada para manejar operaciones GET sobre roles.
const {
  crudRol // Función para manejar la acción CRUD, aquí específicamente para recuperar datos (GET).
} = require("../service/us-rol-service.js"); // Ruta relativa al archivo con la lógica del servicio.


// Define una clase que extiende 'cds.ApplicationService' para manejar las operaciones del servicio 'RolGetController'.
class RolGetController extends cds.ApplicationService {
  // Método de inicialización que se ejecuta cuando se lanza el servicio.
  async init() {
    // Registra un manejador para la acción 'crud' recibida por este servicio.
    // Cada vez que se llama la acción 'crud', se ejecuta esta función que recibe la solicitud 'req'.
    this.on("crud", async (req) => {
      // Delegación de la lógica al servicio externo 'crudRolPrueba', pasando la solicitud original.
      // El resultado devuelto es lo que responderá el servicio al cliente.
      return crudRol(req);
    });


    // Llama a la inicialización de la clase base para completar la configuración del servicio.
    await super.init();
  }
}

// Exporta la clase 'RolGetController' para que sea usada por la aplicación CAP como controlador del servicio.
module.exports = RolGetController;
