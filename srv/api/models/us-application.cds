namespace application;

entity ZTAPPLICATION {
    key APPID       : String;
        NAME        : String(150);
        DESCRIPTION : String(500);
        VIEWS       : array of {
            VIEWSID : String;
            PROCESS : array of {
                PROCESSID : String;
                PRIVILEGE : array of {
                    PRIVILEGEID : String;
                };
            };
        };
        DETAIL_ROW  : {
            ACTIVED        : Boolean;
            DELETED        : Boolean;
            DETAIL_ROW_REG : array of {
                CURRENT : Boolean;
                REGDATE : DateTime;
                REGUSER : String;
            }
        };
}
