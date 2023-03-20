export function rankWords ( messagesTxt: string ) {
	const sanitized = messagesTxt
		.replace(/\r?\n/g, " ") // rm newline
		.replace(/["“”´`#€£$%;,*+=!?^_~|{}()\[\]\/\\]/g, " ") // rm punctuation
		.replace(/’/g, "'") // convert ’ to '
		.replace(/>(.)/g, "> $1") // seperate />./
		.replace(/([^<a]):(\d*[^\d>])/g, "$1 $2") // keep custom discord emotes, otherwise remove ":"
		.replace(/([^<])@/g, "$1 ") // keep user pings, otherwise remove @
		.replace(/([^@])&/g, "$1 ") // keep role pings, otherwise remove &
		.replace(/([^a-z])[']([^a-z])/gi, "$1 $2").replace(/([^a-z])[']([a-z])/gi, "$1 $2").replace(/([a-z])[']([^a-z])/gi, "$1 $2") // only keep /[a-z]'[a-z]/
		.replace(/(\D)\.+(\D)/g, "$1 $2").replace(/(\D)\.+(\d)/g, "$1 $2").replace(/(\d)\.+(\D)/g, "$1 $2") // only keep /\d\.\d/
		.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, " $1 ") // seperate emoji

	const words = sanitized.split(/\s+/g).map(( str ) => str.toLowerCase()).filter(( w ) => w)
	const map = new Map<string, number>

	words.forEach(( word ) => {
		if (map.has(word)) map.set(word, map.get(word)! + 1)
		else map.set(word, 1)
	})

	const _w = [ ...map.entries() ]
	const sort = _w.sort(([, pop1 ], [, pop2 ]) => pop2 - pop1)

	const max = (sort[0]?.[1] || 0).toString().length
	const rankedTxt = sort.map(([ word, amt ]) => `${amt.toString().padStart(max, "0")} "${word}"`).join("\n")

	return rankedTxt
}
