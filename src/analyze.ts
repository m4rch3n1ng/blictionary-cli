import $7z from "7zip-min"
import { existsSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { readdir, writeFile, readFile, rm, mkdir } from "node:fs/promises"
import { dirname, join as joinPath } from "node:path"

interface interMessage {
	type: "message"
	author: string
	content: string
	time: Date
}

interface interCommand {
	type: "command"
	author: string
	command: string
	options: string[]
	time: Date
}

export default async function main ( zipPath: string ) {
	if (!existsSync(zipPath) || !/\.7z$/.test(zipPath)) return console.log("cannot find file")

	const unzipPath = joinPath(dirname(zipPath), randomUUID())
	await mkdir(unzipPath)
	await new Promise<void>(( resolve ) => {
		$7z.unpack(zipPath, unzipPath, () => resolve())
	})

	const readableDir = (await readdir(unzipPath))[0]
	if (!readableDir) return console.log("something went wrong")

	const readPath = joinPath(unzipPath, readableDir)
	const allJson = await readdir(readPath)
	const messages: (interCommand|interMessage)[] = (await Promise.all(allJson.map(async ( jsonFile ) => {
		const jsonPath = joinPath(readPath, jsonFile)
		const json = await readFile(jsonPath)
		const { messages } = JSON.parse(json.toString())
		return messages
	}))).flat()

	const sortedMessages = messages.sort(( msg1, msg2 ) => +new Date(msg1.time) - +new Date(msg2.time))

	const text = sortedMessages.map(( message ) => {
		if (message.type === "message") return ` ${message.content.replace(/\r?\n/g, " ")} `.replace(/  +/g, " ")
		else if (message.type === "command") return `/${message.command} ${message.options.join(" ")} `.replace(/  +/g, " ")
		return ""
	}).join("\n")

	const txtPath = zipPath.replace(/\.7z$/, ".txt")
	await writeFile(txtPath, text)
	await rm(unzipPath, { recursive: true })
}
