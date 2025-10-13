// Namespace del archivo
namespace users;

// Define la entidad ZTUSERS.
entity ZTUSERS {
  key USERID      : String(255); // "key" lo hace requerido y único.
      USERNAME    : String(100);
      COMPANYID   : Integer;
      CEDIID      : Integer;
      EMPLOYEEID  : Integer;
      EMAIL       : String(255);
      REGUSER     : String(50)    default 'SYSHANA';
      REGDATE     : Date          default $now;
      REGTIME     : Time; // El default se maneja en la lógica del servicio.
      MODUSER     : String(50)    default 'SYSHANA';
      MODDATE     : Date          default $now;
      MODTIME     : Time;
      ACTIVED     : Boolean       default true;
      DELETED     : Boolean       default false;
      ALIAS       : String(50);
      PHONENUMBER : String(50);
      EXTENSION   : String(20);
}