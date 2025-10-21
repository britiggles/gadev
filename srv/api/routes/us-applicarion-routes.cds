//srv\api\routes\us-application-patch-routes.cds

using { application as entity } from '../models/us-application.cds';

@impl: 'srv\api\controller\us-application-controller.js'
service ApplicationCrud @(path:'/api/application/') {
  @cds.autoexpose
  entity ZTAPPLICATION as projection on entity.ZTAPPLICATION;

  @Core.Description: 'CRUD dispatcher'
  @path: 'crud'
  action crud( data: Map) returns ZTAPPLICATION;
}