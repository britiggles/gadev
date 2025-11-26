// Namespace del archivo
namespace users;

// Define la entidad ZTUSERS.
entity ZTUSERS {
  key   USERID      : String(20);
        USERNAME    : String(100);
        COMPANYID   : Integer;
        CEDIID      : Integer;
        EMPLOYEEID  : Integer;
        EMAIL       : String(255);
        ALIAS       : String(50);
        PHONENUMBER : String(50);
        EXTENSION   : String(20);
        PROFILE_PIC_URL : String(512);
        BIRTHDATE       : String(10);
        ACTIVED         : Boolean;
        DELETED         : Boolean;
        ROLES       : array of {
            ROLEID : String;
        };
        DETAIL_ROW  : {
            ACTIVED        : Boolean;
            DELETED        : Boolean;
            DETAIL_ROW_REG : array of {
                CURRENT : Boolean;
                REGDATE : DateTime;
                REGTIME : DateTime;
                REGUSER : String;
            }
        };

}