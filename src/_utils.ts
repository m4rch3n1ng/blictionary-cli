import uFuzzy from "@leeoniya/ufuzzy"
import { join as joinPath } from "node:path"
import { readdir, readFile } from "node:fs/promises"

export interface smallEntry {
	id: string
	word: string
	class: string | string[],
}

export function searchWord ( input: string, allEntries: smallEntry[] ) {
	if (!input.length) {
		return []
	} else {
		const it = filterSearch(input, allEntries)
		return it
	}
}

function filterSearch ( input: string, allEntries: smallEntry[] ) {
	const uf = new uFuzzy({ intraMode: 1 })
	const [ , info, searchOrder ] = uf.search(allEntries.map(({ word }) => word), input, undefined, Infinity)

	if (info && searchOrder) {
		const sorted = searchOrder.map(( i ) => allEntries[info.idx[i]!])
		return sorted
	} else {
		return []
	}
}

// add cache ref https://github.com/m4rch3n1ng/blictionary/pull/8
export async function fetchAllEntries ( path: string ) {
	const all = await readdir(path)
	const allEntries: smallEntry[] = await Promise.all(
		all.filter(( fileName ) => /\.json$/.test(fileName)).map(async ( fileName ) => {
			const filePath = joinPath(path, fileName)
			const content = await readFile(filePath)
			const entry = JSON.parse(content.toString())
			return {
				id: fileName.slice(0, -5),
				word: entry.word,
				class: entry.class
			}
		})
	)

	return allEntries
}

export function wordClassToString ( wordClass: string | string[] ): string {
	if (!Array.isArray(wordClass)) return wordClass

	let string = ""
	for (let i = 0; i < wordClass.length; i++) {
		string += wordClass[i]

		if (i < wordClass.length - 1 && wordClass.length >= 3) {
			string += ", "
		}

		if (i == wordClass.length - 2) {
			string += wordClass.length === 2 ? " and " : "and "
		}
	}

	return string
}

export function escapeRegex ( w: string ) {
	return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const enum STDIN {
	UP = "%1B%5BA",
	DOWN = "%1B%5BB",
	LEFT = "%1B%5BD",
	RIGHT = "%1B%5BC",
	SPACE = "%20",
	ESC = "%1B",
	BACKSPACE = "%08",
	CTRL_BACKSPACE = "%17",
	ENTER = "%0D",
}

export const enum STDOUT {
	HIDECURSOR = "\x1b[?25l",
	SHOWCURSOR = "\x1b[?25h",
}
