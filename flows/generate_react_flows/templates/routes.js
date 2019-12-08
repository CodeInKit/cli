const WebSocketServer = require('websocket').server;
const http = require('http');
const PORT = process.env.PORT || '5000'; 

module.exports = function(execFlow) {
  // all http request returns 404 since we work only with ws
  const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, () => {   
    console.log(`${new Date()} Server is listening on port ${PORT}`);
  });
  
  const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
  });

  wsServer.on('request', async (req) => {
    const {isAllowed} = await execFlow('allow_origin', {origin: req.origin});
    
    if(!isAllowed) {
      req.reject();
      console.warn(`${new Date()} Connection from origin ${req.origin} rejected.`);
      return;
    }

    const connection = req.accept('cik-flows-protocol', req.origin);

    connection.on('message', async message => {
      const data = JSON.parse(message.utf8Data);
      const rd = JSON.stringify(await execFlow(data.__flows.flowName, data));
      connection.send(rd);
    });
  });
};
