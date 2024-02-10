import { readFileSync } from 'node:fs'
import { weatherDataParams } from '../main'

export const makeFilePath = (file: string, date: string) => `test-data/${file}_${date}.fb`

export const loadBuffer = (file: string, date: string) =>
  new Uint8Array(readFileSync(makeFilePath(file, date)))

const commonParams = {
  latitude: 49.867,
  longitude: 11.234,
  timezone: 'Europe/Berlin',
  forecast_days: 7,
}

export const params = {
  hourly: weatherDataParams({
    ...commonParams,
    hourly: ['apparent_temperature', 'wind_speed_10m', 'temperature_2m', 'temperature_120m'],
  }),
  daily: weatherDataParams({
    ...commonParams,
    daily: ['temperature_2m_max', 'sunshine_duration', 'sunrise', 'sunset'],
  }),
  current: weatherDataParams({
    ...commonParams,
    current: ['temperature_2m', 'weather_code', 'rain'],
  }),
  everything: weatherDataParams({
    ...commonParams,
    hourly: ['temperature_2m', 'wind_speed_10m', 'wind_direction_10m', 'rain'],
    daily: ['temperature_2m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant', 'rain_sum'],
    current: ['temperature_2m', 'wind_speed_10m', 'wind_direction_10m', 'rain'],
  }),
}
