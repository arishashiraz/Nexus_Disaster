import { useState } from 'react';
import { useLiveFeed } from '../services/useLiveFeed';
import {
  CloudSun,
  RefreshCw,
  Wind,
  Droplets,
  MapPin,
  Radio,
  ExternalLink,
  LocateFixed,
  Thermometer,
} from 'lucide-react';
import regions from '../../../shared/india-regions.json';
import { date, Field, Select, Form, Empty } from '../components/UI';
import IncidentMap from '../components/IncidentMap';

const weatherText = (code) =>
  ({
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snowfall',
    73: 'Snowfall',
    75: 'Heavy snowfall',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with hail',
  })[code] || 'Weather conditions';
const sourceTime = (seconds) =>
  seconds ? date(new Date(seconds * 1000).toISOString()) : 'Not available';
function SourceStatus({ feed }) {
  return (
    <span className={`feed-status ${(feed?.status || 'loading').toLowerCase()}`}>
      <i />
      {feed?.status === 'AVAILABLE'
        ? 'Source connected'
        : feed?.status === 'STALE'
          ? 'Last-known data'
          : feed?.status === 'UNAVAILABLE'
            ? feed?.retryAt
              ? 'Provider rate limited'
              : 'Source unavailable'
            : 'Connecting…'}
    </span>
  );
}
export default function LiveIndia() {
  const [state, setState] = useState('DL');
  const [point, setPoint] = useState(null);
  const selected = regions.find((r) => r.code === state);
  const query = new URLSearchParams({ stateCode: state });
  if (point) {
    query.set('latitude', point[0]);
    query.set('longitude', point[1]);
  }
  const weatherFeed = useLiveFeed('/live/weather?' + query, 600000);
  const airFeed = useLiveFeed('/live/air-quality?' + query, 600000);
  const quakeFeed = useLiveFeed('/live/earthquakes', 300000);
  const { data: weather, busy: weatherBusy } = weatherFeed;
  const { data: air, busy: airBusy } = airFeed;
  const { data: quakes, busy: quakeBusy } = quakeFeed;
  const busy = weatherBusy || airBusy || quakeBusy;
  const pollution = air?.data?.current;
  const current = weather?.data?.current,
    daily = weather?.data?.daily;
  return (
    <div className="live-india">
      <div className="page-heading">
        <div>
          <div className="eyebrow green">NEXUS INDIA / LIVE CONTEXT</div>
          <h1>A wider view. A better response.</h1>
          <p>Weather, air quality and recent earthquakes, with sources and timestamps.</p>
        </div>
        <button
          className="button light"
          disabled={busy}
          onClick={() => {
            weatherFeed.refresh();
            airFeed.refresh();
            quakeFeed.refresh();
          }}
        >
          <RefreshCw size={16} className={busy ? 'spin' : ''} />
          Refresh feeds
        </button>
      </div>
      <div className="india-banner">
        <div>
          <span className="eyebrow">CONNECTED ACROSS INDIA</span>
          <h2>One network. Every state.</h2>
          <p>
            Choose any state or union territory. Explore a sample location or enter exact
            coordinates.
          </p>
        </div>
        <div className="coverage-number">
          <b>28</b>
          <span>states</span>
          <b>8</b>
          <span>union territories</span>
        </div>
      </div>
      <section className="panel padded">
        <div className="location-controls">
          <Select
            label="State / union territory"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPoint(null);
            }}
            values={regions.map((r) => ({ value: r.code, label: r.name }))}
          />
          <div>
            <strong>
              <MapPin size={16} /> {point ? 'Custom point' : selected.sampleLocation}
            </strong>
            <p className="muted">A sample point is not a statewide average.</p>
          </div>
        </div>
        <details className="coordinate-picker">
          <summary>
            <LocateFixed size={15} /> Choose a precise location
          </summary>
          <Form
            key={state}
            className="inline-form"
            label="Get local weather"
            onSubmit={async (v) => setPoint([Number(v.latitude), Number(v.longitude)])}
          >
            <Field
              label="Latitude"
              name="latitude"
              type="number"
              step="any"
              min={6}
              max={38}
              defaultValue={selected.latitude}
              required
            />
            <Field
              label="Longitude"
              name="longitude"
              type="number"
              step="any"
              min={68}
              max={98}
              defaultValue={selected.longitude}
              required
            />
          </Form>
          <small>
            Coordinates are used directly; the selected state label does not verify administrative
            boundaries.
          </small>
        </details>
      </section>
      <section className="panel weather-panel">
        <div className="panel-heading">
          <div>
            <h2>
              <CloudSun size={20} /> Current weather · {selected.name}
            </h2>
            <p>Open-Meteo · Model estimates, not official disaster warnings</p>
          </div>
          <SourceStatus feed={weatherFeed.error ? { status: 'UNAVAILABLE' } : weather} />
        </div>
        {weatherFeed.error && (
          <p className="error" role="alert">
            Weather: {weatherFeed.error}
          </p>
        )}
        {weatherBusy && !current ? (
          <div className="loading">
            <RefreshCw className="spin" />
            Fetching weather…
          </div>
        ) : current ? (
          <>
            <div className="weather-metrics">
              <div className="temperature">
                <Thermometer size={24} />
                <strong>
                  {current.temperature_2m ?? '—'}°<span>C</span>
                </strong>
                <p>{weatherText(current.weather_code)}</p>
              </div>
              <div>
                <Droplets />
                <strong>
                  {current.precipitation ?? '—'} <small>mm</small>
                </strong>
                <p>Precipitation in current interval</p>
              </div>
              <div>
                <Wind />
                <strong>
                  {current.wind_speed_10m ?? '—'} <small>km/h</small>
                </strong>
                <p>Wind at 10 metres</p>
              </div>
              <div>
                <Droplets />
                <strong>
                  {current.relative_humidity_2m ?? '—'}
                  <small>%</small>
                </strong>
                <p>Relative humidity</p>
              </div>
            </div>
            <div className="forecast-strip">
              {daily?.time?.map((t, i) => (
                <article key={t}>
                  <small>
                    {new Date(t * 1000).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </small>
                  <strong>
                    {daily.temperature_2m_min?.[i] ?? 'Unknown'}° /{' '}
                    {daily.temperature_2m_max?.[i] ?? 'Unknown'}°
                  </strong>
                  <span>{daily.precipitation_sum?.[i] ?? 'Unknown'} mm forecast precipitation</span>
                </article>
              ))}
            </div>
          </>
        ) : (
          <Empty text="Live weather is unavailable. No sample numbers are substituted. Retry when the source or connection recovers." />
        )}
        <div className="source-foot">
          <p>
            <strong>Data time:</strong> {sourceTime(current?.time)} · <strong>Fetched:</strong>{' '}
            {weather?.fetchedAt ? date(weather.fetchedAt) : 'Not yet fetched'}
          </p>
          {weather?.status !== 'AVAILABLE' && weather?.message && (
            <p role="status">
              {weather.retryAt
                ? `Weather provider rate limit reached. Next eligible retry: ${date(weather.retryAt)}. Recovery depends on the provider; refreshing sooner will not bypass the limit.`
                : weather.message}
            </p>
          )}
          <p>
            {weather?.coverage || 'Point-specific weather model data.'} Refresh interval: 10
            minutes.
          </p>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather data by Open-Meteo (CC BY 4.0) <ExternalLink size={12} />
          </a>
        </div>
      </section>
      <section className="panel" aria-label="Air quality">
        <div className="panel-heading">
          <div>
            <h2>
              <Wind size={20} /> Air quality · {selected.name}
            </h2>
            <p>
              Open-Meteo / CAMS · Model estimates for{' '}
              {air?.locationLabel || (point ? 'selected coordinates' : selected.sampleLocation)}
            </p>
          </div>
          <SourceStatus feed={airFeed.error ? { status: 'UNAVAILABLE' } : air} />
        </div>
        {airFeed.error && (
          <p className="error" role="alert">
            Air quality: {airFeed.error}
          </p>
        )}
        {airBusy && !pollution ? (
          <div className="loading">Fetching air quality…</div>
        ) : pollution ? (
          <div className="weather-metrics">
            <div>
              <Wind />
              <strong>{pollution.us_aqi ?? 'Unknown'}</strong>
              <p>US AQI (not CPCB AQI)</p>
            </div>
            <div>
              <strong>
                {pollution.pm2_5 ?? 'Unknown'} <small>µg/m³</small>
              </strong>
              <p>PM2.5</p>
            </div>
            <div>
              <strong>
                {pollution.pm10 ?? 'Unknown'} <small>µg/m³</small>
              </strong>
              <p>PM10</p>
            </div>
          </div>
        ) : (
          <Empty text="Air quality is unavailable. No sample numbers are substituted." />
        )}
        <div className="source-foot">
          <p>
            <strong>Data time:</strong> {sourceTime(pollution?.time)} · <strong>Fetched:</strong>{' '}
            {air?.fetchedAt ? date(air.fetchedAt) : 'Not yet fetched'}
          </p>
          {air?.status !== 'AVAILABLE' && air?.message && <p role="status">{air.message}</p>}
          <p>
            {air?.coverage ||
              'CAMS model estimates, not local sensor readings. US AQI differs from Indian CPCB AQI.'}{' '}
            Refresh interval: 10 minutes.
          </p>
          <p>
            Source model updates are less frequent than app refreshes; this is not an instant
            pollution sensor.
          </p>
          <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">
            Air quality by Open-Meteo (CC BY 4.0) <ExternalLink size={12} />
          </a>
          {' · '}
          <a
            href="https://ads.atmosphere.copernicus.eu/datasets/cams-global-atmospheric-composition-forecasts"
            target="_blank"
            rel="noreferrer"
          >
            Copernicus Atmosphere Monitoring Service (CAMS)
          </a>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              <Radio size={18} /> Regional earthquake watch
            </h2>
            <p>USGS · Past seven days · India and surrounding region</p>
          </div>
          <SourceStatus feed={quakeFeed.error ? { status: 'UNAVAILABLE' } : quakes} />
        </div>
        <div className="source-foot">
          <p>
            {quakes?.coverage ||
              'Regional bounding box: 6–38°N, 68–98°E. Includes neighbouring countries and offshore areas.'}
          </p>
          <p>
            This feed is separate from NEXUS reports. An empty list does not mean there is no
            disaster risk.
          </p>
        </div>
        {quakeFeed.error && (
          <p className="error" role="alert">
            Earthquakes: {quakeFeed.error}
          </p>
        )}
        <IncidentMap events={quakes?.events || []} />
        {quakeBusy && !quakes ? (
          <div className="loading">Fetching earthquake events…</div>
        ) : quakes?.status === 'UNAVAILABLE' || !quakes ? (
          <Empty text="Earthquake source unavailable. We cannot confirm the current event list." />
        ) : quakes.events.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event / source</th>
                  <th>Magnitude</th>
                  <th>Depth</th>
                  <th>Occurred (local time)</th>
                </tr>
              </thead>
              <tbody>
                {quakes.events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <a className="table-link" href={e.url} target="_blank" rel="noreferrer">
                        {e.title} <ExternalLink size={12} />
                      </a>
                      <small>{e.location}</small>
                    </td>
                    <td>{e.magnitude ?? 'Unknown'}</td>
                    <td>{e.depthKm ?? 'Unknown'} km</td>
                    <td>{date(e.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="The current USGS feed contains no events within this regional extent for the past seven days." />
        )}
        <div className="source-foot">
          <p>
            Source generated: {quakes?.generatedAt ? date(quakes.generatedAt) : 'Unavailable'} ·
            Fetched: {quakes?.fetchedAt ? date(quakes.fetchedAt) : 'Unavailable'}
          </p>
          {quakes?.status !== 'AVAILABLE' && quakes?.message && (
            <p role="status">{quakes.message}</p>
          )}
          <a
            href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
            target="_blank"
            rel="noreferrer"
          >
            USGS feed documentation <ExternalLink size={12} />
          </a>
          <p>Refresh interval: 5 minutes. Published events may be revised or delayed.</p>
        </div>
      </section>
    </div>
  );
}
