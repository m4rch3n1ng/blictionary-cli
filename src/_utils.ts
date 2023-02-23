import { readdir, readFile } from "node:fs/promises"
import { filter as fuzzyFilter, sort as fuzzySort } from "fuzzyjs"
import { join as joinPath } from "node:path"

export interface smallMeta {
	id: string
	word: string
	class: string | string[],
}

export function search ( input: string, allMeta: smallMeta[] ) {
	if (!input.length) {
		return []
	} else {
		const it = filterSearch(input, allMeta)
		return it
	}
}

function filterSearch ( input: string, allMeta: smallMeta[] ) {
	const filtered = allMeta.filter(fuzzyFilter(input, { iterator: ({ word }) => word }))
	const sorted = filtered.sort(fuzzySort(input, { iterator: ({ word }) => word }))

	return sorted
}

export async function fetchAllMeta ( path: string ) {
	const all = await readdir(path)
	const allMeta: smallMeta[] = await Promise.all(
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

	return allMeta
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
