const static = require("node-static");
const app = new static.Server("./app");
const port = Number(process.argv[2]) || 8080;

function downloadYoutube(url, response) {
	// FIXME create directory
	console.log("YouTube downloading", url);
	let args = [
		"-f", "bestaudio",
		"-o", `${__dirname}/_youtube/%(title)s-%(id)s.%(ext)s`,
		url
	]
	let child = require("child_process").spawn("youtube-dl", args);
	let stdOut = "";
	let stdErr = "";

	child.stdout.setEncoding("utf8").on("data", chunk => stdOut += chunk);
	child.stderr.setEncoding("utf8").on("data", chunk => stdErr += chunk);

	child.on("error", error => {
		console.log(error);
		response.writeHead(500);
		response.end(error.message);
	});

	child.on("close", code => {
		if (code == 0) {
			console.log("OK");
			response.end(stdOut);
		} else {
			console.log(code, stdOut, stdErr);
			response.writeHead(500);
			response.end(stdErr);
		}
	});
}

function handleYoutube(request, response) {
	let str = "";
	request.setEncoding("utf8");
	request.on("data", chunk => str += chunk);
	request.on("end", () => {
		let url = require("querystring").parse(str)["url"];
		if (url) {
			downloadYoutube(url, response);
		} else {
			response.writeHead(404);
			response.end();
		}
	});
}

function onRequest(request, response) {
	if (request.method == "POST" && request.url == "/youtube") {
		return handleYoutube(request, response);
	} else {
		request.on("end", () => app.serve(request, response)).resume();
	}
}

let httpServer = require("http").createServer(onRequest).listen(port);
require("ws2mpd").ws2mpd(httpServer, `http://localhost:${port}`);
require("ws2mpd").logging(false);
