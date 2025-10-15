const express = require('express');
const cds = require('@sap/cds');
const cors = require('cors');
require('./srv/config/connectToMongoDB.js'); 
require('./srv/config/connectToCosmosDB.js')

module.exports = async (o) => {
    try{
        let app = express();
        app.express = express;
        app.use(express.json({limit:'500kb'}));
        app.use(cors());
        o.app = app;
        o.app.httpServer = await cds.server(o);
    
        return o.app.httpServer;

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}