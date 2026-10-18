import { useCallback, useEffect, useRef, useState } from 'react';
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
import { api, errorMessage } from '../services/api';
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
            ? 'Source unavailable'
            : 'Connecting…'}
    </span>
  );
}
export default function LiveIndia() {
  const [state, setState] = useState('DL'),
    [point, setPoint] = useState(null),
    [weather, setWeather] = useState(null),
    [quakes, setQuakes] = useState(null),
    [error, setError] = useState(''),
    [weatherBusy, setWeatherBusy] = useState(false),
    [quakeBusy, setQuakeBusy] = useState(false);
  const sequence = useRef(0);
  const selected = regions.find((r) => r.code === state);
  const loadWeather = useCallback(async () => {
    const id = ++sequence.current;
    setWeatherBusy(true);
    try {
      const { data } = await api.get('/live/weather', {
        params: { stateCode: state, ...(point ? { latitude: point[0], longitude: point[1] } : {}) },
      });
      if (id === sequence.current) {
        setWeather(data);
        setError('');
      }
    } catch (e) {
      if (id === sequence.current) {
        setWeather(null);
        setError(errorMessage(e));
      }
    } finally {
      if (id === sequence.current) setWeatherBusy(false);
    }
  }, [state, point]);
  const loadQuakes = useCallback(async () => {
    setQuakeBusy(true);
    try {
      setQuakes((await api.get('/live/earthquakes')).data);
    } catch (e) {
      setQuakes(null);
      setError(errorMessage(e));
    } finally {
      setQuakeBusy(false);
    }
  }, []);
  useEffect(() => {
    setWeather(null);
    loadWeather();
    const timer = setInterval(loadWeather, 600000);
    return () => {
      clearInterval(timer);
      sequence.current++;
    };
  }, [loadWeather]);
  useEffect(() => {
    loadQuakes();
    const timer = setInterval(loadQuakes, 300000);
    return () => clearInterval(timer);
  }, [loadQuakes]);
  const current = weather?.data?.current,
    daily = weather?.data?.daily;
  return (
    <div className="live-india">
      <div className="page-heading">
        <div>
          <div className="eyebrow green">NEXUS INDIA / LIVE CONTEXT</div>
          <h1>A wider view. A better response.</h1>
          <p>Current weather and recent earthquakes, with transparent sources and timestamps.</p>
        </div>
        <button
          className="button light"
          disabled={weatherBusy || quakeBusy}
          onClick={() => {
            loadWeather();
            loadQuakes();
          }}
        >
          <RefreshCw size={16} className={weatherBusy || quakeBusy ? 'spin' : ''} />
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
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
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
          <SourceStatus feed={weather} />
        </div>
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
                    {daily.temperature_2m_min[i]}° / {daily.temperature_2m_max[i]}°
                  </strong>
                  <span>{daily.precipitation_sum[i]} mm forecast precipitation</span>
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
          {weather?.status === 'STALE' && <p role="status">{weather.message}</p>}
          <p>
            {weather?.coverage || 'Point-specific weather model data.'} Refresh interval: 10
            minutes.
          </p>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather data by Open-Meteo (CC BY 4.0) <ExternalLink size={12} />
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
          <SourceStatus feed={quakes} />
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
          {quakes?.status === 'STALE' && <p>{quakes.message}</p>}
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
