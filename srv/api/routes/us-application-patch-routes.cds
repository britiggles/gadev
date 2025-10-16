//srv\api\routes\us-application-patch-routes.cds

using { application as entity } from '../models/us-application.cds';

@impl: 'srv\api\controller\us-application-patch-controller.js'
service ApplicationPatch @(path:'/api/application/patch/') {
    @cds.autoexpose
    entity ZTAPPLICATION as projection on entity.ZTAPPLICATION;
    // Actualiza una aplicación
    @Core.Description: 'update-application'
    @path: 'update'
    action update(appId: String, data: ZTAPPLICATION)
    returns ZTAPPLICATION;

    // Actualiza una vista dentro de una aplicación
    @Core.Description: 'update-view'
    @path: 'updateView'
    action updateView(appId: String, viewId: String, data: {
        VIEWSID: String
        PROCESS: array of { PROCESSID: String }
    })
    returns ZTAPPLICATION;

    // Actualiza un proceso dentro de una vista
    @Core.Description: 'update-process'
    @path: 'updateProcess'
    action updateProcess(appId: String, viewId: String, processId: String, data: {
        PROCESSID: String
    })
    returns ZTAPPLICATION;

    // Elimina (soft delete) una aplicación
    @Core.Description: 'delete-application'
    @path: 'delete'
    action delete(appId: String)
    returns ZTAPPLICATION;

    // Restaura una aplicación eliminada
    @Core.Description: 'restore-application'
    @path: 'restore'
    action restore(appId: String)
    returns ZTAPPLICATION;

}