import $7z from "7zip-min"
import sade from "sade"
import { existsSync } from "node:fs"
import { readdir, writeFile, readFile, rm } from "node:fs/promises"
import { dirname, join as joinPath } from "node:path"

sade("analyze <zip>", true)
	.action(main)
	.parse(process.argv)

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

async function main ( zipPath: string ) {
	if (!existsSync(zipPath)) return console.log("cannot find file")

	const unzipPath = zipPath.replace(/.7z$/, "")
	if (!existsSync(unzipPath)) {
		await new Promise<void>(( resolve ) => {
			$7z.unpack(zipPath, dirname(unzipPath), () => resolve())
		})
	}

	const allJson = await readdir(unzipPath)
	const messages: (interCommand|interMessage)[] = (await Promise.all(allJson.map(async ( jsonFile ) => {
		const jsonPath = joinPath(unzipPath, jsonFile)
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

	await writeFile(`${unzipPath}.txt`, text)
	await rm(unzipPath, { recursive: true })
}
