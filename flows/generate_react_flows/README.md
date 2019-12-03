# CIK WS Flows project

A server based only structure that works with flows. 
Come with ready to use websockets.

## file structure

* flows - a folder that hold the flows you have, the index will run through this folder and register the flows by the name of the file / folder. if a folder is present there has to be index.js file that the main file (same as require a folder in nodejs).
* setup - this folder run the initial setup, for example `express` configuration should be put here.
* index.js - this file run through the flows and register them after that it activate the routes.
* routes.js - ready to use websocket routes

## flows

* `allow_origin` - this flow should change `fdata.isAllowed` to true if the origin can access to server. if not isAllowed should be false.