import * as html from "./html.js";
import * as conf from "./conf.js";
import MPD from "./mpd.js";


const cache: Record<string, string | null | Promise<string | null>>  = {};
const MIME = "image/jpeg";
const STORAGE_PREFIX = `art-${conf.artSize}` ;

function store(key: string, data: string) {
	localStorage.setItem(`${STORAGE_PREFIX}-${key}`, data);
}

function load(key: string) {
	return localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
}

async function bytesToImage(bytes: Uint8Array) {
	const blob = new Blob([bytes]);
	const src = URL.createObjectURL(blob);
	const image = html.node("img", {src});
	return new Promise<HTMLImageElement>(resolve => {
		image.onload = () => resolve(image);
	});
}

function resize(image: HTMLImageElement | HTMLCanvasElement) {
	while (Math.min(image.width, image.height) >= 2*conf.artSize) {
		let tmp = html.node("canvas", {width:image.width/2, height:image.height/2});
		tmp.getContext("2d")!.drawImage(image, 0, 0, tmp.width, tmp.height);
		image = tmp;
	}
	const canvas = html.node("canvas", {width:conf.artSize, height:conf.artSize});
	canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export async function get(mpd: MPD, artist: string, album: string, songUrl?: string): Promise<string | null> {
	const key = `${artist}-${album}`;
	if (key in cache) { return cache[key]; }

	const loaded = load(key);
	if (loaded) {
		cache[key] = loaded;
		return loaded;
	}

	if (!songUrl) { return null; }

	// promise to be returned in the meantime
	let resolve;
	const promise = new Promise<string | null>(res => resolve = res);
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
