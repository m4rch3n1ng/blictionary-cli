#!/usr/bin/env node

import sade from "sade"

import analyze from "./analyze.js"
import rank from "./rank.js"
import search from "./search.js"
import { capital } from "./utils.js"

sade("blictionary", false)
	.describe("command suite for the blictionary project")
	.command("analyze <zip>")
	.describe("extract messages out of the zip into a txt file")
	.action(analyze)
	.command("rank <txt>")
	.describe("create a ranked list of words")
	.action(rank)
	.command("search <dir>")
	.action(search)

	.command("utils capital <txt>")
	.describe("analyze how many messages start with capital letters")
	.action(capital)

	.parse(process.argv)
