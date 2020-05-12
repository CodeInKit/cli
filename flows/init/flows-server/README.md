# CIK Flows project

A server based only structure that works with flows. 
With this template you can write http server, websocket, tcp socket, bot etc. 

## file structure

* flows - a folder that hold the flows you have, the index will run through this folder and register the flows by the name of the file / folder. if a folder is present there has to be index.js file that the main file (same as require a folder in nodejs).
* setup - this folder run the initial setup, for example `express` configuration should be put here.
* index.js - this file run through the flows and register them after that it activate the routes.
* routes.js - here you can write the routes related to the project, http routes, websocket etc.
