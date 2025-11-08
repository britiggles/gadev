
using {views as entity} from '../models/us-views';


@impl: 'srv/api/controller/us-view-controller.js'


service crudview @(path: '/api/views/') {

  @cds.autoexpose
  entity ZTVIEWS as projection on entity.ZTVIEWS;


  @Core.Description: 'CRUD dispatcher for views' 
  @path            : 'crud' 
  action crud(viewId: String, data: ViewInput) returns array of ZTVIEWS;

    type ViewInput {
    VIEWSID      : String;
    DESCRIPCION    : String;
    }
}
