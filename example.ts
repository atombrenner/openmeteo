import { fetchWeatherData, weatherDataParams } from './main'

async function example1() {
  console.log('\nexample 1\n=========')

  // type of data is inferred from type of given weather data params
  const data = await fetchWeatherData({
    latitude: 49.0699764,
    longitude: 11.614277,
    timezone: 'Europe/Berlin',
    forecast_days: 3,
    hourly: ['temperature_2m', 'rain' /* 'cloud_cover' */],
    daily: ['temperature_2m_max'],
  })
  // only requested params can be accessed and are suggested by autocompletion
  const rain0 = data.hourly.rain[0]
  const firstHour = data.hourly.time[0] // time is always present if at least one variable was requested
  // const cover = data.hourly.cloud_cover[0] // TS Error: Property 'cloud_cover' does not exist on type 'TimeSeries<"temperature_2m" | "rain">'
  const tempMax = data.daily.temperature_2m_max[0] // typescript error
  // const currentTemp = data.current.temperature_2m[0] // TS Error: Property 'temperature_2m' does not exist on type never

  console.log({ rain0, firstHour: new Date(firstHour * 1000), tempMax })
}

// type inference also works if you construct the params
async function example2() {
  console.log('\nExample 2\n=========')

  const hourly = ['temperature_2m'] as const // as const is necessary to infer the type later
  const params = weatherDataParams({
    hourly,
    current: ['wind_speed_10m'],
    latitude: 49.0699764,
    longitude: 11.614277,
    timezone: 'Europe/Berlin',
    forecast_days: 3,
  })
  const data = await fetchWeatherData(params)
  const temperature = data.hourly.temperature_2m
  // const err = data.hourly.cloud_cover_high[0] // type error
  const current_wind_speed = data.current.wind_speed_10m

  console.log({ temperature, current_wind_speed })
}

async function example3() {
  console.log('\nExample 3\n=========')
  const params = weatherDataParams({
    latitude: 49.0699764,
    longitude: 11.614277,
    timezone: 'Europe/Berlin',
    forecast_days: 3,
    daily: ['sunshine_duration', 'sunrise', 'sunset'],
  })

  const data = await fetchWeatherData(params)

  // durations and timestamps are stored in seconds
  // timestamps are always UTC
  // to convert a timestamp a Date object we need to multiply it with 1000 first
  // and add utc_offset_seconds if we want to convert it to an UTC timestamp
  const { time, sunshine_duration, sunrise, sunset } = data.daily

  const localTime = (ts: number) =>
    new Date((ts + data.utc_offset_seconds) * 1000).toISOString().substring(0, 19).replace('T', ' ')

  console.log('sunshine duration in hours:', Math.round(sunshine_duration[0] / 3600))
  console.log('time:', localTime(time[0]))
  console.log('sunrise:', localTime(sunrise[0]))
  console.log('sunset', localTime(sunset[0]))
  console.log('utc offset in seconds:', data.utc_offset_seconds)
}

example1().then(example2).then(example3).catch(console.error)
