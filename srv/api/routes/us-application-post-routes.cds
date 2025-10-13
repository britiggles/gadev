//srv\api\routes\us-application-post-routes.cds

using { application as entity } from '../models/us-application.cds';

@impl: 'srv/api/controller/us-application-post-controller.js'
service ApplicationPost @(path:'/api/application/') {
    @cds.autoexpose
    entity ZTAPPLICATION as projection on entity.ZTAPPLICATION;
    //LA API DE CREAR APP
    @Core.Description: 'create-application'
    @path: 'create'
    action create(application : ZTAPPLICATION) 
    returns ZTAPPLICATION;
    //LA API DE CREAR VIEW DENTRO DE APP
    @Core.Description: 'add-view-app'
    @path: 'addView'
    action addView(APPID: String,VIEWSID: String, PROCESS: array of { PROCESSID: String }) 
    returns ZTAPPLICATION;
    //LA API PARA CREAR UN PROCESO DENTRO DE UNA VIEW DENTRO DE UNA APP
    @Core.Description: 'add-process-view-app'
    @path: 'addProcess'
    action addProcess(APPID: String, VIEWSID: String, PROCESSID: String) 
    returns ZTAPPLICATION;
}