import { path7za } from "7zip-bin"
import uFuzzy from "@leeoniya/ufuzzy"
import { readdir, readFile } from "node:fs/promises"
import { dirname as toDirname, join as joinPath, resolve as resolvePath } from "node:path"
import { spawn as spawnCommand, type SpawnOptions } from "node:child_process"

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

function spawn ( command: string, args: string[], opts?: SpawnOptions ) {
	return new Promise(( resolve, reject ) => {
		const child = spawnCommand(command, args, opts || {})

		child.on("error", reject)
		child.on("close", ( code ) => resolve(code))

		child.stderr?.on("data", ( t ) => reject(t.toString()))
	})
}

export const $7z = {
	async zip ( zipPath: string, dirPath: string ) {
		const zipPathRes = resolvePath(zipPath)
		const dirPathRes = resolvePath(dirPath)

		const args = [ "a", "-t7z", "-m0=lzma2", "-mmt=on", "-md1024m", "-mfb273", "-mx=9", "-ms=on", "-aoa", "--", zipPathRes, dirPathRes ]
		const opts: SpawnOptions = { cwd: toDirname(zipPath), stdio: "inherit" }
		await spawn(path7za, args, opts)
		console.log()
	},
	unzip ( zipPath: string, unzipPath: string ) {
		return spawn(path7za, [ "x", zipPath, `-o${unzipPath}` ])
	}
}
