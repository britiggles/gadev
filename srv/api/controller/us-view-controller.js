
const cds = require("@sap/cds");
const {
  crudView 
} = require("../service/us-view-service.js"); 

class ViewGetController extends cds.ApplicationService {
  async init() {

    this.on("crud", async (req) => {
 
      return crudView(req);
    });

    await super.init();
  }
}

module.exports = ViewGetController;
