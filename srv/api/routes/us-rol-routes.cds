// Archivo: srv/api/routes/us-rol-routes.cds
// Descripción: Define el servicio CDS `curdrol` para exponer operaciones CRUD
//              sobre roles de usuario a través de una API REST.

// Importa la entidad 'rol' desde el modelo de datos 'us-roles.cds'.
// La renombra localmente como 'entity' para simplificar referencias internas.
using {rol as entity} from '../models/us-roles';

// Asocia este servicio CDS con su implementación lógica en un archivo controlador JavaScript.
// El archivo 'prueba-rol-controller.js' contiene la lógica que maneja las operaciones CRUD reales.
@impl: 'srv/api/controller/us-rol-controller.js'

// Declara el servicio CDS llamado 'curdrol' y define su punto de acceso base.
// Esto significa que las operaciones del servicio estarán disponibles bajo la ruta '/api/roles/'.
service crudrol @(path: '/api/roles/') {

  // Expone la entidad ZTROL como proyección directa de la entidad de datos original 'entity.ZTROL'.
  // La proyección permite controlar qué campos y operaciones son visibles externamente.
  // La anotación @cds.autoexpose hace que CAP genere automáticamente endpoints REST para CRUD básicos.
  @cds.autoexpose
  entity ZTROL as projection on entity.ZTROL;

  // Define una acción personalizada denominada 'crud', disponible en la ruta '/api/roles/crud'.
  // Esta acción sirve como un despachador dinámico para ejecutar diferentes procesos sobre roles.
  @Core.Description: 'CRUD dispatcher for roles' // Agrega una descripción para metadatos de servicio.
  @path            : 'crud' // Define la subruta específica para esta acción.
  action crud(rol: RolInput) returns array of ZTROL;

  

  type Privilege {
    PRIVILEGEID : String;
  }

  type Process {
    NAMEAPP   : String;
    PROCESSID : String;
    PRIVILEGE : array of Privilege;
  }

  // Paso 2: Define el tipo para la estructura principal del rol.
  type RolInput {
    ROLEID      : String;
    ROLENAME    : String;
    DESCRIPTION : String;
    ACTIVED     : Boolean;
    DELETED     : Boolean;
    PROCESS     : array of Process;

  }
}
