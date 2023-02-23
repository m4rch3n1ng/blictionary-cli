import { readFile, writeFile } from "node:fs/promises"

export default async function rank ( txt: string ) {
	const content = await readFile(txt)
	const text = content.toString()

	const sanitized = text.replace(/\r?\n/g, " ").replace(/["“”´`#€£$%;,*+=!?^_~|{}()\[\]\/\\]/g, " ")
		.replace(/([^<]):(\d*[^\d>])/g, "$1 $2")
		.replace(/([^<])@/g, "$1 ")
		.replace(/([^@])&/g, "$1 ")
		.replace(/([^a-z])[']([^a-z])/g, "$1 $2").replace(/([^a-z])[']([a-z])/g, "$1 $2").replace(/([a-z])[']([^a-z])/g, "$1 $2")
		.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, " $1 ")
		.replace(/(\D)\.+(\D)/g, "$1 $2").replace(/(\D)\.+(\d)/g, "$1 $2").replace(/(\d)\.+(\D)/g, "$1 $2")
	
	const words = sanitized.split(/ +/g).map(( str ) => str.toLowerCase()).filter(( w ) => w)
	const map = new Map<string, number>

	words.forEach(( word ) => {
		if (map.has(word)) map.set(word, map.get(word)! + 1)
		else map.set(word, 1)
	})

	const _w = [ ...map.entries() ]
	const sort = _w.sort(([, pop1 ], [, pop2 ]) => pop2 - pop1)

	const max = (sort[0]?.[1] || 0).toString().length
	const _txt = sort.map(([ word, amt ]) => `${amt.toString().padStart(max, "0")} "${word}"`).join("\n")

	const newFilePath = txt.slice(0, -4)
	await writeFile(`${newFilePath}.rank.txt`, _txt)
}
