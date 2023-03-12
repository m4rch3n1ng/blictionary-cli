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

enum STDOUT {
	HIDECURSOR = "\x1b[?25l",
	SHOWCURSOR = "\x1b[?25h"
}

enum MODE {
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
		std.draw()
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
	index: number = 0
	isNum: boolean = false

	abstract readonly allItems: string[]
	abstract items: string[]
	abstract len: number

	protected readonly height = 8
	protected readonly width = 10

	abstract init ( ...args: any[] ): MODE

	add ( toAdd: number ): void {
		if (this.index >= this.len) return

		if (this.index + toAdd >= this.len - 1) {
			this.index = this.len - 1
			return
		}

		this.index += toAdd
	}

	sub ( toSub: number ): void {
		if (this.index <= 0) return

		if (this.index - toSub <= 0) {
			this.index = 0
			return
		}

		this.index -= toSub
	}

	abstract data ( data: string, c: any[] ): void | MODE

	protected inputNumber: string = ""
	num ( init: string ) {
		this.inputNumber = init
		this.isNum = true
		this.drawNum()
	}

	numData ( data: string ) {
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

	protected redraw () {
		stdout.cursorTo(0)
		for (let i = 0; i < this.height; i++) {
			stdout.write(`${" ".repeat(stdout.columns)}\n`)
		}
		stdout.moveCursor(0, -this.height)
	}

	protected makeInputNumber (): number | null {
		const tmpNumber = parseInt(this.inputNumber)

		if (isNaN(tmpNumber)) {
			return null
		} else {
			return Math.min( Math.max(0, tmpNumber), this.len - 1 )
		}
	}


	abstract draw (): void
	abstract drawNum (): void

	protected abstract format ( str: string ): string
	protected abstract formatTop ( ...args: (string | number)[] ): string
}


class Std extends Num {
	len: number
	readonly allItems: string[]
	items: string[]

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

	draw () {
		stdout.write(STDOUT.HIDECURSOR)
		this.redraw()

		stdout.write(`${this.formatTop(this.index)}\n`)
		stdout.write(`${this.format(this.items[this.index])}\n`)
		stdout.write(`${"-".repeat(this.width)}\n`)

		const maxHeight = this.height - 2
		for (let movingIndex = this.index + 1; movingIndex < this.index + maxHeight; movingIndex++) {
			stdout.write(`${this.format(this.items[movingIndex])}\n`)
		}

		stdout.moveCursor(0, -this.height)
	}

	drawNum (): void {
		stdout.write(STDOUT.SHOWCURSOR)
		this.redraw()

		const tmpIndex = this.makeInputNumber()
		const index = tmpIndex ?? this.index

		stdout.write(`\n`)
		stdout.write(`${this.format(this.items[index])}\n`)
		stdout.write(`${"-".repeat(this.width)}\n`)

		const maxHeight = this.height - 2
		for (let movingIndex = index + 1; movingIndex < index + maxHeight; movingIndex++) {
			stdout.write(`${this.format(this.items[movingIndex] || "")}\n`)
		}

		stdout.moveCursor(0, -this.height)
		stdout.write(this.formatTop(this.inputNumber))
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

	protected format ( str: string | undefined ) {
		return str || ""
	}

	protected formatTop ( w: string | number ): string {
		return `w ${w}`
	}
}

class Conc extends Num {
	len: number
	private stdIndex: number = 0
	readonly allItems: string[]
	items: string[]

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

	draw (): void {
		stdout.write(STDOUT.HIDECURSOR)
		this.redraw()

		stdout.write(`${this.formatTop(this.stdIndex, this.index)}\n`)
		stdout.write(`${this.format(this.items[this.index])}\n`)
		stdout.write(`${"-".repeat(this.width)}\n`)

		const maxHeight = this.height - 2
		for (let movingIndex = this.index + 1; movingIndex < this.index + maxHeight; movingIndex++) {
			stdout.write(`${this.format(this.items[movingIndex])}\n`)
		}

		stdout.moveCursor(0, -this.height)
	}

	drawNum (): void {
		stdout.write(STDOUT.SHOWCURSOR)
		this.redraw()

		const tmpIndex = this.makeInputNumber()
		const index = tmpIndex ?? this.index

		stdout.write(`\n`)
		stdout.write(`${this.format(this.items[index]!)}\n`)
		stdout.write(`${"-".repeat(this.width)}\n`)

		const maxHeight = this.height - 2
		for (let movingIndex = index + 1; movingIndex < index + maxHeight; movingIndex++) {
			stdout.write(`${this.format(this.items[movingIndex] || "")}\n`)
		}

		stdout.moveCursor(0, -this.height)
		stdout.write(this.formatTop(this.stdIndex, this.inputNumber))
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

	protected format ( str: string | undefined ) {
		return str ? str.slice(0, stdout.columns) : ""
	}

	protected formatTop( w: string | number, c: string | number ): string {
		return `w ${w} c ${c}`
	}
}
