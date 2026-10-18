import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from './UI';
const colors = { LOW: '#249d78', MEDIUM: '#e6a23c', HIGH: '#e7783d', CRITICAL: '#e15353' };
function Picker({ onPick }) {
  useMapEvents({
    click: (e) => onPick([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]),
  });
  return null;
}
function Viewport({ center, zoom }) {
  const map = useMap();
  const [lat, lon] = center;
  useEffect(() => {
    map.setView([lat, lon], zoom);
  }, [map, lat, lon, zoom]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
export default function IncidentMap({
  incidents = [],
  position,
  onPick,
  onSelect,
  compact = false,
  region,
  events = [],
}) {
  const valid = incidents.filter(
    (i) =>
      Number.isFinite(i.latitude) &&
      Number.isFinite(i.longitude) &&
      Math.abs(i.latitude) <= 90 &&
      Math.abs(i.longitude) <= 180,
  );
  const center = position || (region ? [region.latitude, region.longitude] : [22.6, 80.5]);
  const zoom = position ? 11 : region ? 6 : 4;
  return (
    <div className={`map-wrap ${compact ? 'compact' : ''}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false}>
        <Viewport center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <Picker onPick={onPick} />}{' '}
        {position && (
          <CircleMarker
            center={position}
            radius={9}
            pathOptions={{ color: '#0d8c78', fillOpacity: 0.9 }}
          />
        )}
        {valid.map((i) => (
          <CircleMarker
            key={i.id}
            center={[i.latitude, i.longitude]}
            radius={8}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: colors[i.priority],
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <strong>{i.title}</strong>
              <p>{i.location}</p>
              <Badge value={i.priority} />
              <p>{i.status.replaceAll('_', ' ')}</p>
              {onSelect && (
                <button className="text-button" onClick={() => onSelect(i)}>
                  View incident →
                </button>
              )}
            </Popup>
          </CircleMarker>
        ))}
        {events.map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.latitude, e.longitude]}
            radius={Math.max(5, (e.magnitude || 1) * 2)}
            pathOptions={{ color: '#8e5ab5', fillOpacity: 0.65 }}
          >
            <Popup>
              <strong>{e.title}</strong>
              <p>{e.location}</p>
              <a href={e.url} target="_blank" rel="noreferrer">
                USGS event details ?
              </a>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="map-legend">
        {events.length > 0 && <span>USGS events (purple)</span>}
        {Object.entries(colors).map(([k, v]) => (
          <span key={k}>
            <i style={{ background: v }} />
            {k.toLowerCase()}
          </span>
        ))}
      </div>
      {valid.length < incidents.length && (
        <small>Some reports have no valid map coordinates.</small>
      )}
    </div>
  );
}
