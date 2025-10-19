namespace rol;

entity ZTROL {
    ROLEID      : String;
    ROLENAME    : String;
    DESCRIPTION : String;
    PROCESS     : array of {
        NAMEAPP     : String;
        PROCESSID   : String;
        PRIVILEGE : array of {
                PRIVILEGEID : String;
            };
    };
    ACTIVED     : Boolean;
    DELETED     : Boolean;
    DETAIL_ROW  : {

        DETAIL_ROW_REG : array of {
            CURRENT : Boolean;
            REGDATE : DateTime;
            REGUSER : String;
        }
    };
};