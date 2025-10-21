const cds = require("@sap/cds");
const {
  crudApplication
} = require("../service/us-application-service");

class ApplicationPatchController extends cds.ApplicationService {
  async init() {
    this.on("crud", async (req) => {
      return crudApplication(req);
    });

    await super.init();
  }
}

module.exports = ApplicationPatchController;
