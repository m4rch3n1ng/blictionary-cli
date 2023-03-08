import { readdir, readFile } from "node:fs/promises"
import { join as joinPath } from "node:path"

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

export type message = discordMsg | twitchMsg | ircMsg


export async function extractTwitch ( twitchDir: string | null ): Promise<twitchMsg[]> {
	if (twitchDir === null) return []

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

export async function extractIrc ( ircTxt: string | null ): Promise<ircMsg[]> {
	if (ircTxt === null) return []

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

export async function extractDiscord ( discordZip: string | null ): Promise<discordMsg[]> {
	if (discordZip === null) return []

	const readPath = discordZip
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

	return allMessages.flat(1)
}
