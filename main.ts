import { ByteBuffer } from 'flatbuffers'
import { WeatherApiResponse } from '@openmeteo/sdk/weather-api-response'
import type { VariablesWithTime } from '@openmeteo/sdk/variables-with-time'

// see https://open-meteo.com/en/docs/dwd-api for a documentation of weather variables
// scraped from website with: $$('input[name=hourly]').filter(el => !el.value.endsWith('hPa')).map(el => `'${el.value}'`).sort().join('|')
export type HourlyVariable =
  | 'apparent_temperature'
  | 'cape'
  | 'cloud_cover'
  | 'cloud_cover_high'
  | 'cloud_cover_low'
  | 'cloud_cover_mid'
  | 'dew_point_2m'
  | 'diffuse_radiation'
  | 'diffuse_radiation_instant'
  | 'direct_normal_irradiance'
  | 'direct_normal_irradiance_instant'
  | 'direct_radiation'
  | 'direct_radiation_instant'
  | 'et0_fao_evapotranspiration'
  | 'evapotranspiration'
  | 'freezing_level_height'
  | 'global_tilted_irradiance'
  | 'global_tilted_irradiance_instant'
  | 'is_day'
  | 'lightning_potential'
  | 'precipitation'
  | 'pressure_msl'
  | 'rain'
  | 'relative_humidity_2m'
  | 'shortwave_radiation'
  | 'shortwave_radiation_instant'
  | 'showers'
  | 'snow_depth'
  | 'snowfall'
  | 'snowfall_height'
  | 'soil_moisture_0_to_1cm'
  | 'soil_moisture_1_to_3cm'
  | 'soil_moisture_27_to_81cm'
  | 'soil_moisture_3_to_9cm'
  | 'soil_moisture_9_to_27cm'
  | 'soil_temperature_0cm'
  | 'soil_temperature_18cm'
  | 'soil_temperature_54cm'
  | 'soil_temperature_6cm'
  | 'sunshine_duration'
  | 'surface_pressure'
  | 'temperature_120m'
  | 'temperature_180m'
  | 'temperature_2m'
  | 'temperature_80m'
  | 'terrestrial_radiation'
  | 'terrestrial_radiation_instant'
  | 'updraft'
  | 'vapour_pressure_deficit'
  | 'weather_code'
  | 'wind_direction_10m'
  | 'wind_direction_120m'
  | 'wind_direction_180m'
  | 'wind_direction_80m'
  | 'wind_gusts_10m'
  | 'wind_speed_10m'
  | 'wind_speed_120m'
  | 'wind_speed_180m'
  | 'wind_speed_80m'

// see https://open-meteo.com/en/docs/dwd-api for a documentation of weather variables
// scraped from website with: $$('input[name=daily]').map(el => `'${el.value}'`).sort().join('|')
export type DailyVariable =
  | 'apparent_temperature_max'
  | 'apparent_temperature_min'
  | 'daylight_duration'
  | 'et0_fao_evapotranspiration'
  | 'precipitation_hours'
  | 'precipitation_probability_max'
  | 'precipitation_sum'
  | 'rain_sum'
  | 'shortwave_radiation_sum'
  | 'showers_sum'
  | 'snowfall_sum'
  | 'sunrise'
  | 'sunset'
  | 'sunshine_duration'
  | 'temperature_2m_max'
  | 'temperature_2m_min'
  | 'weather_code'
  | 'wind_direction_10m_dominant'
  | 'wind_gusts_10m_max'
  | 'wind_speed_10m_max'

// see https://open-meteo.com/en/docs/dwd-api for a documentation of weather variables
// scraped from website with: $$('input[name=current]').map(el => `'${el.value}'`).sort().join('|')
export type CurrentVariable =
  | 'apparent_temperature'
  | 'cloud_cover'
  | 'is_day'
  | 'precipitation'
  | 'pressure_msl'
  | 'rain'
  | 'relative_humidity_2m'
  | 'showers'
  | 'snowfall'
  | 'surface_pressure'
  | 'temperature_2m'
  | 'weather_code'
  | 'wind_direction_10m'
  | 'wind_gusts_10m'
  | 'wind_speed_10m'

export interface WeatherDataParams<
  H extends HourlyVariable = HourlyVariable,
  D extends DailyVariable = DailyVariable,
  C extends CurrentVariable = CurrentVariable,
> {
  latitude: number
  longitude: number
  elevation?: number
  timezone?: string // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  forecast_days?: number // 0-10, default 7
  past_days?: number // 0 - 92, default 0
  cell_selection?: 'land' | 'sea' | 'nearest'
  temperature_unit?: 'celsius' | 'fahrenheit'
  wind_speed_unit?: 'kmh' | 'ms' | 'mph' | 'kn'
  precipitation_unit?: 'mm' | 'inch'
  hourly?: readonly H[]
  daily?: readonly D[]
  current?: readonly C[]
}

// helper to infer type from object literal
export const weatherDataParams = <
  // assigning never as default type makes infer work with optional params
  H extends HourlyVariable = never,
  D extends DailyVariable = never,
  C extends CurrentVariable = never,
>(
  params: WeatherDataParams<H, D, C>,
) => params

export type RecordWithTime<T extends string, V> = Record<T | 'time', V>
export type TimeSeries<T extends string> = RecordWithTime<T, number[]>
export type Current<T extends string> = RecordWithTime<T, number>
export type Optional<T> = [T] extends [never] ? never : T

export interface WeatherData<
  H extends HourlyVariable = never,
  D extends DailyVariable = never,
  C extends CurrentVariable = never,
> {
  latitude: number
  longitude: number
  elevation: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  hourly: Optional<TimeSeries<H>>
  daily: Optional<TimeSeries<D>>
  current: Optional<Current<C>>
}

export class RetryableWeatherDataError extends Error {
  constructor(msg: string, cause?: unknown) {
    super(msg, { cause })
  }
}

export const fetchWeatherData = async <
  // assigning never as default type makes infer work with optional params
  H extends HourlyVariable = never,
  D extends DailyVariable = never,
  C extends CurrentVariable = never,
>(
  params: WeatherDataParams<H, D, C>,
  api = 'https://api.open-meteo.com/v1/forecast',
): Promise<WeatherData<H, D, C>> => _parse(await _fetch(params, api), params)

export const _fetch = async <
  // assigning never as default type makes infer work with optional params
  H extends HourlyVariable = never,
  D extends DailyVariable = never,
  C extends CurrentVariable = never,
>(
  params: WeatherDataParams<H, D, C>,
  api: string,
) => {
  const searchParams = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, `${v}`] as [string, string]),
  )
  searchParams.set('format', 'flatbuffers')
  const url = `${api}?${searchParams}`
  let response: Response
  try {
    response = await fetch(url)
  } catch (err) {
    throw new RetryableWeatherDataError('fetch error', err)
  }
  const { status } = response
  if (status >= 400 && status < 500) {
    const json = await response.json()
    const reason = json && typeof json === 'object' && 'reason' in json ? json.reason : 'unknown'
    throw Error(`${reason}`)
  }
  if (status !== 200) throw new RetryableWeatherDataError(`received unexpected status ${status}`)

  return new Uint8Array(await response.arrayBuffer())
}

export const _parse = <
  H extends HourlyVariable,
  D extends DailyVariable,
  C extends CurrentVariable,
>(
  buffer: Uint8Array,
  params: WeatherDataParams<H, D, C>,
): WeatherData<H, D, C> => {
  const bb = new ByteBuffer(buffer)
  const r = WeatherApiResponse.getSizePrefixedRootAsWeatherApiResponse(bb)
  const result = {
    latitude: r.latitude(),
    longitude: r.longitude(),
    elevation: r.elevation(),
    utc_offset_seconds: r.utcOffsetSeconds(),
    timezone: r.timezone(),
    timezone_abbreviation: r.timezoneAbbreviation(),
  } as unknown as WeatherData<H, D, C>

  const hourly = r.hourly()
  if (hourly && params.hourly) {
    result.hourly = _parseTimeSeries(hourly, params.hourly)
  }

  const daily = r.daily()
  if (daily && params.daily) {
    result.daily = _parseTimeSeries(daily, params.daily)
  }

  const current = r.current()
  if (current && params.current) {
    const c = {} as Current<C>
    c.time = Number(current.time())
    params.current.forEach((name, i) => {
      c[name] = current.variables(i)?.value() ?? NaN
    })
    result.current = c as Optional<Current<C>>
  }
  return result
}

export const _parseTimeSeries = <T extends string>(
  ts: VariablesWithTime,
  params: readonly T[],
): Optional<TimeSeries<T>> => {
  const timeStart = Number(ts.time())
  const timeEnd = Number(ts.timeEnd())
  const interval = Number(ts.interval())
  const length = { length: (timeEnd - timeStart) / interval }

  const getTimestamp = (i: number, j: number) => Number(ts.variables(i)?.valuesInt64(j))
  const getValue = (i: number, j: number) => ts.variables(i)?.values(j) ?? NaN

  const result = {} as TimeSeries<T>
  result.time = Array.from(length, (_, i) => timeStart + i * interval)
  params.forEach((name, i) => {
    const getNumber = ['sunrise', 'sunset'].includes(name) ? getTimestamp : getValue
    result[name] = Array.from(length, (_, j) => getNumber(i, j))
  })
  return result as Optional<TimeSeries<T>>
}
