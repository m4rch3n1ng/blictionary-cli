import { path7za } from "7zip-bin"
import { dirname as toDirname, join as joinPath, resolve as resolvePath } from "node:path"
import { spawn as spawnCommand, type SpawnOptions } from "node:child_process"
import { mkdir, readdir, rm } from "node:fs/promises"
import { randomUUID } from "node:crypto"

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

const toClean: ( () => Promise<void> )[] = []
export function cleanupZip () {
	return Promise.all(toClean.map(( ex ) => ex()))
}

const isZip = /\.(zip|7z)$/
export async function doUnzip ( path: string ): Promise<string> {
	if (!isZip.test(path)) return path

	const unzipPath = joinPath(toDirname(path), randomUUID())
	await mkdir(unzipPath)
	await $7z.unzip(path, unzipPath)

	toClean.push(() => rm(unzipPath, { recursive: true }))

	const dirContent = await readdir(unzipPath)

	if (dirContent.length > 1) {
		await cleanupZip()
		throw new Error(`zip file ${path} has multiple files`)
	}

	if (dirContent.length < 1 || !dirContent[0]) {
		await cleanupZip()
		throw new Error(`zip file ${path} seems to be empty`)
	}

	return joinPath(unzipPath, dirContent[0])
}
