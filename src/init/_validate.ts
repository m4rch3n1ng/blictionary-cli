import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readdir, rm } from "node:fs/promises"
import { dirname, join as joinPath } from "node:path"
import { $7z } from "../_utils.js"

const toClean: ( () => Promise<void> )[] = []
export function cleanupZip () {
	return Promise.all(toClean.map(( ex ) => ex()))
}

const isZip = /\.(zip|7z)$/
export async function validateInp ( i: string | undefined, i2: string | undefined | boolean, zip: boolean = true ): Promise<string | null> {
	const path = typeof i === "string" ? i : ( typeof i2 === "string" ? i2 : null )
	if (!path) return null

	if (!existsSync(path)) {
		await cleanupZip()
		throw new Error(`path ${path} does not exist`)
	}

	if (zip && isZip.test(path)) {
		return doUnzip(path)
	} else {
		return path
	}
}

async function doUnzip ( path: string ): Promise<string> {
	const unzipPath = joinPath(dirname(path), randomUUID())
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
