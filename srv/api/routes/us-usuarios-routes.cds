using { users as myus } from '../models/us-usuarios.cds';

@impl: 'srv/api/controller/us-usuarios-controller.js'
service UsuariosList @(path:'/api/users/') {
    entity ztusers as projection on myus.ZTUSERS;
    @Core.Description: 'get-all-users'
    @path :'getall'
    function getall()
    returns array of ztusers;
    

    @Core.Description: 'create-user'
    @path: 'create'
    action create(usuario : ztusers) 
    returns ztusers;

}