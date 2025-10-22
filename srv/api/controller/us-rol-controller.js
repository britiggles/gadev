
const cds = require("@sap/cds");
const {
  crudRol 
} = require("../service/us-rol-service.js"); 

class RolGetController extends cds.ApplicationService {
  async init() {

    this.on("crud", async (req) => {
 
      return crudRol(req);
    });

    await super.init();
  }
}

module.exports = RolGetController;
