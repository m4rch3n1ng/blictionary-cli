import $7z from "7zip-min"
import { existsSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { readdir, readFile, rm, mkdir, writeFile } from "node:fs/promises"
import { dirname, join as joinPath } from "node:path"


interface discordMsg {
	type: "discord"
	date: Date
	author: string
	text: string
	channel: string
	thread: string | null
}

interface twitchMsg {
	type: "twitch"
	date: Date
	author: string
	text: string
	vod: string
}

interface ircMsg {
	type: "irc"
	date: Date
	author: string
	text: string
}

export default async function analyze ( discordZip: string, twitchDir: string, ircTxt: string, outDir: string = ".", { zip }: { zip: boolean }) {
	if (!existsSync(discordZip) || !/\.7z$/.test(discordZip)) throw `cannot find file ${discordZip}`
	if (!existsSync(twitchDir)) throw `cannot find dir ${twitchDir}`
	if (!existsSync(ircTxt)) throw `cannot find file ${ircTxt}`

	const [ discord, twitch, irc ] = await Promise.all([ extractDiscord(discordZip), extractTwitch(twitchDir), extractIrc(ircTxt) ])
	const sorted = [ discord, twitch, irc ].flat().sort(( msg1, msg2 ) => +new Date(msg1.date) - +new Date(msg2.date))

	const outFile = `init.${new Date().toISOString().replace(/:/g, "-")}`
	const outPath = joinPath(outDir, outFile)

	await mkdir(outPath, { recursive: true })
	await writeFile(joinPath(outPath, "messages.json"), JSON.stringify(sorted))

	if (zip) {
		await new Promise<void>(( resolve, reject ) => (
			$7z.cmd([
				"a", "-t7z", "-m0=lzma2", "-mmt=on", "-md1024m", "-mfb273", "-mx=9", "-ms=on", "-aoa",
				"--",
				`${outPath}.7z`,
				outPath
			], ( error ) => error ? reject(error) : resolve())
		))
	}

	// todo messages.txt
	/* const text = sortedMessages.map(( message ) => {
		if (message.type === "message") return ` ${message.content.replace(/\r?\n/g, " ")} `.replace(/  +/g, " ")
		else if (message.type === "command") return `/${message.command} ${message.options.join(" ")} `.replace(/  +/g, " ")
		return ""
	}).join("\n") */
}

async function extractTwitch ( twitchDir: string ): Promise<twitchMsg[]> {
	const vodPaths = (await readdir(twitchDir)).filter(( path ) => /.txt$/.test(path))

	const allVods: twitchMsg[][] = await Promise.all(vodPaths.map(async ( vodFile ) => {
		const vodPath = joinPath(twitchDir, vodFile)
		const vodContent = await readFile(vodPath)
		const vod = vodContent.toString()

		const lines = vod.split(/\r?\n/g)
		const messages: twitchMsg[] = []
		for (const line of lines) {
			if (/^\[.{23}\] .+?: .+$/.test(line)) {
				const [ , date, author, text ] = [ .../^\[(.{23})\] (.+?): (.+)$/.exec(line)! ] as [ string, string, string, string ]
				messages.push({ type: "twitch", date: new Date(date), author, text, vod: vodFile.slice(0, -4) })
			}
		}

		return messages
	}))

	return allVods.flat(1)
}


async function extractIrc ( ircTxt: string ): Promise<ircMsg[]> {
	const ircContent = await readFile(ircTxt)
	const irc = ircContent.toString()

	const lines = irc.split(/\r?\n/g)
	const messages: ircMsg[] = []
	let currYear = "2021"
	for (const line of lines) {
		if (/^\*{4} BEGIN LOGGING AT/.test(line) && /\d{4}$/.test(line)) {
			const [ year ] = /\d{4}/.exec(line)!
			currYear = year
		} else if (/^[a-z]{3} \d\d \d\d:\d\d:\d\d <[a-z]+>\t.+$/i.test(line)) {
			const [ , d, author, text ] = [ .../^([a-z]{3} \d\d \d\d:\d\d:\d\d) <([a-z]+)>\t(.+)$/i.exec(line)! ] as [ string, string, string, string ]
			messages.push({
				type: "irc",
				date: new Date(`${d} ${currYear} CST`),
				author,
				text
			})
		// todo /me
		}
	}

	return messages
}


// function toScuffedDate ( date: string ) {
// 	// return Number(new Date(date + " 1970 UTC"))
// 	return new Date(date)
// }


interface discordThing {
	name: string
	messages: (interCommand | interMessage)[]
}

interface discordChannel extends discordThing {
	type: "text" | "voice" | "news"
}

interface discordThread extends discordThing {
	type: "thread"
	channelName: string
}

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

async function extractDiscord ( discordZip: string ): Promise<discordMsg[]> {
	const unzipPath = joinPath(dirname(discordZip), randomUUID())
	await mkdir(unzipPath)
	await new Promise<void>(( resolve ) => {
		$7z.unpack(discordZip, unzipPath, () => resolve())
	})

	const readableDir = (await readdir(unzipPath))[0]
	if (!readableDir) throw "something went wrong"

	const readPath = joinPath(unzipPath, readableDir)
	const allDiscordJson = await readdir(readPath)

	const allMessages: discordMsg[][] = await Promise.all(allDiscordJson.map(async ( jsonFile ) => {
		const jsonPath = joinPath(readPath, jsonFile)
		const jsonFileContent = await readFile(jsonPath)
		const json: discordChannel | discordThread = JSON.parse(jsonFileContent.toString())

		const channel = json.type === "thread" ? json.channelName : json.name
		const thread = json.type === "thread" ? json.name : null

		const messages: discordMsg[] = json.messages.map(( message ) => {
			if (message.type === "message") {
				return {
					type: "discord",
					date: new Date(message.time),
					author: message.author,
					text: message.content,
					channel,
					thread
				}
			} else {
				return {
					type: "discord",
					date: new Date(message.time),
					author: message.author,
					text: `/${message.command} ${message.options.join(" ")}`,
					channel,
					thread
				}
			}
		})

		return messages
	}))

	await rm(unzipPath, { recursive: true })
	return allMessages.flat(1)
}
