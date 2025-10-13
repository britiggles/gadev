using {users as myus} from './us-usuarios';

namespace users;

entity ZTUSERS_ROLES {
    key USER    : Association to myus.ZTUSERS;
    key ROLEID  : String(100); 
    REGUSER   : String(20) default 'SYSHANA';
    REGDATE   : Date       default $now;
    REGTIME   : Time;
    MODUSER   : String(20) default 'SYSHANA';
    MODDATE   : Date       default $now;
    MODTIME   : Time;
    ACTIVED   : Boolean    default true;
    DELETED   : Boolean    default false;
    ROLESAPID : String(500);
}

