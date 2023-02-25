export function getStats ( messagesTxt: string ) {
	return {
		capital: capital(messagesTxt)
	}
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
		uppercase,
		lowercase
	}
}
