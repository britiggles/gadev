using { users as myus } from '../models/us-usuarios.cds';

@impl: 'srv/api/controller/us-usuarios-controller.js'
service UsuariosList @(path: '/api/users/') {
    @cds.autoexpose
    entity ztusers as projection on myus.ZTUSERS;

    @Core.Description: 'CRUD dispatcher for usuarios'
    @path: 'crud'
    action crud(usuario: UsuarioInput) returns array of ztusers;

    // Tipos auxiliares para la entrada de usuario
    type DetailReg {
        CURRENT : Boolean;
        REGDATE : String;
        REGTIME : String;
        REGUSER : String;
    }

    type DetailRow {
        ACTIVED : Boolean;
        DELETED : Boolean;
        DETAIL_ROW_REG : array of DetailReg;
    }

    type UsuarioInput {
        USERID : String;
        USERNAME : String;
        COMPANYID : Integer;
        CEDIID : Integer;
        EMPLOYEEID : Integer;
        EMAIL : String;
        ALIAS : String;
        PHONENUMBER : String;
        EXTENSION : String;
        DETAIL_ROW : DetailRow;
        ROLEID : String;
    }

}