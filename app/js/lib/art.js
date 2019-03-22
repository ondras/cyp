import * as mpd from "./mpd.js";
import * as parser from "./parser.js";
import * as html from "./html.js";
import * as conf from "../conf.js";

let cache = {};
const MIME = "image/jpeg";
const STORAGE_PREFIX = `art-${conf.artSize}` ;

function store(key, data) {
	localStorage.setItem(`${STORAGE_PREFIX}-${key}`, data);
}

function load(key) {
	return localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
}

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
	let src = URL.createObjectURL(blob);
	let image = html.node("img", {src});
	return new Promise(resolve => {
		image.onload = () => resolve(image);
	});
}

function resize(image) {
	let canvas = html.node("canvas", {width:conf.artSize, height:conf.artSize});
	let ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export async function get(artist, album, songUrl = null) {
	let key = `${artist}-${album}`;
	if (key in cache) { return cache[key]; }

	let loaded = await load(key);
	if (loaded) {
		cache[key] = loaded;
		return loaded;
	}

	if (!songUrl) { return null; }

	// promise to be returned in the meantime
	let resolve;
	let promise = new Promise(res => resolve = res);
	cache[key] = promise;

	try {
		let data = await getImageData(songUrl);
		let bytes = new Uint8Array(data);
		let image = await bytesToImage(bytes);
		let url = resize(image).toDataURL(MIME);
		store(key, url);
		cache[key] = url;
		resolve(url);
	} catch (e) {
		cache[key] = null;
	}
	return cache[key];
}
