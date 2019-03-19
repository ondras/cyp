export function linesToStruct(lines) {
	lines.pop(); // "OK"
	let result = {};
	lines.forEach(line => {
		let cindex = line.indexOf(":");
		if (cindex == -1) { throw new Error(`Malformed line "${line}"`); }
		result[line.substring(0, cindex)] = line.substring(cindex+2);
	});
	return result;
}

