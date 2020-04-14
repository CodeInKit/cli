const flowsFramework = require('@codeinkit/flows-framework');
const restRoutes = require('@codeinkit/express-routes')
const routes = require('./routes/rest');

(async () => {
  await flowsFramework.init(__dirname);

  await flowsFramework.addRoute(restRoutes({routes}))
})();