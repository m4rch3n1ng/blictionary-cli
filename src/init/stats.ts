import type { message } from "./collect.js"

export function getStats ( messagesJson: message[], messagesTxt: string ) {
	return {
		total: messagesJson.length,
		halfway: halfway(messagesJson),
		milestones: milestones(messagesJson),
		capital: capital(messagesTxt)
	}
}

function halfway ( messagesJson: message[] ) {
	const total = messagesJson.length
	const halfIndex = Math.floor(total / 2)
	const halfway = messagesJson[halfIndex]!
	return halfway.date
}

function milestones ( messagesJson: message[] ) {
	const min = 1000
	const max = messagesJson.length
	const all = []

	let curr = min
	while (curr <= max) {
		all.push(curr)
		curr *= 10
	}

	return Object.fromEntries(all.map(( i ) => [ i.toLocaleString("en-US").replace(/,/g, "_"), messagesJson[i - 1]!.date ]))
}

function capital ( messagesTxt: string ) {
	const lines = messagesTxt.split(/\r?\n/g)

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

	return {
		"%": `${(uppercase / lowercase * 100).toFixed(2)}%`,
		uppercase,
		lowercase
	}
}
