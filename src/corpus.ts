import uFuzzy from "@leeoniya/ufuzzy"
import { italic, magenta, cyan as teal, yellow, blue } from "kleur/colors"
import { readFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { stdin, stdout } from "node:process"
import { sanitize } from "./init/rank.js"
import { escapeRegex, STDIN, STDOUT } from "./_utils.js"
import { cleanupZip, doUnzip } from "./_zip.js"

export default async function corpus ( initPath: string ) {
	const initDir = await doUnzip(initPath)

	const wordRank = joinPath(initDir, "messages.word-rank.txt")
	const wordRankTxt = await readFile(wordRank)
	const wordRankLines = wordRankTxt.toString().split(/\r?\n/g)

	const text = joinPath(initDir, "messages.txt")
	const textTxt = await readFile(text)
	const textLines = textTxt.toString().split(/\r?\n/g)

	await cleanupZip()
	await initStuff(wordRankLines, textLines)
	stdin.destroy()
}

const enum MODE {
	WORDRANK = "WORDRANK",
	CONCORDANCER = "CONCORDANCER",
	WORDFILTER = "WORDFILTER",
	WORDPAIRS = "WORDPAIRS",
}

async function initStuff ( rankedWords: string[], textLines: string[] ) {
	stdin.on("data", ( data ) => {
		if (encodeURIComponent(data.toString()) === STDIN.CTRL_C) {
			exitProgram()
		}
	})

	let mode: MODE = MODE.WORDRANK
	const wordRank = new WordRank(rankedWords)
	const concordancer = new Concordancer(textLines)
	const wordFilter = new WordFilter(rankedWords)
	const wordPairs = new WordPairs(textLines)

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
					const tmpMode = wordFilter.data(encodedData, [ wordRank, wordPairs ])
					if (tmpMode) mode = tmpMode
					break
				}
				case MODE.WORDPAIRS: {
					const tmpMode = wordPairs.data(encodedData, [ wordRank, wordFilter ])
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

	protected abstract readonly allItems: unknown[]
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
			case "q": {
				exitProgram()
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
			case STDIN.ESCAPE: {
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
			case STDIN.DOWN: {
				const tmpIndex = this.makeIndex()
				if (tmpIndex !== null) this.index = tmpIndex

				this.add(1)
				this.draw()
				break
			}
			case STDIN.UP: {
				const tmpIndex = this.makeIndex()
				if (tmpIndex !== null) this.index = tmpIndex

				this.sub(1)
				this.draw()
				break
			}
			case STDIN.ENTER: {
				const tmpIndex = this.makeIndex()
				if (tmpIndex !== null) this.index = tmpIndex

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

	private makeIndex (): number | null {
		if (!this.inputNumber.length) return null
		const tmpNumber = this.makeInputNumber()

		this.inputNumber = ""
		this.isNum = false

		return tmpNumber
	}

	private makeInputNumber (): number | null {
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

	protected abstract formatLine ( item: Item | undefined ): string
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

	protected formatLine ( item: [ string, string ] | undefined ) {
		return item ? `${item[0]} "${item[1]}"` : ""
	}

	protected formatIndex ( index: string | number ): string {
		return `${italic("w")} ${index}`
	}

	protected formatMode = `< ${yellow("filter")} | ${teal("- word -")} | ${magenta("concordances")} >\n`
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
			case STDIN.ESCAPE: {
				return wordRank.init()
			}
		}
	}

	private filter ( word: string ) {
		const regex = new RegExp(` ${escapeRegex(word)} `, "ig")
		const items = this.allItems.filter(( line ) => regex.test(line))
		return items
	}

	protected formatLine ( item: string | undefined ) {
		return item ? item.slice(0, stdout.columns) : ""
	}

	protected formatIndex ( index: string | number ): string {
		return `${italic("w")} ${this.stdIndex} ${italic("c")} ${index}`
	}

	protected formatMode = `< ${teal("word")} | ${magenta("- concordances -")} | >\n`
}

class WordFilter extends TerminalLines <[ string, string ], [ WordRank, WordPairs ]> {
	protected readonly allItems: [ string, string ][]
	protected items: [ string, string ][]
	protected len: number

	private stdIndex: number = 0
	private word: string = ""

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
		this.word = word

		this.index = 0
		this.draw()
		return MODE.WORDFILTER
	}

	protected stringData ( data: string, [ wordRank, wordPairs ]: [ WordRank, WordPairs ]): void | MODE {
		switch (data) {
			case STDIN.RIGHT:
			case STDIN.ESCAPE: {
				return wordRank.init()
			}
			case STDIN.LEFT: {
				return wordPairs.init(this.word, this.stdIndex)
			}
		}
	}

	private fuzzy ( word: string, stdIndex: number ) {
		const uf = new uFuzzy({ intraMode: 1 })
		const idx = uf.filter(this.allItems.map(([, w ]) => w), word) || [ stdIndex ]
		const items = idx.map(( i ) => this.allItems[i]!)

		return items
	}

	protected formatLine ( item: [ string, string ] | undefined ): string {
		return item ? `${item[0]} "${item[1]}"` : ""
	}

	protected formatIndex ( index: string | number ): string {
		return `${italic("w")} ${this.stdIndex} ${italic("f")} ${index}`
	}

	protected formatMode = `< ${blue("pairs")} | ${yellow("- filter -")} | ${teal("word")} >\n`
}

class WordPairs extends TerminalLines <[ number, string ], [ WordRank, WordFilter ]> {
	protected readonly allItems: string[][]
	protected items: [ number, string ][]
	protected len: number

	private stdIndex: number = 0
	private word: string = ""

	constructor ( textLines: string[] ) {
		super()

		this.allItems = textLines.map(( line ) => sanitize(line.toLowerCase())).map(( line ) => line.trim().split(/ +/g))

		this.items = []
		this.len = 0
	}

	init ( word: string, stdIndex: number ) {
		const items = this.sort(word)
		this.items = items
		this.len = items.length

		this.stdIndex = stdIndex
		this.word = word

		this.index = 0
		this.draw()
		return MODE.WORDPAIRS
	}

	protected stringData ( data: string, [ wordRank, wordFilter ]: [ WordRank, WordFilter ]): void | MODE {
		switch (data) {
			case STDIN.ESCAPE: {
				return wordRank.init()
			}
			case STDIN.RIGHT: {
				return wordFilter.init(this.word, this.stdIndex)
			}
		}
	}

	private sort ( word: string ): [ number, string ][] {
		// todo make adjustable
		const maxLen = 2

		const allMatch = this.allItems.filter(( line ) => line.length > maxLen).filter(( line ) => line.includes(word))
		const allPairs = allMatch.flatMap(( line ) => this.pair(word, line, maxLen))

		const pairsMap = new Map<string, number>
		allPairs.forEach(( pair ) => pairsMap.has(pair) ? pairsMap.set(pair, pairsMap.get(pair)! + 1) : pairsMap.set(pair, 1))

		const sortPairs = allPairs
			.filter(( el, i, arr ) => arr.indexOf(el) === i)
			.map<[ number, string ]>(( pair ) => ([ pairsMap.get(pair)!, pair ]))
			.sort(([ a ], [ b ]) => b - a)

		return sortPairs
	}

	private pair ( word: string, line: string[], maxLen: number ) {
		if (line.length === maxLen) return line

		const offset = maxLen - 1
		const wordIndex = line.indexOf(word)!

		const min = Math.max(0, wordIndex - offset)
		const max = Math.min(line.length - 1, wordIndex + offset)

		const slices = []
		for (let i = min; i < max; i++) {
			const slice = line.slice(i, i + maxLen)
			slices.push(slice.join(" "))
		}

		return slices
	}

	protected formatLine ( item: [ number, string ] | undefined ): string {
		const item0 = this.items[0]
		if (!item0) return ""

		const max = item0[0].toString().length
		return item ? `${item[0].toString().padStart(max, "0")} [ ${item[1]} ]` : ""
	}

	protected formatIndex ( index: string | number ): string {
		return `${italic("w")} ${this.stdIndex} ${italic("p")} ${index}`
	}

	protected formatMode: string = `< | ${blue("- pairs -")} | ${yellow("filter")} >\n`
}

function splitWordRank ( wordRank: string[] ): [ string, string ][] {
	const filter = wordRank.filter(( line ) => /^(\d+) \"(.+)\"$/.test(line))
	const split = filter.map(( line ) => [ .../^(\d+) \"(.+)\"$/.exec(line)! ].slice(1, 3) as [ string, string ])
	return split
}

function exitProgram () {
	stdout.write("\n")
	stdout.write(STDOUT.SHOWCURSOR)

	stdout.moveCursor(0, -9)
	stdout.cursorTo(0)
	stdout.clearScreenDown()

	process.exit()
}
