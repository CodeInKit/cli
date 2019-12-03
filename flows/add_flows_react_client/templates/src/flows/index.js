import { flows, ask_server } from 'cik-react';

const socket = new WebSocket('ws://localhost:5000', 'cik-flows-protocol');
