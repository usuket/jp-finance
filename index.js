const axios = require("axios")
const cheerio = require("cheerio");
const logger = require("pino")();
const sqlite3 = require('sqlite3')
const open = require("sqlite").open
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

// Example :https://kabutan.jp/stock/?code=6612
const MAX = 10000 // Japanese securities code max.
const INTERVAL = 500 // ms

async function main() {

	const db = await open({
		filename: 'sqlite3.db',
		driver: sqlite3.Database
	})

	const {last} = await db.get("select max(code) as last from companies")
	for (let i = last; i < MAX; i++) {
		const code = i;

		logger.info("try", code)
		const data = await fetch(code)
		await sleep(INTERVAL)
		const is_exists = checkCode(data.code, code)
		if (is_exists === 0) {
			logger.info(`No match code ${code}, ${is_exists}`)
		} else {
			logger.info(`Find company  ${code}, ${is_exists}`)
		}
		await db.run(
			'replace into companies (code, name, is_exists) values (?,?,?)',
			[code, data.name, is_exists]
		)
		logger.info(data)
	}
	db.close()
}

async function fetch(code) {
	const url = `https://kabutan.jp/stock/?code=${code}`
	const ret = await axios.get(url)
	return data = parse(ret.data)
}

function parse(html) {
	const $ = cheerio.load(html);
	return {
		code: $("h2").find("span").remove().html(),
		name: $("h2").removeClass("span").html()
	}
}

function checkCode(input1, input2) {
	if (input1 === null || input2 === null) return 0
	return Number.parseInt(input1) === Number.parseInt(input2) ? 1 : 0
}


main()
