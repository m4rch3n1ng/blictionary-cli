import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { cleanupZip, doUnzip } from "../_zip.js"

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
		paths.map(( path ) => doUnzip(path))
	)
}
