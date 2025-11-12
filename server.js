const express = require('express');
const cds = require('@sap/cds');
const cors = require('cors');

// Conexiones
require('./srv/config/connectToMongoDB.js');
require('./srv/config/connectToCosmosDB.js');

const app = express();
app.use(express.json({ limit: '500kb' }));
app.use(cors());

// Integrar CAP en Express
cds.on('bootstrap', (app) => {
  app.use(cors());
  app.use(express.json({ limit: '500kb' }));
});

// Montar servicios CAP
(async () => {
  try {
    await cds.serve('all').in(app);
    console.log('✅ CAP services ready');
  } catch (err) {
    console.error('❌ Error starting CAP services:', err);
  }
})();

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('🚀 CAP backend + Mongo + CosmosDB corriendo en Vercel');
});

// Exportar el handler para Vercel
module.exports = app;
