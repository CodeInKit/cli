import { flows, ask_server } from '@codeinkit/react-flows';

const socket = new WebSocket('ws://localhost:5000', 'cik-flows-protocol');
