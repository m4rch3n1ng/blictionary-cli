import uFuzzy from "@leeoniya/ufuzzy"
import { readFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { stdin, stdout } from "node:process"
import { escapeRegex, STDIN, STDOUT } from "./_utils.js"

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

const enum MODE {
	WORDRANK = "WORDRANK",
	CONCORDANCER = "CONCORDANCER",
	WORDFILTER = "WORDFILTER",
}

async function initStuff ( rankedWords: string[], textLines: string[] ) {
	stdin.on("data", ( data ) => {
		if (encodeURIComponent(data.toString()) === "%03") {
			stdout.write("\n")
			stdout.write(STDOUT.SHOWCURSOR)

			stdout.moveCursor(0, -9)
			stdout.cursorTo(0)
			stdout.clearScreenDown()

			process.exit()
		}
	})

	let mode: MODE = MODE.WORDRANK
	const wordRank = new WordRank(rankedWords)
	const concordancer = new Concordancer(textLines)
	const wordFilter = new WordFilter(rankedWords)

	stdin.setRawMode(true)
	return new Promise(( _resolve ) => {
		wordRank.draw(true)
		stdin.on("data", ( rawData ) => {
			const encodedData = encodeURIComponent(rawData.toString())

			switch (mode) {
				case MODE.WORDRANK: {
					const tmpMode = wordRank.data(encodedData, [ concordancer, wordFilter ])
					if (tmpMode) mode = tmpMode
					break
				}
				case MODE.CONCORDANCER: {
					const tmpMode = concordancer.data(encodedData, [ wordRank ])
					if (tmpMode) mode = tmpMode
					break
				}
				case MODE.WORDFILTER: {
					const tmpMode = wordFilter.data(encodedData, [ wordRank ])
					if (tmpMode) mode = tmpMode
					break
				}
			}

		})
	})
}


abstract class TerminalLines <Item, Pages> {
	protected index: number = 0
	protected isNum: boolean = false

	protected abstract readonly allItems: Item[]
	protected abstract items: Item[]
	protected abstract len: number

	private readonly ambientHeight = 4
	private readonly elementHeight = 10
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

	data ( data: string, pages: Pages ) {
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
			default: {
				return this.stringData(data, pages)
			}
		}
			
	}

	protected abstract stringData ( data: string, pages: Pages ): void | MODE

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
			case STDIN.BACKSPACE: {
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
			stdout.write(`${this.formatLine(this.items[movingIndex])}\n`)
		}

		stdout.moveCursor(0, -(this.ambientHeight + this.elementHeight))
		stdout.write(this.formatMode)
		stdout.write(this.formatIndex(this.inputNumber))
	}

	protected abstract formatLine ( str: Item | undefined ): string
	protected abstract formatIndex ( index: string | number ): string
	protected abstract formatMode: string
}


class WordRank extends TerminalLines <[ string, string ], [ Concordancer, WordFilter ]> {
	protected readonly allItems: [ string, string ][]
	protected items: [ string, string ][]
	protected len: number

	constructor ( rankedWords: string[] ) {
		super()
		const items = splitWordRank(rankedWords)

		this.allItems = items
		this.items = items
		this.len = items.length
	}

	init () {
		this.draw()
		return MODE.WORDRANK
	}

	protected stringData ( data: string, [ concordancer, wordFilter ]: [ Concordancer, WordFilter ]): void | MODE {
		switch (data) {
			case STDIN.RIGHT: {
				const [ , currentWord ] = this.items[this.index]!
				return concordancer.init(currentWord, this.index)
			}
			case STDIN.LEFT: {
				const [ , currentWord ] = this.items[this.index]!
				return wordFilter.init(currentWord, this.index)
			}
		}
	}

	protected formatLine ( str: [ string, string ] | undefined ) {
		return str ? `${str[0]} "${str[1]}"` : ""
	}

	protected formatIndex ( index: string | number ): string {
		return `${STDOUT.ITALIC}w${STDOUT.RESET} ${index}`
	}

	protected formatMode = `${STDOUT.TEAL}-- words --${STDOUT.RESET}\n`
}

class Concordancer extends TerminalLines <string, [ WordRank ]> {
	protected readonly allItems: string[]
	protected items: string[]
	protected len: number
	private stdIndex: number = 0

	constructor ( textLines: string[] ) {
		super()
		this.allItems = textLines
		this.items = textLines
		this.len = textLines.length
	}

	init ( word: string, stdIndex: number ): MODE {
		const items = this.filter(word)
		this.items = items
		this.len = items.length

		this.stdIndex = stdIndex

		this.index = 0
		this.draw()
		return MODE.CONCORDANCER
	}

	protected stringData ( data: string, [ wordRank ]: [ WordRank ]): void | MODE {
		switch (data) {
			case STDIN.LEFT:
			case STDIN.ESC: {
				return wordRank.init()
			}
		}
	}

	private filter ( word: string ) {
		const regex = new RegExp(` ${escapeRegex(word)} `, "ig")
		const items = this.allItems.filter(( line ) => regex.test(line))
		return items
	}

	protected formatLine ( str: string | undefined ) {
		return str ? str.slice(0, stdout.columns) : ""
	}

	protected formatIndex ( index: string | number ): string {
		return `${STDOUT.ITALIC}w${STDOUT.RESET} ${this.stdIndex} ${STDOUT.ITALIC}c${STDOUT.RESET} ${index}`
	}

	protected formatMode = `${STDOUT.MAGENTA}-- concordances --${STDOUT.RESET}\n`
}

class WordFilter extends TerminalLines <[ string, string ], [ WordRank ]> {
	protected readonly allItems: [ string, string ][]
	protected items: [ string, string ][]
	protected len: number
	private stdIndex: number = 0

	constructor ( rankedWords: string[] ) {
		super()
		const items = splitWordRank(rankedWords)
		this.allItems = items
		this.items = items
		this.len = items.length
	}

	init ( word: string, stdIndex: number ): MODE {
		const items = this.fuzzy(word, stdIndex)
		this.items = items
		this.len = items.length
		this.stdIndex = stdIndex

		this.index = 0
		this.draw()
		return MODE.WORDFILTER
	}

	protected stringData ( data: string, [ wordRank ]: [ WordRank ]): void | MODE {
		switch (data) {
			case STDIN.RIGHT:
			case STDIN.ESC: {
				return wordRank.init()
			}
		}
	}

	private fuzzy ( word: string, stdIndex: number ) {
		const uf = new uFuzzy({ intraMode: 1 })
		const idx = uf.filter(this.allItems.map(([, w ]) => w), word) || [ stdIndex ]
		const items = idx.map(( i ) => this.allItems[i]!)

		return items
	}

	protected formatIndex ( index: string | number ): string {
		return `${STDOUT.ITALIC}w${STDOUT.RESET} ${this.stdIndex} ${STDOUT.ITALIC}f${STDOUT.RESET} ${index}`
	}

	protected formatLine ( str: [ string, string ] | undefined ): string {
		return str ? `${str[0]} "${str[1]}"` : ""
	}

	protected formatMode = `${STDOUT.YELLOW}-- filter --${STDOUT.RESET}\n`
}

function splitWordRank ( wordRank: string[] ): [ string, string ][] {
	const filter = wordRank.filter(( line ) => /^(\d+) \"(.+)\"$/.test(line))
	const split = filter.map(( line ) => [ .../^(\d+) \"(.+)\"$/.exec(line)! ].slice(1, 3) as [ string, string ])
	return split
}
