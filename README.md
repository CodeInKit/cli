# @codeinkit/cli

## Usage

```
npx @codeinkit/cli generate flows-server
npx @codeinkit/cli generate ws-flows-server
npx @codeinkit/cli add react-flows-client
npx @codeinkit/cli add angular-flows-client
npx @codeinkit/cli action <flow name> <action number> <data path>
```

### generate flows-server

A server based only structure that works with flows. 
With this template you can write http server, websocket, tcp socket, bot etc. 

#### file structure

* flows - a folder that hold the flows you have, the index will run through this folder and register the flows by the name of the file / folder. if a folder is present there has to be index.js file that the main file (same as require a folder in nodejs).
* setup - this folder run the initial setup, for example `express` configuration should be put here.
* index.js - this file run through the flows and register them after that it activate the routes.
* routes.js - here you can write the routes related to the project, http routes, websocket etc.

### @codeinkit/cli generate react-flows-server

create a websocket server that work out of the box with react-flows

the file structure is the same as the `flow-server` but unlike the `flow-server` routes already written to support websocket
and there is existing flow of `allow_origin` which allow all origins but can be change to support specific origins.

### @codeinkit/cli add react-flows

Add flows library to react with the `cik-react`.
This command also add the flows folder with ready to use flows instance and websocket. 

### @codeinkit/cli <flow name> <action number> <data path>

execute single action according to data in path

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)