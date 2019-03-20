import * as mpd from "./mpd.js";
import * as parser from "./parser.js";

let cache = {};
const SIZE = 64;

async function getImageData(songUrl) {
	let data = [];
	let offset = 0;
	while (1) {
		let params = ["albumart", `"${mpd.escape(songUrl)}"`, offset];
		let lines = await mpd.command(params.join(" "));
		data = data.concat(lines[2]);
		let metadata = parser.linesToStruct(lines.slice(0, 2));
		if (data.length >= Number(metadata["size"])) { return data; }
		offset += Number(metadata["binary"]);
	}
}

async function bytesToImage(bytes) {
	let blob = new Blob([bytes]);
	let image = document.createElement("img");
	image.src = URL.createObjectURL(blob);
	return new Promise(resolve => {
		image.onload = () => resolve(image);
	});
}

async function resize(image) {
	let canvas = document.createElement("canvas");
	canvas.width = SIZE;
	canvas.height = SIZE;
	let ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, SIZE, SIZE);

	return new Promise(resolve => canvas.toBlob(resolve));
}

export async function get(artist, album, songUrl = null) {
	let key = `${artist}-${album}`;
	if (key in cache) { return cache[key]; }

	if (!songUrl) { return null; }

	// promise to be returned in the meantime
	let resolve;
	let promise = new Promise(res => resolve = res);
	cache[key] = promise;

	try {
		let data = await getImageData(songUrl);
		let bytes = new Uint8Array(data);
		let image = await bytesToImage(bytes);
		let blob = await resize(image);
		let url = URL.createObjectURL(blob);
		cache[key] = url;
		resolve(url);
	} catch (e) {
		cache[key] = null;
	}
	return cache[key];
}
