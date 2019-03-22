export function linesToStruct(lines) {
	let result = {};
	lines.forEach(line => {
		let cindex = line.indexOf(":");
		if (cindex == -1) { throw new Error(`Malformed line "${line}"`); }
		result[line.substring(0, cindex)] = line.substring(cindex+2);
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
		}
		batch.push(lines.shift());
	}

	if (batch.length) {
		let song = linesToStruct(batch);
		songs.push(song);
	}

	return songs;
}