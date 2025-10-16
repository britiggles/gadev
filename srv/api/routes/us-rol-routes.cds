//srv\api\routes\us-rol-routes.cds

using {rol as entity} from '../models/us-roles';

@impl: 'srv/api/controller/us-rol-controller.js'
service RolPost @(path: '/api/roles/') {
    @cds.autoexpose
    entity ZTROL as projection on entity.ZTROL;


    //APIGENERAL
    @Core.Description: 'RolCrud'
    @path            : 'rolcrud'
    action rolcrud(rol: RolInput) returns array of ZTROL


//LA API DE CREAR ROL
@Core.Description: 'create-application'
@path            : 'create'
action create(rol: ZTROL)                                                      returns ZTROL;

//LA API DE AÑADIR PROCESSOS
@Core.Description: 'add-process-rol'
@path            : 'addProcess'
action addProcess(ROLEID: String,
                  PROCESSID: String,
                  NAMEAPP: String,
                  PRIVILEGE: array of {
    PRIVILEGEID : String
})                                                                             returns ZTROL;

//LA API DE AÑADIR PRIVILEGIOS
@Core.Description: 'add-privileges-process-rol'
@path            : 'addPrivilege'
action addPrivilege(ROLEID: String, PROCESSID: String, PRIVILEGEID: String)    returns ZTROL;

//LA API PARA BORRAR FISICAMENTE ROLES
@Core.Description: 'delete-hard-rol'
@path            : 'DeleteHard'
action DeleteHard(ROLEID: String)                                              returns ZTROL;

//LA API PARA BORRAR UN PROCESO DE UN ROL
@Core.Description: 'remove-process-from-rol'
@path            : 'RemoveProcess'
action RemoveProcess(ROLEID: String, PROCESSID: String)                        returns ZTROL;

// LA API PARA BORRAR UN PRIVILEGIO DE UN PROCESO
@Core.Description: 'remove-privilege-from-process'
@path            : 'RemovePrivilege'
action RemovePrivilege(ROLEID: String, PROCESSID: String, PRIVILEGEID: String) returns ZTROL;
}


type Privilege {
    PRIVILEGEID : String;
}
type Process {
    NAMEAPP : String;
    PROCESSID: String;
    PRIVILEGE: array of Privilege;
}

// Paso 2: Define el tipo para la estructura principal del rol.
type RolInput {
    ROLEID      : String;
    ROLENAME   : String;
    DESCRIPTION     : String;
    ACTIVED   : Boolean;
    DELETED: Boolean;
    PROCESS: array of Process;
}

