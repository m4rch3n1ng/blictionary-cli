import $7z from "7zip-min"
import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { extractDiscord, extractIrc, extractTwitch } from "./utils/collect.js"
import { rankWords } from "./utils/rank.js"
import { getStats } from "./utils/stats.js"

export default async function analyze ( discordZip: string, twitchDir: string, ircTxt: string, outDir: string = ".", { zip }: { zip: boolean }) {
	if (!existsSync(discordZip) || !/\.7z$/.test(discordZip)) throw `cannot find file ${discordZip}`
	if (!existsSync(twitchDir)) throw `cannot find dir ${twitchDir}`
	if (!existsSync(ircTxt)) throw `cannot find file ${ircTxt}`

	const [ discord, twitch, irc ] = await Promise.all([ extractDiscord(discordZip), extractTwitch(twitchDir), extractIrc(ircTxt) ])
	const sortedMessages = [ discord, twitch, irc ].flat().sort(( msg1, msg2 ) => +new Date(msg1.date) - +new Date(msg2.date))

	const messagesTxt = sortedMessages.map(( message ) => ` ${message.text.replace(/\r?\n/g, " ")} `.replace(/  +/g, " ")).join("\n")
	const wordsRank = rankWords(messagesTxt)
	const stats = getStats(messagesTxt)

	const outName = `init.${new Date().toISOString().replace(/:/g, "-")}`
	const outPath = joinPath(outDir, outName)

	await mkdir(outPath, { recursive: true })

	await writeFile(joinPath(outPath, "messages.json"), JSON.stringify(sortedMessages))
	await writeFile(joinPath(outPath, "messages.txt"), messagesTxt)
	await writeFile(joinPath(outPath, "messages.word-rank.txt"), wordsRank)
	await writeFile(joinPath(outPath, "stats.json"), JSON.stringify(stats, null, "\t") + "\n")

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
}
