#!/usr/bin/env node

import sade from "sade"

import init from "../dist/init.js"
import corpus from "../dist/corpus.js"
import { search as entrySearch } from "../dist/entry.js"

sade("blictionary", false)
	.describe("command suite for the blictionary project")
	.command("init [discordZip] [twitchDir] [ircTxt] [outDir]")
	.describe("initialize analysis of the messages")
	.option("-d, --discord", "path to the discord logs")
	.option("-t, --twitch", "path to the twitch logs")
	.option("-i, --irc", "path to the irc log")
	.option("-o, --outDir", "path to the output directory")
	.option("-z, --zip", "zip the output directory")
	.option("-u, --ugly", "uglify message.json to make compress it")
	.action(init)
	.command("corpus <initDir>")
	.action(corpus)
	.command("entry search <dir>")
	.action(entrySearch)
	.parse(process.argv)
