#!/usr/bin/env node

import sade from "sade"

import init from "./init.js"
import { search as entrySearch } from "./entry.js"

sade("blictionary", false)
	.describe("command suite for the blictionary project")
	.command("init <discordZip> <twitchDir> <ircTxt> [outDir]")
	.option("-z, --zip", "zip the output directory")
	.action(init)
	.command("entry search <dir>")
	.action(entrySearch)
	.parse(process.argv)
