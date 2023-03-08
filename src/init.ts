import { mkdir, writeFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { extractDiscord, extractIrc, extractTwitch } from "./init/collect.js"
import { rankWords } from "./init/rank.js"
import { getStats } from "./init/stats.js"
import { cleanupZip, validateInp } from "./init/_validate.js"
import { $7z } from "./_utils.js"

interface cliOptions {
	zip: boolean
	u: boolean
	d?: string | boolean
	t?: string | boolean
	i?: string | boolean
	o?: string | boolean
}

export default async function cli ( dc: string | undefined, tw: string | undefined, irc: string | undefined, out: string | undefined, { zip, d, t, i, o, u }: cliOptions ) {
	const discordPath = await validateInp(dc, d)
	const twitchPath = await validateInp(tw, t)
	const ircPath = await validateInp(irc, i)
	const outPath = await validateInp(out, o, false) || "."
	if (!discordPath && !twitchPath && !ircPath) throw new Error("no input given")

	await analyze(discordPath, twitchPath, ircPath, outPath, zip, u)
	await cleanupZip()
}

async function analyze ( discordZip: string | null, twitchDir: string | null, ircTxt: string | null, outDir: string, zip: boolean, ugly: boolean ) {
	const [ discord, twitch, irc ] = await Promise.all([ extractDiscord(discordZip), extractTwitch(twitchDir), extractIrc(ircTxt) ])
	const sortedMessages = [ discord, twitch, irc ].flat().sort(( msg1, msg2 ) => +new Date(msg1.date) - +new Date(msg2.date))

	const messagesTxt = sortedMessages.map(( message ) => ` ${message.text.replace(/\r?\n/g, " ")} `.replace(/  +/g, " ")).join("\n")
	const wordsRank = rankWords(messagesTxt)
	const stats = getStats(messagesTxt)

	const outName = `init.${new Date().toISOString().replace(/:/g, "-")}`
	const outPath = joinPath(outDir, outName)

	await mkdir(outPath, { recursive: true })

	await writeFile(joinPath(outPath, "messages.json"), ugly ? JSON.stringify(sortedMessages) : JSON.stringify(sortedMessages, null, "\t"))
	await writeFile(joinPath(outPath, "messages.txt"), messagesTxt)
	await writeFile(joinPath(outPath, "messages.word-rank.txt"), wordsRank)
	await writeFile(joinPath(outPath, "stats.json"), JSON.stringify(stats, null, "\t") + "\n")

	if (zip) {
		await $7z.zip(`${outPath}.7z`, outPath)
	}

	console.log("created", outPath)
	if (zip) console.log("zipped into", `${outPath}.7z`)
}
