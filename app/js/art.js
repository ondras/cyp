import * as html from "./html.js";
import * as conf from "./conf.js";

const cache = {};
const MIME = "image/jpeg";
const STORAGE_PREFIX = `art-${conf.artSize}` ;

function store(key, data) {
	localStorage.setItem(`${STORAGE_PREFIX}-${key}`, data);
}

function load(key) {
	return localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
}

async function bytesToImage(bytes) {
	const blob = new Blob([bytes]);
	const src = URL.createObjectURL(blob);
	const image = html.node("img", {src});
	return new Promise(resolve => {
		image.onload = () => resolve(image);
	});
}

function resize(image) {
	const canvas = html.node("canvas", {width:conf.artSize, height:conf.artSize});
	const ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export async function get(mpd, artist, album, songUrl = null) {
	const key = `${artist}-${album}`;
	if (key in cache) { return cache[key]; }

	const loaded = await load(key);
	if (loaded) {
		cache[key] = loaded;
		return loaded;
	}

	if (!songUrl) { return null; }

	// promise to be returned in the meantime
	let resolve;
	const promise = new Promise(res => resolve = res);
	cache[key] = promise;

	const data = await mpd.albumArt(songUrl);
	if (data) {
		const bytes = new Uint8Array(data);
		const image = await bytesToImage(bytes);
		const url = resize(image).toDataURL(MIME);
		store(key, url);
		cache[key] = url;
		resolve(url);
	} else {
		cache[key] = null;
	}
	return cache[key];
}
