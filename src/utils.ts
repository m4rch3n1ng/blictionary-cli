import { readFile } from "node:fs/promises"
import sade from "sade"

sade("utils")
	.command("capital <txt>")
	.describe("analyze how many messages start with capital letters")
	.action(main)
	.parse(process.argv)

async function main ( txt: string ) {
	const content = await readFile(txt)
	const text = content.toString()
	const lines = text.split(/\r?\n/g)

	let uppercase = 0
	let lowercase = 0

	for (const line of lines) {
		const isUp = /^ [A-Z][^A-Z0-9 ]|^ [AI] /.test(line)
		if (isUp) {
			uppercase += 1
		} else {
			const isLow = /^ [a-z][^0-9 ]|^ [ai] /.test(line)
			if (isLow) lowercase += 1
		}
	}

	console.log({ uppercase, lowercase})
}
