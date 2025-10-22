
using {rol as entity} from '../models/us-roles';


@impl: 'srv/api/controller/us-rol-controller.js'


service crudrol @(path: '/api/roles/') {

  @cds.autoexpose
  entity ZTROL as projection on entity.ZTROL;


  @Core.Description: 'CRUD dispatcher for roles' 
  @path            : 'crud' 
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
