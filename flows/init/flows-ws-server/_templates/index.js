const flowsFramework = require('@codeinkit/flows-framework');
const wsRoutes = require('@codeinkit/ws-routes');

(async () => {
  await flowsFramework.init(__dirname);

  await flowsFramework.addRoute(wsRoutes);
})();