const dotenvXConfig = require('./dotenvXConfig');
const { CosmosClient } = require("@azure/cosmos");

(async () => { 
    try {
    const client = new CosmosClient({
      endpoint: dotenvXConfig.COSMOS_DB_URI,
      key: dotenvXConfig.COSMOS_DB_KEY
    });

    const database = client.database(dotenvXConfig.COSMOS_DB_DATABASE);

    // Confirmación básica
    console.log(`✅ Conectado a la base de datos: ${database.id} de Cosmos DB`);

    // Opcional: retornar cliente y base de datos si quieres usarlos fuera
    return { client, database };
    } catch (error) { 
        console.log('Error: ', error); 
    } 
})();


