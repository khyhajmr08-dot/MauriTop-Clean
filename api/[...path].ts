import server from "../server";

// One Express HTTP server handles all /api/* routes and the internal /api/live
// rewrite used for the public /live WebSocket endpoint.
export default server;
