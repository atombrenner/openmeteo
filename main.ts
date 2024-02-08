import { ByteBuffer } from 'flatbuffers'
import { WeatherApiResponse } from '@openmeteo/sdk/weather-api-response'
import type { VariablesWithTime } from '@openmeteo/sdk/variables-with-time'

// see https://open-meteo.com/en/docs/dwd-api for a documentation of weather variables
export type HourlyVariable =
  | 'temperature_2m'
  | 'temperature_80m'
  | 'temperature_120m'
  | 'temperature_180m'
  | 'relative_humidity_2m'
  | 'dew_point_2m'
  | 'apparent_temperature'
  | 'pressure_mslsurface_pressure'
  | 'cloud_cover'
  | 'cloud_cover_low'
  | 'cloud_cover_mid'
  | 'cloud_cover_high'
  | 'wind_speed_10m'
  | 'wind_speed_80m'
  | 'wind_speed_120m'
  | 'wind_speed_180m'
  | 'wind_direction_10m'
  | 'wind_direction_80m'
  | 'wind_direction_120m'
  | 'wind_direction_180m'
  | 'wind_gusts_10m'
  | 'shortwave_radiation'
  | 'direct_radiationdirect_normal_irradiance'
  | 'diffuse_radiation'
  | 'vapour_pressure_deficit'
  | 'cape'
  | 'evapotranspiration'
  | 'et0_fao_evapotranspiration'
  | 'precipitation'
  | 'snowfall'
  | 'precipitation_probability'
  | 'rain'
  | 'showers'
  | 'weather_code'
  | 'snow_depth'
  | 'freezing_level_height'
  | 'visibility'
  | 'soil_temperature_0cm'
  | 'soil_temperature_6cm'
  | 'soil_temperature_18cm'
  | 'soil_temperature_54cm'
  | 'soil_moisture_0_to_1cm'
  | 'soil_moisture_1_to_3cm'
  | 'soil_moisture_3_to_9cm'
  | 'soil_moisture_9_to_27cm'
  | 'soil_moisture_27_to_81cm'
  | 'is_day'

export type DailyVariable =
  | 'temperature_2m_max' // °C Maximum  daily air temperature at 2 meters above ground
  | 'temperature_2m_min' // °C 	Minimum daily air temperature at 2 meters above ground
  | 'apparent_temperature_max' //
  | 'apparent_temperature_min' // 	°C  	Maximum and minimum daily apparent temperature
  | 'precipitation_sum' // 	mm 	Sum of daily precipitation (including rain, showers and snowfall)
  | 'rain_sum' // 	mm 	Sum of daily rain
  | 'showers_sum' // 	mm 	Sum of daily showers
  | 'snowfall_sum' // 	cm 	Sum of daily snowfall
  | 'precipitation_hours' // 	hours 	The number of hours with rain
  | 'weather_code' // 	WMO code 	The most severe weather condition on a given day
  | 'sunrise' //
  | 'sunset' // 	iso8601 	Sun rise and set times
  | 'sunshine_duration' // 	seconds 	The number of seconds of sunshine per day is determined by calculating direct normalized irradiance exceeding 120 W/m², following the WMO definition. Sunshine duration will consistently be less than daylight duration due to dawn and dusk.
  | 'daylight_duration' // 	seconds 	Number of seconds of daylight per day
  | 'wind_speed_10m_max' //
  | 'wind_gusts_10m_max' // 	km/h  	Maximum wind speed and gusts on a day
  | 'wind_direction_10m_dominant' // 	° 	Dominant wind direction
  | 'shortwave_radiation_sum' // 	MJ/m² 	The sum of solar radiation on a given day in Megajoules
  | 'et0_fao_evapotranspiration' // 	mm 	Daily sum of ET₀ Reference Evapotranspiration of a well watered grass field

export type CurrentVariable =
  | 'temperature_2m'
  | 'relative_humidity_2m'
  | 'apparent_temperature'
  | 'is_day'
  | 'precipitation'
  | 'rain'
  | 'showers'
  | 'snowfall'
  | 'weather_code'
  | 'cloud_cover'
  | 'pressure_msl'
  | 'surface_pressure'
  | 'wind_speed_10m'
  | 'wind_direction_10m'
  | 'wind_gusts_10m'

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
export type Optional<T, V> = [T] extends [never] ? never : V

export interface WeatherData<
  H extends HourlyVariable = never,
  D extends DailyVariable = never,
  C extends CurrentVariable = never,
> {
  latitude: number
  longitude: number
  elevation: number
  utc_offset_seconds: number
  hourly: Optional<H, TimeSeries<H>>
  daily: Optional<D, TimeSeries<D>>
  current: Optional<C, Current<C>>
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
  const searchParams = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, `${v}`]))
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

    // TODO: should we include this in the response? they are only set if a timezone was set
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
    result.current = c as Optional<C, Current<C>>
  }
  return result
}

export const _parseTimeSeries = <T extends string>(
  ts: VariablesWithTime,
  params: readonly T[],
): Optional<T, TimeSeries<T>> => {
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
  return result as Optional<T, TimeSeries<T>>
}
