
using {process as entity} from '../models/us-process';


@impl: 'srv/api/controller/us-process-controller.js'


service crudprocess @(path: '/api/process/') {

  @cds.autoexpose
  entity ZTPROCESSES as projection on entity.ZTPROCESSES;


  @Core.Description: 'CRUD dispatcher for processes' 
  @path            : 'crud' 
  action crud(processId: String, data: processInput) returns array of ZTPROCESSES;
  type processInput {
    PROCESSID      : String;
    DESCRIPCION    : String;
  }
}
