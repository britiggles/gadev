// Archivo: srv/api/routes/us-rol-routes.cds
// Descripción: Define el servicio CDS `curdrol` para exponer operaciones CRUD
//              sobre roles de usuario a través de una API REST.

// Importa la entidad 'rol' desde el modelo de datos 'us-roles.cds'.
// La renombra localmente como 'entity' para simplificar referencias internas.
using { rol as entity } from '../models/us-roles';

// Asocia este servicio CDS con su implementación lógica en un archivo controlador JavaScript.
// El archivo 'prueba-rol-controller.js' contiene la lógica que maneja las operaciones CRUD reales.
@impl: 'srv/api/controller/us-rol-controller.js'

// Declara el servicio CDS llamado 'curdrol' y define su punto de acceso base.
// Esto significa que las operaciones del servicio estarán disponibles bajo la ruta '/api/roles/'.
service curdrol @(path: '/api/roles/') {

  // Expone la entidad ZTROL como proyección directa de la entidad de datos original 'entity.ZTROL'.
  // La proyección permite controlar qué campos y operaciones son visibles externamente.
  // La anotación @cds.autoexpose hace que CAP genere automáticamente endpoints REST para CRUD básicos.
  @cds.autoexpose
  entity ZTROL as projection on entity.ZTROL;

  // Define una acción personalizada denominada 'crud', disponible en la ruta '/api/roles/crud'.
  // Esta acción sirve como un despachador dinámico para ejecutar diferentes procesos sobre roles.
  @Core.Description: 'CRUD dispatcher for roles' // Agrega una descripción para metadatos de servicio.
  @path: 'crud' // Define la subruta específica para esta acción.
  action crud(
    // Parámetro 'ProcessType': indica qué tipo de proceso se desea ejecutar (por ej., 'CREATE', 'UPDATE', 'DELETE').
    ProcessType: String,

    ROLEID: String,
    // Parámetro 'PROCESSID': representa el identificador del proceso asociado al rol.
    PROCESSID: String,
    // Parámetro 'PRIVILEGEID': define el privilegio vinculado al rol dentro del sistema.
    PRIVILEGEID: String,
    // Parámetro 'NAMEAPP': nombre de la aplicación o módulo que ejecuta la operación.
    NAMEAPP: String,
    // Parámetro 'data': estructura flexible tipo mapa para enviar información adicional en formato clave-valor.
    data: Map
  )
  // Indica que la acción devuelve una instancia de la entidad ZTROL,
  // lo que permite enviar los datos actualizados o creados de vuelta al cliente.
  returns ZTROL;
}
