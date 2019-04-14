const static = require("node-static");
const app = new static.Server("./app");
const port = Number(process.argv[2]) || 8080;

const cmd = "youtube-dl";
//const cmd = "./test.sh";

function downloadYoutube(url, response) {
	response.setHeader("Content-Type", "text/plain"); // necessary for firefox to read by chunks
//	response.setHeader("Content-Type", "text/plain; charset=utf-8");

	// FIXME create directory
	console.log("YouTube downloading", url);
	let args = [
		"-f", "bestaudio",
		"-o", `${__dirname}/_youtube/%(title)s-%(id)s.%(ext)s`,
		url
	]
	let child = require("child_process").spawn(cmd, args);

	child.stdout.setEncoding("utf8").on("data", chunk => response.write(chunk));
	child.stderr.setEncoding("utf8").on("data", chunk => response.write(chunk));

	child.on("error", error => {
		console.log(error);
		response.writeHead(500);
		response.end(error.message);
	});

	child.on("close", code => {
		if (code != 0) { // fixme
		}
		response.end();
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
//require("ws2mpd").logging(false);
