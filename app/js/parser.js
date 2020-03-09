export function linesToStruct(lines) {
	let result = {};
	lines.forEach(line => {
		let cindex = line.indexOf(":");
		if (cindex == -1) { throw new Error(`Malformed line "${line}"`); }
		let key = line.substring(0, cindex);
		let value = line.substring(cindex+2);
		if (key in result) {
			let old = result[key];
			if (old instanceof Array) {
				old.push(value);
			} else {
				result[key] = [old, value];
			}
		} else {
			result[key] = value;
		}
	});
	return result;
}

export function songList(lines) {
	let songs = [];
	let batch = [];
	while (lines.length) {
		let line = lines[0];
		if (line.startsWith("file:") && batch.length) { 
			let song = linesToStruct(batch);
			songs.push(song);
			batch = [];
		}
		batch.push(lines.shift());
	}

	if (batch.length) {
		let song = linesToStruct(batch);
		songs.push(song);
	}

	return songs;
}

export function pathContents(lines) {
	const prefixes = ["file", "directory", "playlist"];

	let batch = [];
	let result = {};
	let batchPrefix = null;
	prefixes.forEach(prefix => result[prefix] = []);

	while (lines.length) {
		let line = lines[0];
		let prefix = line.split(":")[0];
		if (prefixes.includes(prefix)) { // begin of a new batch
			if (batch.length) { result[batchPrefix].push(linesToStruct(batch)); }
			batchPrefix = prefix;
			batch = [];
		}
		batch.push(lines.shift());
	}

	if (batch.length) { result[batchPrefix].push(linesToStruct(batch)); }

	return result;
}