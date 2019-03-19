const static = require("node-static");
const app = new static.Server("./app");
const port = 8080;

let httpServer = require("http").createServer((request, response) => {
    request.on("end", () => app.serve(request, response)).resume();
});
httpServer.listen(port);

require("ws2mpd").ws2mpd(httpServer, `http://localhost:${port}`);
