
const cds = require("@sap/cds");
const {
  crudProcess 
} = require("../service/us-process-service.js"); 

class ProcessGetController extends cds.ApplicationService {
  async init() {

    this.on("crud", async (req) => {
 
      return crudProcess(req);
    });

    await super.init();
  }
}

module.exports = ProcessGetController;
