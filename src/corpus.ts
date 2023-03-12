import { readFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { stdin, stdout } from "node:process"

export default async function corpus ( initDir: string ) {



	const wordRank = joinPath(initDir, "messages.word-rank.txt")
	const wordRankTxt = await readFile(wordRank)
	const wordRankLines = wordRankTxt.toString().split(/\r?\n/g)

	const text = joinPath(initDir, "messages.txt")
	const textTxt = await readFile(text)
	const textLines = textTxt.toString().split(/\r?\n/g)

	await initStuff(wordRankLines, textLines)
	stdin.destroy()
}



enum STDIN {
	UP = "%1B%5BA",
	DOWN = "%1B%5BB",
	RIGHT = "%1B%5BC",
	LEFT = "%1B%5BD",
	SPACE = "%20",
	ESC = "%1B",
	BACKSPC = "%08",
	ENTER = "%0D",
}

enum MODE {
	STD = "STD",
	CONC = "CONC",
	WORD = "WORD",
	NUM = "NUM",
}

async function initStuff ( wordRankLines: string[], textLines: string[] ) {
	const len = wordRankLines.length

	stdin.on("data", ( data ) => {
		if (encodeURIComponent(data.toString()) === "%03") {
			stdout.write("\n")
			stdout.write("\x1B[?25h")

			stdout.moveCursor(0, -9)
			stdout.cursorTo(0)
			stdout.clearScreenDown()

			process.exit()
		}
	})

	let stdI = 0
	let concI = 0
	let _num = ""

	let mode: MODE = MODE.STD
	let lineFilter: string[]

	stdin.setRawMode(true)
	return new Promise(( _resolve ) => {
		drawStd()
		stdin.on("data", ( d ) => {
			const dddd = encodeURIComponent(d.toString())

			switch (mode) {
				case MODE.STD: {
					std(dddd)
					break
				}
				case MODE.CONC: {
					conc(dddd)
					break
				}
				case MODE.WORD: {
					break
				}
				case MODE.NUM: {
					num(dddd)
					break
				}
			}

		})
	})


	function std ( dddd: string ) {
		switch (dddd) {
			case STDIN.UP: {
				if (stdI) {
					stdI -= 1
					drawStd()
				}
				break
			}
			case STDIN.DOWN: {
				if (stdI < len - 1) {
					stdI += 1
					drawStd()
				}
				break
			}
			case STDIN.RIGHT: {
				mode = MODE.CONC
				filterLines()
				drawConc()
				break
			}
			case "0":
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
			case "9": {
				mode = MODE.NUM
				_num += dddd
				drawNum()
				break
			}
		}
	}

	function conc ( dddd: string ) {
		switch (dddd) {
			case STDIN.UP: {
				if (concI) {
					concI -= 1
					drawConc()
				}
				break
			}
			case STDIN.DOWN: {
				if (concI < lineFilter.length - 1) {
					concI += 1
					drawConc()
				}
				break
			}
			case STDIN.LEFT:
			case STDIN.ESC: {
				mode = MODE.STD
				drawStd()
				concI = 0
				break
			}
		}
	}

	function num ( dddd: string ) {
		switch (dddd) {
			case STDIN.ESC: {
				mode = MODE.STD
				drawStd()
				_num = ""
				break
			}
			case "0":
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
			case "9": {
				_num += dddd
				drawNum()
				break
			}
			case STDIN.BACKSPC: {
				if (_num.length) {
					_num = _num.slice(0, _num.length -1)
					drawNum()
				}
				break
			}
			case STDIN.ENTER: {
				if (_num.length) {
					const tmpI = Number(_num)
					if (!isNaN(tmpI)) {
						stdI = tmpI
					}
					_num = ""
				}
				mode = MODE.STD
				drawStd()
				break
			}
		}
	}


	function redraw () {
		for (let _j = 0; _j < 8; _j++) {
			stdout.write(" ".repeat(stdout.columns) + "\n")
		}
		stdout.moveCursor(0, -8)
	}

	function drawConc () {
		redraw()

		stdout.write(`i ${stdI} [${concI}]\n`)
		stdout.write(_ff(lineFilter[concI]!) + "\n")
		stdout.write("-".repeat(10) + "\n")

		for (let j = concI + 1; j < concI + 6; j++) {
			stdout.write(`${_ff(lineFilter[j] || "")}\n`)
		}

		stdout.moveCursor(0, -8)
	}

	function drawStd () {
		redraw()

		stdout.write(`i ${stdI}\n`)
		stdout.write(_f(wordRankLines[stdI]!) + "\n")
		stdout.write("-".repeat(10) + "\n")

		for (let j = stdI + 1; j < stdI + 6; j++) {
			stdout.write(`${_f(wordRankLines[j] || "")}\n`)
		}

		stdout.moveCursor(0, -8)
	}

	function drawNum () {
		redraw()

		stdout.write(`i \n`)
		stdout.write(_f(wordRankLines[stdI]!) + "\n")
		stdout.write("-".repeat(10) + "\n")

		for (let j = stdI + 1; j < stdI + 6; j++) {
			stdout.write(`${_f(wordRankLines[j] || "")}\n`)
		}

		stdout.moveCursor(0, -8)
		stdout.write(`i ${_num}`)
		stdout.cursorTo(0)
	}


	function filterLines () {
		const [, word ] = [ .../^\d+ \"(.+)\"$/.exec(wordRankLines[stdI]!)! ] as [ string, string ]
		const regex = new RegExp(` ${escapeRegex(word)} `, "ig")
		const _filter = textLines.filter(( line ) => regex.test(line))
		lineFilter = _filter
	}

	function _f ( str: string ) {
		return str
	}

	function _ff ( str: string ) {
		return str.slice(0, stdout.columns)
	}

}

function escapeRegex ( w: string ) {
	return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}



