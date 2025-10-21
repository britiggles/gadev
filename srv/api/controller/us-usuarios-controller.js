const cds = require('@sap/cds');
const { crudUsuario } = require('../service/us-usuarios-service.js');

class UsuariosList extends cds.ApplicationService {
  async init() {
    // Registra la acción 'crud' y delega en el servicio centralizado
    this.on('crud', async (req) => {
      return crudUsuario(req);
    });

    return await super.init();
  }
}

module.exports = UsuariosList;