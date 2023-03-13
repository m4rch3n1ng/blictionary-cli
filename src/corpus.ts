import { readFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { stdin, stdout } from "node:process"
import { escapeRegex } from "./_utils.js"

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

const enum STDIN {
	UP = "%1B%5BA",
	DOWN = "%1B%5BB",
	RIGHT = "%1B%5BC",
	LEFT = "%1B%5BD",
	SPACE = "%20",
	ESC = "%1B",
	BACKSPC = "%08",
	ENTER = "%0D",
}

const enum STDOUT {
	HIDECURSOR = "\x1b[?25l",
	SHOWCURSOR = "\x1b[?25h",

	RESET = "\x1b[0m",

	TEAL = "\x1b[36m",
	MAGENTA = "\x1b[35m",
	YELLOW = "\x1b[33m",

	ITALIC = "\x1b[3m",
}

const enum MODE {
	STD = "STD",
	CONC = "CONC",
	WORD = "WORD",
}

async function initStuff ( rankedWords: string[], textLines: string[] ) {
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

	let mode: MODE = MODE.STD
	const std = new Std(rankedWords)
	const conc = new Conc(textLines)

	stdin.setRawMode(true)
	return new Promise(( _resolve ) => {
		std.draw(true)
		stdin.on("data", ( rawData ) => {
			const encodedData = encodeURIComponent(rawData.toString())

			switch (mode) {
				case MODE.STD: {
					const tmpMode = std.data(encodedData, [ conc ])
					if (tmpMode) mode = tmpMode
					break
				}
				case MODE.CONC: {
					const tmpMode = conc.data(encodedData, [ std ])
					if (tmpMode) mode = tmpMode
					break
				}
				case MODE.WORD: {
					// todo search in wordlist
					break
				}
			}

		})
	})
}


// todo name
abstract class Num {
	protected index: number = 0
	protected isNum: boolean = false

	protected abstract readonly allItems: string[]
	protected abstract items: string[]
	protected abstract len: number

	private readonly ambientHeight = 4
	private readonly elementHeight = 5
	private readonly fullHeight = this.ambientHeight + this.elementHeight
	private readonly width = 10

	abstract init ( ...args: any[] ): MODE

	protected add ( toAdd: number ): void {
		if (this.index >= this.len) return

		if (this.index + toAdd >= this.len - 1) {
			this.index = this.len - 1
			return
		}

		this.index += toAdd
	}

	protected sub ( toSub: number ): void {
		if (this.index <= 0) return

		if (this.index - toSub <= 0) {
			this.index = 0
			return
		}

		this.index -= toSub
	}

	abstract data ( data: string, c: any[] ): void | MODE

	private inputNumber: string = ""
	protected num ( init: string ) {
		this.inputNumber = init
		this.isNum = true
		this.drawNum()
	}

	protected numData ( data: string ) {
		switch (data) {
			case STDIN.ESC: {
				this.isNum = false
				this.inputNumber = ""
				this.draw()
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
				this.inputNumber += data
				this.drawNum()
				break
			}
			case STDIN.BACKSPC: {
				if (this.inputNumber.length !== 0) {
					this.inputNumber = this.inputNumber.slice(0, this.inputNumber.length -1)
					this.drawNum()
				}
				break
			}
			case STDIN.ENTER: {
				if (this.inputNumber.length) {
					const tmpIndex = this.makeInputNumber()
					if (tmpIndex !== null) this.index = tmpIndex
				}

				this.inputNumber = ""
				this.isNum = false
				this.draw()
				break
			}
		}
	}

	private redraw () {
		stdout.cursorTo(0)
		for (let i = 0; i < this.fullHeight - 1; i++) {
			stdout.write(`${" ".repeat(stdout.columns)}\n`)
		}
		stdout.moveCursor(0, -this.fullHeight)
		stdout.write(`${" ".repeat(stdout.columns)}\n`)
	}

	protected makeInputNumber (): number | null {
		const tmpNumber = parseInt(this.inputNumber)

		if (isNaN(tmpNumber)) {
			return null
		} else {
			return Math.min( Math.max(0, tmpNumber), this.len - 1 )
		}
	}

	draw ( initial = false ): void {
		stdout.write(STDOUT.HIDECURSOR)
		if (initial) stdout.write(this.formatMode)

		this.redraw()

		stdout.write(`${this.formatIndex(this.index)}\n`)
		stdout.write(`${this.formatLine(this.items[this.index])}\n`)
		stdout.write(`${"-".repeat(this.width)}\n`)

		const maxHeight = this.elementHeight
		for (let movingIndex = this.index + 1; movingIndex <= this.index + maxHeight; movingIndex++) {
			stdout.write(`${this.formatLine(this.items[movingIndex])}\n`)
		}

		stdout.moveCursor(0, -this.fullHeight)
		stdout.write(this.formatMode)
	}

	private drawNum (): void {
		stdout.write(STDOUT.SHOWCURSOR)
		this.redraw()

		const tmpIndex = this.makeInputNumber()
		const index = tmpIndex ?? this.index

		stdout.write(`\n`)
		stdout.write(`${this.formatLine(this.items[index])}\n`)
		stdout.write(`${"-".repeat(this.width)}\n`)

		const maxHeight = this.elementHeight
		for (let movingIndex = index + 1; movingIndex <= index + maxHeight; movingIndex++) {
			stdout.write(`${this.formatLine(this.items[movingIndex] || "")}\n`)
		}

		stdout.moveCursor(0, -(this.ambientHeight + this.elementHeight))
		stdout.write(this.formatMode)
		stdout.write(this.formatIndex(this.inputNumber))
	}

	protected abstract formatLine ( str: string | undefined ): string
	protected abstract formatIndex ( index: string | number ): string
	protected abstract formatMode: string
}


class Std extends Num {
	protected readonly allItems: string[]
	protected items: string[]
	protected len: number

	constructor ( rankedWords: string[] ) {
		super()
		this.len = rankedWords.length
		this.allItems = rankedWords
		this.items = rankedWords
	}

	init () {
		this.draw()
		return MODE.STD
	}

	data ( data: string, [ conc ]: [ Conc ]): void | MODE {
		if (this.isNum) {
			this.numData(data)
			return
		}

		switch (data) {
			case STDIN.UP: {
				this.sub(1)
				this.draw()
				break
			}
			case STDIN.DOWN: {
				this.add(1)
				this.draw()
				break
			}
			case STDIN.RIGHT: {
				const currentWord = this.getWord()

				return conc.init(currentWord, this.index)
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
				this.num(data)
				break
			}
		}
	}

	private getWord () {
		const [, word ] = [ .../^\d+ \"(.+)\"$/.exec(this.items[this.index]!)! ] as [ string, string ]
		return word
	}

	protected formatLine ( str: string | undefined ) {
		return str || ""
	}

	protected formatIndex ( w: string | number ): string {
		return `${STDOUT.ITALIC}w${STDOUT.RESET} ${w}`
	}

	protected formatMode = `${STDOUT.TEAL}-- words --${STDOUT.RESET}\n`
}

class Conc extends Num {
	protected readonly allItems: string[]
	protected items: string[]
	protected len: number
	private stdIndex: number = 0

	constructor ( textLines: string[] ) {
		super()
		this.len = textLines.length
		this.allItems = textLines
		this.items = textLines
	}

	init ( word: string, stdIndex: number ): MODE {
		this.filter(word)
		this.stdIndex = stdIndex

		this.index = 0
		this.draw()
		return MODE.CONC
	}

	data ( data: string, [ std ]: [ Std ]): void | MODE {
		if (this.isNum) {
			this.numData(data)
			return
		}

		switch (data) {
			case STDIN.UP: {
				this.sub(1)
				this.draw()
				break
			}
			case STDIN.DOWN: {
				this.add(1)
				this.draw()
				break
			}
			case STDIN.LEFT:
			case STDIN.ESC: {
				return std.init()
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
				this.num(data)
				break
			}
		}
	}

	private filter ( word: string ) {
		const regex = new RegExp(` ${escapeRegex(word)} `, "ig")
		const filtered = this.allItems.filter(( line ) => regex.test(line))
		this.items = filtered
		this.len = filtered.length
	}

	protected formatLine ( str: string | undefined ) {
		return str ? str.slice(0, stdout.columns) : ""
	}

	protected formatIndex ( c: string | number ): string {
		return `${STDOUT.ITALIC}w${STDOUT.RESET} ${this.stdIndex} ${STDOUT.ITALIC}c${STDOUT.RESET} ${c}`
	}

	protected formatMode = `${STDOUT.MAGENTA}-- concordances --${STDOUT.RESET}\n`
}
