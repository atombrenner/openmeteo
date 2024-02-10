// small script for fetching flatbuffers to write unit tests against, sort of snapshot testing

import { writeFileSync } from 'node:fs'
import { _fetch } from '../main'
import { makeFilePath, params } from './params'

const api = 'https://api.open-meteo.com/v1/forecast'

const date = new Date().toISOString().substring(0, 10)

async function main() {
  for (const [file, weatherDataParams] of Object.entries(params)) {
    writeFileSync(makeFilePath(file, date), await _fetch(weatherDataParams, api))
  }
}

main().catch(console.error)
