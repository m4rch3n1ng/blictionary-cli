import { existsSync } from "node:fs"
import { stdin, stdout } from "node:process"
import { fetchAllEntries, searchWord, wordClassToString } from "./_utils.js"

function handleSigInt ( data: string ) {
	if (encodeURIComponent(data) == "%03") {
		stdout.write("\n")
		stdout.clearScreenDown()

		process.exit()
	}
}

const enum STDIN {
	ENTER = "%0D",
	BACKSPACE = "%08",
	CTRL_BACKSPACE = "%17"
}

const amt = 10
export async function search ( dir: string ) {
	stdin.on("data", handleSigInt)
	stdin.setRawMode(true)

	stdout.write("$ ")

	if (!existsSync(dir)) throw new Error("dir does not exist")
	const allEntries = await fetchAllEntries(dir)

	await new Promise<void>(( resolve ) => {
		let str = ""

		function line ( data: string ) {
			const key = encodeURIComponent(data)
			switch (key) {
				case STDIN.BACKSPACE: {
					if (str.length) {
						stdout.moveCursor(-1, 0)
						stdout.write(" ")
						stdout.moveCursor(-1, 0)

						str = str.slice(0, -1)
					}

					draw()
					break
				}
				case STDIN.CTRL_BACKSPACE: {
					if (str.length) {
						let back = 0
						if (!str.endsWith(" ")) {
							back = str.match(/( +)?[^ ]+$/g)![0].length
						} else {
							back = str.match(/( +)$/)![0].length
						}

						stdout.moveCursor(-back, 0)
						stdout.write(Array(back).fill(" ").join(""))
						stdout.moveCursor(-back, 0)

						str = str.slice(0, -back)
					}

					draw()
					break
				}
				case STDIN.ENTER: {
					stdout.cursorTo(0)
					stdout.write(" ".repeat(stdout.columns))

					stdout.clearScreenDown()
					resolve()
					process.exit()
				}
				default: {
					if (/^[-\\/_$@=^?!.:,;#+*|&%"'()[\]{} \p{L}\d]+$/ui.test(data)) {
						str += data
						stdout.write(data)
					}

					draw()
					break
				}
			}
		}

		function draw () {
			stdout.moveCursor(0, 1)
			stdout.cursorTo(0)

			const searched = searchWord(str, allEntries)
			for (let i = 0; i < amt; i ++) {
				if (searched[i]) {
					stdout.write("\x1b[0m")
					stdout.write(" ".repeat(stdout.columns))
					stdout.cursorTo(0)
					console.log(`\x1b[31m${searched[i]!.id.padStart(3, " ")}\x1b[0m ${searched[i]!.word}, \x1b[3m${wordClassToString(searched[i]!.class)}\x1b[0m`)
				} else {
					console.log(" ".repeat(stdout.columns))
				}
				stdout.cursorTo(0)
			}

			stdout.moveCursor(str.length + 2, -(amt + 1))
		}

		stdin.on("data", line)
	})
}
