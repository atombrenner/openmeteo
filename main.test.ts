import { describe, it, expect } from 'bun:test'
import { _parse } from './main'
import { loadBuffer, params } from './test-data/fetch-data'

const day = '2024-02-08'

const isParamFile = (file: string): file is keyof typeof params => file in params

const makeLocalTimeFn = (utc_offset: number) => (ts: number) =>
  new Date((ts + utc_offset) * 1000).toISOString().substring(0, 19).replace('T', ' ')

const round = (n: number) => +n.toFixed(1)
const hours = (d: number) => round(d / 3600)

const take7Rounded = (v: number[]) => v.slice(0, 7).map(round)

describe('parse flatbuffers response', () => {
  it.each(Object.keys(params))('should parse common parameters for %p params', (file) => {
    const buffer = loadBuffer(file, day)
    if (!isParamFile(file)) throw Error('invalid parameter set')
    const { latitude, longitude, elevation, utc_offset_seconds } = _parse(buffer, params[file])
    expect({ latitude, longitude, elevation, utc_offset_seconds }).toEqual({
      latitude: 49.86000061035156,
      longitude: 11.239999771118164,
      elevation: 450,
      utc_offset_seconds: 3600,
    })
  })

  it('should parse hourly time series', () => {
    const buffer = loadBuffer('hourly', day)
    const response = _parse(buffer, params.hourly)

    expect(response.daily).toBeUndefined()
    expect(response.current).toBeUndefined()

    const toLocalTime = makeLocalTimeFn(response.utc_offset_seconds)
    const { hourly } = response
    expect(hourly.time.length).toEqual(7 * 24)
    expect(toLocalTime(hourly.time[0])).toEqual(`${day} 00:00:00`)
    expect(toLocalTime(hourly.time[1])).toEqual(`${day} 01:00:00`)
    expect(toLocalTime(hourly.time[7 * 24 - 1])).toEqual(`2024-02-14 23:00:00`)

    const { temperature_2m, wind_speed_10m, apparent_temperature } = hourly

    expect(temperature_2m.length).toEqual(7 * 24)
    expect(take7Rounded(temperature_2m)).toEqual([2.3, 1.7, 3.7, 4.9, 4.3, 4.8, 5])
    expect(take7Rounded(wind_speed_10m)).toEqual([2.1, 0.5, 5.5, 9.7, 4.4, 8.6, 8])
    expect(take7Rounded(apparent_temperature)).toEqual([0.2, -0.3, 1.3, 2.2, 2.3, 2.2, 2.6])
  })

  it('should parse daily time series', () => {
    const buffer = loadBuffer('daily', day)
    const response = _parse(buffer, params.daily)

    expect(response.hourly).toBeUndefined()
    expect(response.current).toBeUndefined()

    const toLocalTime = makeLocalTimeFn(response.utc_offset_seconds)
    const { daily } = response
    expect(daily.time.length).toEqual(7)
    expect(toLocalTime(daily.time[0])).toEqual(`${day} 00:00:00`)
    expect(toLocalTime(daily.time[1])).toEqual(`2024-02-09 00:00:00`)
    expect(toLocalTime(daily.time[6])).toEqual(`2024-02-14 00:00:00`)

    const { temperature_2m_max, sunshine_duration, sunrise, sunset } = daily

    expect(temperature_2m_max.map(round)).toEqual([9.1, 10, 12.3, 7.6, 7.6, 5.9, 5.6])
    expect(sunshine_duration.map(hours)).toEqual([0, 0.2, 5.9, 0.2, 8.1, 1.7, 8.4])
    expect(sunrise.map(toLocalTime)).toEqual([
      '2024-02-08 07:38:05',
      '2024-02-09 07:36:25',
      '2024-02-10 07:34:44',
      '2024-02-11 07:33:01',
      '2024-02-12 07:31:16',
      '2024-02-13 07:29:30',
      '2024-02-14 07:27:43',
    ])
    expect(sunset.map(toLocalTime)).toEqual([
      '2024-02-08 17:20:11',
      '2024-02-09 17:21:55',
      '2024-02-10 17:23:39',
      '2024-02-11 17:25:23',
      '2024-02-12 17:27:07',
      '2024-02-13 17:28:51',
      '2024-02-14 17:30:35',
    ])
  })

  it('should parse current values', () => {
    const buffer = loadBuffer('current', '2024-02-08')
    const response = _parse(buffer, params.current)

    expect(response.hourly).toBeUndefined()
    expect(response.daily).toBeUndefined()

    const toLocalTime = makeLocalTimeFn(response.utc_offset_seconds)
    const { current } = response
    expect(toLocalTime(current.time)).toEqual(`2024-02-08 21:45:00`)

    expect(round(current.rain)).toEqual(0.3)
    expect(round(current.temperature_2m)).toEqual(8.5)
    expect(current.weather_code).toEqual(61)
  })
})
