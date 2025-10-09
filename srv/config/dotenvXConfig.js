const dotenvx = require('@dotenvx/dotenvx'); //Importación de librería dotenvx
dotenvx.config(); //Carga las variables de entorno

module.exports = {
    HOST: process.env.HOST || 'NO ENCONTRE VARIABE DE ENTORNO',
    PORT: process.env.PORT || 'NO ENCONTRE PORT',
    API_URL: process.env.API_URL || '/api/v1',
    CONNECTION_STRING: process.env.CONNECTION_STRING || 'SIN Cadena de CONEXION A LA BD MONGO', 
    DATABASE: process.env.DATABASE || 'db_default',  
    DB_USER: process.env.DB_USER || 'admin',  
    DB_PASSWORD: process.env.DB_PASSWORD || 'admin', 
}