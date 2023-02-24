#!/usr/bin/env node

import sade from "sade"

// todo reimplement rest
import init from "./init.js"

sade("blictionary", false)
	.describe("command suite for the blictionary project")
	.command("init <discordZip> <twitchDir> <ircTxt> [outDir]")
	.option("-z, --zip", "zip the output directory")
	.action(init)
	.parse(process.argv)
