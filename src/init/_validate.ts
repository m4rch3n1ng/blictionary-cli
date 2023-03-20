import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readdir, rm } from "node:fs/promises"
import { dirname, join as joinPath } from "node:path"
import { $7z } from "../_utils.js"

const toClean: ( () => Promise<void> )[] = []
export function cleanupZip () {
	return Promise.all(toClean.map(( ex ) => ex()))
}

export async function validatePath ( i: string | undefined, i2: string | undefined | boolean ): Promise<string> {
	const path = typeof i === "string" ? i : ( typeof i2 === "string" ? i2 : null )

	if (!path) return "."

	if (!existsSync(path)) {
		await mkdir(path, { recursive: true })
	}

	return path
}

function collapseInput ( input1: string | undefined, input2: string | string[] | undefined | boolean ): null | string[] {
	const all = [ input1, ...( Array.isArray(input2) ? input2 : [ input2 ])]
	const filter = all.filter(( el ) => typeof el === "string") as string[]

	return filter.length ? filter : null
}

const isZip = /\.(zip|7z)$/
export async function validateInput ( input1: string | undefined, input2: string | string[] | undefined | boolean ): Promise<string[] | null> {
	const paths = collapseInput(input1, input2)
	if (!paths) return null

	for (let path of paths) {
		if (!existsSync(path)) {
			await cleanupZip()
			throw new Error(`path ${path} does not exist`)
		}
	}

	return Promise.all(
		paths.map(( path ) => isZip.test(path) ? doUnzip(path) : path)
	)
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
