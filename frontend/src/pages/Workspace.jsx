import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Radio,
  Clock,
  CheckCircle2,
  Users,
  Package,
  Search,
  MapPin,
  RefreshCw,
  Plus,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { api, errorMessage } from '../services/api';
import { useAuth } from '../context/Auth';
import { Badge, Field, Select, Form, Empty, Modal, date, words } from '../components/UI';
import IncidentMap from '../components/IncidentMap';
import regions from '../../../shared/india-regions.json';
const regionName = (code) => regions.find((r) => r.code === code)?.name || 'State not recorded';
const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  types = ['FLOOD', 'FIRE', 'EARTHQUAKE', 'CYCLONE', 'LANDSLIDE', 'ACCIDENT', 'OTHER'];
const palette = ['#178772', '#eaa35b', '#547f9c', '#e46c63', '#a7bfc8', '#7784b9'];
export default function Workspace() {
  const { user, setUser } = useAuth(),
    location = useLocation();
  const page = location.pathname.split('/')[2] || 'dashboard',
    root = '/' + user.role.toLowerCase();
  const admin = user.role === 'ADMIN';
  const [data, setData] = useState({
      incidents: [],
      assignments: [],
      resources: [],
      requests: [],
      alerts: [],
      users: [],
      teams: [],
      overview: {},
      analytics: {},
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('ALL'),
    [detail, setDetail] = useState(null),
    [history, setHistory] = useState([]),
    [recommend, setRecommend] = useState(null),
    [position, setPosition] = useState([28.6139, 77.209]),
    [reportState, setReportState] = useState('DL'),
    [regionFilter, setRegionFilter] = useState('ALL'),
    [sourceFilter, setSourceFilter] = useState('ALL'),
    [dialog, setDialog] = useState(null);
  const load = useCallback(async () => {
    setError('');
    try {
      const endpoints = {
        incidents: '/incidents',
        assignments: '/assignments/my',
        resources: '/resources',
        alerts: '/alerts',
        overview: '/analytics/overview',
      };
      if (['ADMIN', 'CITIZEN'].includes(user.role)) endpoints.requests = '/resource-requests';
      if (admin) {
        endpoints.users = '/users';
        endpoints.teams = '/teams';
        endpoints.analytics = '/analytics/incidents';
      } else if (user.role === 'RESPONDER') endpoints.teams = '/teams';
      const entries = await Promise.all(
        Object.entries(endpoints).map(async ([k, url]) => [k, (await api.get(url)).data]),
      );
      setData((d) => ({ ...d, ...Object.fromEntries(entries) }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user.role, admin]);
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    setSearch('');
    setFilter('ALL');
    setDetail(null);
  }, [page]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  const mutate = async (method, url, body, message = 'Changes saved') => {
    try {
      await api[method](url, body);
      await load();
      setToast(message);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };
  const view = async (i) => {
    setDetail(i);
    setHistory([]);
    setRecommend(null);
    try {
      const [h, r] = await Promise.all([
        api.get(`/incidents/${i.id}/history`),
        api.get(`/incidents/${i.id}/recommendation`),
      ]);
      setHistory(h.data);
      setRecommend(r.data);
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const filtered = [...data.incidents]
    .sort((a, b) =>
      user.role === 'RESPONDER' ? levels.indexOf(b.priority) - levels.indexOf(a.priority) : 0,
    )
    .filter(
      (i) =>
        `${i.title} ${i.location} ${i.type} ${i.id}`.toLowerCase().includes(search.toLowerCase()) &&
        (filter === 'ALL' || [i.priority, i.verification, i.status, i.type].includes(filter)) &&
        (regionFilter === 'ALL' || i.stateCode === regionFilter) &&
        (sourceFilter === 'ALL' || i.dataSource === sourceFilter),
    );
  const title = {
    dashboard: admin
      ? 'Response overview'
      : `Your ${user.role === 'CITIZEN' ? 'community' : user.role === 'VOLUNTEER' ? 'volunteer' : 'response'} workspace`,
    incidents: admin
      ? 'Incident management'
      : user.role === 'CITIZEN'
        ? 'My incident reports'
        : 'Assigned incidents',
    report: 'Report an incident',
    assignments: admin ? 'Rescue coordination' : 'My assignments',
    resources: admin ? 'Resource inventory' : 'Request essential resources',
    requests: 'Resource requests',
    alerts: 'Emergency alerts',
    map: 'Situation map',
    analytics: 'Response analytics',
    volunteers: 'People & rescue teams',
    profile: 'My profile',
  }[page];
  const table = (list, limit) =>
    list.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Verification</th>
              <th>Response</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit || list.length).map((i) => (
              <tr key={i.id}>
                <td>
                  <button className="table-link" onClick={() => view(i)}>
                    {i.title}
                  </button>
                  <small>
                    NX-{String(i.id).padStart(4, '0')} · {words(i.type)} · {date(i.createdAt)}
                  </small>
                  <span className="record-source">
                    {i.dataSource === 'DEMO'
                      ? 'Fictional demo'
                      : i.dataSource === 'QA_TEST'
                        ? 'QA test'
                        : 'Citizen report'}
                  </span>
                </td>
                <td>
                  {i.location}
                  <small>
                    {regionName(i.stateCode)}
                    {i.district ? ` ? ${i.district}` : ''}
                  </small>
                </td>
                <td>
                  <Badge value={i.priority} />
                </td>
                <td>
                  <Badge value={i.verification} />
                </td>
                <td>
                  <Badge value={i.status} />
                </td>
                <td>
                  <button
                    aria-label={`View ${i.title}`}
                    className="icon-button"
                    onClick={() => view(i)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty text="No incidents match this view." />
    );
  const filterbar = (
    <div className="filterbar">
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Search incidents"
          placeholder="Search incidents, locations or IDs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <select
        aria-label="Filter incidents"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        {['ALL', ...levels, 'PENDING', 'VERIFIED', 'REJECTED', 'RESOLVED', ...types].map((x) => (
          <option key={x} value={x}>
            {x === 'ALL' ? 'All incidents' : words(x)}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter state or union territory"
        value={regionFilter}
        onChange={(e) => setRegionFilter(e.target.value)}
      >
        <option value="ALL">All India</option>
        {regions.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter data source"
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
      >
        <option value="ALL">All record sources</option>
        <option value="CITIZEN_REPORT">Citizen reports</option>
        <option value="DEMO">Fictional demos</option>
        <option value="QA_TEST">QA tests</option>
      </select>
      <span>{filtered.length} reports</span>
    </div>
  );
  const alerts = (
    <div className="alert-list">
      {data.alerts.length ? (
        data.alerts.map((a) => (
          <article className="alert-card" key={a.id}>
            <span className={`alert-icon ${a.severity.toLowerCase()}`}>
              <Radio size={20} />
            </span>
            <div>
              <div className="card-title">
                <h3>{a.title}</h3>
                <Badge value={a.severity} />
              </div>
              <p>{a.message}</p>
              <small>
                <MapPin size={13} /> {a.location} · {date(a.createdAt)}
              </small>
            </div>
          </article>
        ))
      ) : (
        <Empty text="No alerts have been published." />
      )}
    </div>
  );
  if (loading)
    return (
      <div className="loading">
        <RefreshCw className="spin" /> Loading your coordination workspace…
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow green">
            NEXUS / {admin ? 'COMMAND CENTER' : words(user.role).toUpperCase()}
          </div>
          <h1>{title || 'Page not found'}</h1>
          <p>
            {page === 'dashboard'
              ? `Welcome back, ${user.name.split(' ')[0]}. Here’s the latest from your response network.`
              : 'Coordinate with clarity. Keep every action connected.'}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button light" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>
          {user.role === 'CITIZEN' && page !== 'report' && (
            <Link to={root + '/report'} className="button primary">
              <Plus size={16} /> Report incident
            </Link>
          )}
        </div>
      </div>
      {error && (
        <div className={detail || dialog ? 'error modal-error' : 'error'} role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {page === 'dashboard' && (
        <>
          <Link to={root + '/live'} className="live-entry">
            <span>
              <Radio size={20} /> Live India
            </span>
            <p>Explore weather across every state and recent regional earthquakes.</p>
            <ArrowUpRight size={20} />
          </Link>
          <div className="notice">
            <Radio size={19} />
            <span>
              <strong>Shared awareness. Faster coordination.</strong> Reports, assignments, and
              alerts refresh every 30 seconds.
            </span>
            <Link to={root + '/alerts'}>
              View alerts <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="stats-grid">
            {(admin
              ? [
                  ['Total incidents', 'total', Radio],
                  ['Awaiting verification', 'pending', Clock],
                  ['Active operations', 'active', Activity],
                  ['Resolved incidents', 'resolved', CheckCircle2],
                ]
              : user.role === 'CITIZEN'
                ? [
                    ['My reports', 'total', Radio],
                    ['Pending review', 'pending', Clock],
                    ['Active incidents', 'active', Activity],
                    ['Resolved', 'resolved', CheckCircle2],
                  ]
                : [
                    ['Assigned incidents', 'total', Radio],
                    ['My tasks', 'assignments', Users],
                    ['Active operations', 'active', Activity],
                    ['Resolved incidents', 'resolved', CheckCircle2],
                  ]
            ).map(([label, key, Icon], n) => (
              <article className="stat-card" key={key}>
                <div>
                  <span>{label}</span>
                  <span className={`stat-icon si${n}`}>
                    <Icon size={19} />
                  </span>
                </div>
                <strong>{data.overview[key] ?? 0}</strong>
                <small>
                  {n === 3 ? 'Progress across your network' : 'From current database records'}
                </small>
              </article>
            ))}
          </div>
          {admin && (
            <div className="mini-stats">
              {[
                ['Critical incidents', 'critical'],
                ['Available volunteers', 'volunteers'],
                ['Rescue teams', 'teams'],
                ['Pending requests', 'requests'],
              ].map(([t, k]) => (
                <span key={k}>
                  {t}
                  <b>{data.overview[k] ?? 0}</b>
                </span>
              ))}
            </div>
          )}
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Incident situation</h2>
                  <p>Reports across India ? 28 states & 8 union territories</p>
                </div>
                <span className="live-label">
                  <i /> DATABASE VIEW
                </span>
              </div>
              <IncidentMap incidents={data.incidents} onSelect={view} compact />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Response activity</h2>
                  <p>Current incident distribution</p>
                </div>
                <Activity size={18} />
              </div>
              <div className="donut">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: data.overview.pending || 0 },
                        { name: 'Active', value: data.overview.active || 0 },
                        { name: 'Resolved', value: data.overview.resolved || 0 },
                      ]}
                      dataKey="value"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {palette.slice(0, 3).map((c) => (
                        <Cell key={c} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-key">
                {[
                  ['Pending', data.overview.pending],
                  ['Active', data.overview.active],
                  ['Resolved', data.overview.resolved],
                ].map(([t, n], i) => (
                  <span key={t}>
                    <i style={{ background: palette[i] }} />
                    {t}
                    <b>{n || 0}</b>
                  </span>
                ))}
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Recent incidents</h2>
                <p>The latest reports in your workspace</p>
              </div>
              <Link
                to={root + (user.role === 'VOLUNTEER' ? '/assignments' : '/incidents')}
                className="text-button"
              >
                View all <ArrowUpRight size={16} />
              </Link>
            </div>
            {table(data.incidents, 5)}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Emergency bulletin</h2>
              <Link to={root + '/alerts'} className="text-button">
                All alerts →
              </Link>
            </div>
            {alerts}
          </section>
        </>
      )}
      {page === 'incidents' && (
        <section className="panel">
          {filterbar}
          {table(filtered)}
        </section>
      )}
      {page === 'map' && (
        <section className="panel">
          {filterbar}
          <IncidentMap
            incidents={filtered}
            region={regions.find((r) => r.code === regionFilter)}
            onSelect={view}
          />
          <div className="panel-foot">
            Select a marker to inspect an incident. Map tiles require internet access.
          </div>
        </section>
      )}
      {page === 'report' && user.role === 'CITIZEN' && (
        <div className="report-grid">
          <section className="panel padded">
            <h2>Tell us what happened</h2>
            <p className="muted">
              Your report will be reviewed by an administrator before response coordination begins.
            </p>
            <Form
              resetOnSuccess
              label="Submit incident report"
              onSubmit={async (v) => {
                const ok = await mutate(
                  'post',
                  '/incidents',
                  {
                    ...v,
                    stateCode: reportState,
                    latitude: position[0],
                    longitude: position[1],
                    affectedPeople: Number(v.affectedPeople),
                  },
                  'Report submitted for verification',
                );
                if (ok) {
                  setDialog({ type: 'reported' });
                }
                return ok;
              }}
            >
              <Field
                label="Incident title"
                name="title"
                required
                maxLength={180}
                placeholder="e.g. Flooding near the main road"
              />
              <div className="form-row">
                <Select label="Disaster type" name="type" values={types} />
                <Select label="Reported severity" name="severity" values={levels} />
              </div>
              <Field label="What is happening?">
                <textarea name="description" required maxLength={4000} rows={4} />
              </Field>
              <div className="form-row">
                <Select
                  label="State / union territory"
                  name="stateCode"
                  value={reportState}
                  onChange={(e) => {
                    setReportState(e.target.value);
                    const r = regions.find((x) => x.code === e.target.value);
                    setPosition([r.latitude, r.longitude]);
                  }}
                  values={regions.map((r) => ({ value: r.code, label: r.name }))}
                />
                <Field label="District / city" name="district" required maxLength={120} />
              </div>
              <Field label="Location / address" name="location" required maxLength={250} />
              <div className="form-row">
                <Field
                  label="People affected"
                  name="affectedPeople"
                  type="number"
                  min={1}
                  max={10000000}
                  defaultValue={1}
                  required
                />
                <Field label="Contact information" name="contact" required maxLength={100} />
              </div>
              <div className="form-row">
                <Field
                  label="Latitude"
                  type="number"
                  step="any"
                  min={6}
                  max={38}
                  value={position[0]}
                  onChange={(e) => setPosition([Number(e.target.value), position[1]])}
                  required
                />
                <Field
                  label="Longitude"
                  type="number"
                  step="any"
                  min={68}
                  max={98}
                  value={position[1]}
                  onChange={(e) => setPosition([position[0], Number(e.target.value)])}
                  required
                />
              </div>
            </Form>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Pin the location</h2>
                <p>Click on the map to select where help is needed.</p>
              </div>
              <MapPin />
            </div>
            <IncidentMap position={position} onPick={setPosition} />
            <div className="panel-foot">
              <strong>Location helps teams coordinate.</strong>
              <p>Check the pin and street address before submitting.</p>
            </div>
          </section>
        </div>
      )}
      {page === 'assignments' && (
        <>
          {admin && (
            <section className="panel padded">
              <h2>Create an assignment</h2>
              <Form
                className="inline-form"
                label="Assign task"
                onSubmit={async (v) =>
                  mutate(
                    'post',
                    '/assignments',
                    { ...v, incidentId: Number(v.incidentId), assigneeId: Number(v.assigneeId) },
                    'Assignment created',
                  )
                }
              >
                <Select
                  label="Verified incident"
                  name="incidentId"
                  required
                  values={[
                    { value: '', label: 'Choose incident' },
                    ...data.incidents
                      .filter((i) => i.verification === 'VERIFIED' && i.status !== 'RESOLVED')
                      .map((i) => ({ value: i.id, label: `#${i.id} ${i.title}` })),
                  ]}
                />
                <Select
                  label="Responder or volunteer"
                  name="assigneeId"
                  required
                  values={[
                    { value: '', label: 'Choose person' },
                    ...data.users
                      .filter((u) => ['RESPONDER', 'VOLUNTEER'].includes(u.role) && u.available)
                      .map((u) => ({
                        value: u.id,
                        label: `${u.name} · ${words(u.role)}${u.team ? ' · ' + u.team.name : ''}`,
                      })),
                  ]}
                />
                <Field label="Task instructions" name="task" required maxLength={250} />
              </Form>
            </section>
          )}
          <div className="assignment-grid">
            {data.assignments.length ? (
              data.assignments.map((a) => (
                <section className="panel assignment-card" key={a.id}>
                  <div className="card-title">
                    <Badge value={a.kind} />
                    <Badge value={a.status} />
                  </div>
                  <h2>{a.task}</h2>
                  <button className="table-link" onClick={() => view(a.incident)}>
                    {a.incident.title}
                  </button>
                  <p>
                    <MapPin size={15} /> {a.incident.location}
                  </p>
                  <small>
                    {a.assignee.name}
                    {a.assignee.team ? ' · ' + a.assignee.team.name : ''}
                  </small>
                  {a.note && <p className="assignment-note">{a.note}</p>}
                  {!admin && !['COMPLETED', 'RESOLVED'].includes(a.status) && (
                    <Form
                      label="Update progress"
                      onSubmit={async (v) =>
                        mutate('patch', `/assignments/${a.id}/status`, v, 'Progress updated')
                      }
                    >
                      <Select
                        label="Next status"
                        name="status"
                        values={
                          a.kind === 'VOLUNTEER'
                            ? {
                                ASSIGNED: ['ACCEPTED'],
                                ACCEPTED: ['IN_PROGRESS'],
                                IN_PROGRESS: ['COMPLETED'],
                              }[a.status] || []
                            : {
                                ASSIGNED: ['DISPATCHED', 'IN_PROGRESS'],
                                DISPATCHED: ['IN_PROGRESS'],
                                IN_PROGRESS: ['RESOLVED'],
                              }[a.status] || []
                        }
                      />
                      <Field label="Progress note" name="note" maxLength={2000} />
                    </Form>
                  )}
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        const r = await api.get(`/assignments/${a.id}/history`);
                        setDialog({ type: 'history', items: r.data });
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    View activity history →
                  </button>
                </section>
              ))
            ) : (
              <Empty text="No tasks assigned yet. Your coordinator can assign a task to you." />
            )}
          </div>
        </>
      )}
      {page === 'resources' && (
        <>
          {admin ? (
            <section className="panel padded">
              <h2>Add inventory</h2>
              <Form
                className="inline-form"
                label="Add resource"
                onSubmit={(v) =>
                  mutate(
                    'post',
                    '/resources',
                    { ...v, quantity: Number(v.quantity) },
                    'Resource added',
                  )
                }
              >
                <Field label="Resource name" name="name" required maxLength={150} />
                <Select
                  label="Category"
                  name="category"
                  values={['FOOD', 'WATER', 'MEDICINE', 'SHELTER', 'RESCUE', 'OTHER']}
                />
                <Field
                  label="Unit"
                  name="unit"
                  placeholder="kits / liters / spaces"
                  required
                  maxLength={40}
                />
                <Field label="Quantity" name="quantity" type="number" min={0} required />
              </Form>
            </section>
          ) : (
            <section className="panel padded">
              <h2>Request supplies or assistance</h2>
              <Form
                className="inline-form"
                label="Submit request"
                onSubmit={(v) =>
                  mutate(
                    'post',
                    '/resource-requests',
                    { ...v, resourceId: Number(v.resourceId), quantity: Number(v.quantity) },
                    'Resource request submitted',
                  )
                }
              >
                <Select
                  label="Resource"
                  name="resourceId"
                  required
                  values={[
                    { value: '', label: 'Choose resource' },
                    ...data.resources.map((r) => ({ value: r.id, label: `${r.name} (${r.unit})` })),
                  ]}
                />
                <Field label="Quantity needed" name="quantity" type="number" min={1} required />
                <Field label="Delivery location" name="location" required maxLength={250} />
                <Field label="Reason" name="reason" required maxLength={255} />
              </Form>
            </section>
          )}
          <div className="resource-grid">
            {data.resources.map((r) => (
              <section className="panel resource-card" key={r.id}>
                <span className="resource-icon">
                  <Package />
                </span>
                <Badge value={r.category} />
                <h2>{r.name}</h2>
                <strong>
                  {r.quantity.toLocaleString()} <small>{r.unit} available</small>
                </strong>
                {admin && (
                  <Form
                    key={r.quantity}
                    label="Update stock"
                    onSubmit={(v) =>
                      mutate(
                        'patch',
                        `/resources/${r.id}`,
                        { quantity: Number(v.quantity), expectedQuantity: r.quantity },
                        'Inventory updated',
                      )
                    }
                  >
                    <Field
                      label="Set available quantity"
                      name="quantity"
                      type="number"
                      min={0}
                      required
                      defaultValue={r.quantity}
                    />
                  </Form>
                )}
              </section>
            ))}
          </div>
          {!admin && <Requests requests={data.requests} />}
        </>
      )}
      {page === 'requests' && (
        <Requests
          requests={data.requests}
          onReview={(r) => setDialog({ type: 'review', request: r })}
        />
      )}
      {page === 'alerts' && (
        <>
          {admin && (
            <section className="panel padded">
              <h2>Publish an emergency alert</h2>
              <Form
                label="Publish alert"
                onSubmit={(v) =>
                  mutate('post', '/alerts', v, 'Alert published to all role dashboards')
                }
              >
                <div className="form-row">
                  <Field label="Alert title" name="title" required maxLength={180} />
                  <Select label="Severity" name="severity" values={levels} />
                  <Field label="Affected location" name="location" required maxLength={250} />
                </div>
                <Field label="Message">
                  <textarea name="message" required maxLength={4000} rows={3} />
                </Field>
              </Form>
            </section>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>Published alerts</h2>
              <span>{data.alerts.length} bulletins</span>
            </div>
            {alerts}
          </section>
        </>
      )}
      {page === 'volunteers' && (
        <>
          <div className="team-grid">
            {data.teams.map((t) => (
              <article className="panel padded" key={t.id}>
                <Users className="green" />
                <h2>{t.name}</h2>
                <p>{t.baseLocation}</p>
                <small>
                  {data.users
                    .filter((u) => u.team?.id === t.id)
                    .map((u) => u.name)
                    .join(' · ')}
                </small>
              </article>
            ))}
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Response network</h2>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Skills</th>
                    <th>Availability</th>
                    <th>Team</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users
                    .filter((u) => ['RESPONDER', 'VOLUNTEER'].includes(u.role))
                    .map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>
                          <Badge value={u.role} />
                        </td>
                        <td>{u.skills || 'Not specified'}</td>
                        <td>
                          <Badge value={u.available ? 'AVAILABLE' : 'UNAVAILABLE'} />
                        </td>
                        <td>{u.team?.name || 'Volunteer network'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {page === 'analytics' && (
        <div className="analytics-grid">
          {[
            ['Incidents by disaster type', 'byType'],
            ['Incidents by priority', 'byPriority'],
            ['Incident status distribution', 'byStatus'],
            ['Monthly incident trends', 'monthly'],
            ['Volunteer assignment progress', 'volunteers'],
          ].map(([t, k]) => (
            <Chart key={k} title={t} data={data.analytics[k] || []} line={k === 'monthly'} />
          ))}
          <Chart
            title="Resource availability"
            data={data.resources.map((r) => ({ name: r.name, value: r.quantity }))}
          />
        </div>
      )}
      {page === 'profile' && (
        <section className="panel padded profile-panel">
          <h2>Your details</h2>
          <p className="muted">
            {user.email} · {words(user.role)}
            {user.team ? ' · ' + user.team.name : ''}
          </p>
          <Form
            onSubmit={async (v) => {
              try {
                const r = await api.patch('/auth/me', { ...v, available: v.available === 'true' });
                setUser(r.data);
                setToast('Profile updated');
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            <Field
              label="Full name"
              name="name"
              defaultValue={user.name}
              required
              maxLength={100}
            />
            <Field label="Phone" name="phone" defaultValue={user.phone || ''} maxLength={40} />
            <Field label="Skills" name="skills" defaultValue={user.skills || ''} maxLength={500} />
            <Select
              label="Availability"
              name="available"
              defaultValue={String(user.available)}
              values={[
                { value: 'true', label: 'Available' },
                { value: 'false', label: 'Unavailable' },
              ]}
            />
          </Form>
        </section>
      )}
      {detail && (
        <Modal
          title={`Incident NX-${String(detail.id).padStart(4, '0')}`}
          onClose={() => setDetail(null)}
        >
          <div className="detail-heading">
            <h2>{detail.title}</h2>
            <Badge value={detail.priority} />
            <Badge value={detail.verification} />
            <Badge value={detail.status} />
          </div>
          <p>{detail.description}</p>
          <div className="detail-meta">
            <span>
              <MapPin size={16} /> {detail.location}
            </span>
            <span>
              {regionName(detail.stateCode)} ? {detail.district || 'District not recorded'}
            </span>
            <span>{detail.affectedPeople} people affected</span>
            <span>Contact: {detail.contact}</span>
            <span>Reported by {detail.reporter.name}</span>
          </div>
          <IncidentMap
            incidents={[detail]}
            position={[detail.latitude, detail.longitude]}
            compact
          />
          {admin && detail.status !== 'RESOLVED' && (
            <div className="review-box">
              <h3>Review & classify</h3>
              {recommend && (
                <p className="recommendation">
                  <strong>Suggested: {words(recommend.priority)}</strong> — {recommend.reason}
                </p>
              )}
              <Form
                label="Save review decision"
                onSubmit={async (v) => {
                  if (await mutate('patch', `/incidents/${detail.id}/verify`, v, 'Review saved'))
                    setDetail(null);
                }}
              >
                <div className="form-row">
                  <Select label="Decision" name="verification" values={['VERIFIED', 'REJECTED']} />
                  <Select
                    label="Final priority"
                    name="priority"
                    values={levels}
                    defaultValue={detail.priority}
                  />
                  <Select
                    label="Assessed severity"
                    name="severity"
                    values={levels}
                    defaultValue={detail.severity}
                  />
                </div>
                <Field label="Review note" name="note" maxLength={2000} />
              </Form>
              {detail.verification === 'VERIFIED' && detail.status !== 'RESOLVED' && (
                <Form
                  label="Update operation status"
                  onSubmit={async (v) => {
                    if (await mutate('patch', `/incidents/${detail.id}/status`, v)) setDetail(null);
                  }}
                >
                  <Select
                    label="Next operation status"
                    name="status"
                    values={
                      {
                        REPORTED: ['ASSIGNED'],
                        ASSIGNED: ['DISPATCHED', 'IN_PROGRESS'],
                        DISPATCHED: ['IN_PROGRESS'],
                        IN_PROGRESS: ['RESOLVED'],
                      }[detail.status] || []
                    }
                  />
                  <Field label="Operation note" name="note" maxLength={2000} />
                </Form>
              )}
              <Link
                to={root + '/assignments'}
                onClick={() => setDetail(null)}
                className="text-button"
              >
                Coordinate an assignment →
              </Link>
            </div>
          )}
          <h3 className="history-title">Incident history</h3>
          <div className="timeline">
            {history.map((h) => (
              <article key={h.id}>
                <span />
                <div>
                  <Badge value={h.status} />
                  <p>{h.note || 'Status updated'}</p>
                  <small>
                    {h.actor.name} · {date(h.createdAt)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {dialog?.type === 'reported' && (
        <Modal title="Your report has been received" onClose={() => setDialog(null)}>
          <p>
            Your incident is saved and awaiting administrator verification. Follow its progress in
            My Reports.
          </p>
          <Link className="button primary" to={root + '/incidents'} onClick={() => setDialog(null)}>
            View my reports <ArrowUpRight size={16} />
          </Link>
        </Modal>
      )}
      {dialog?.type === 'review' && (
        <Modal title="Review resource request" onClose={() => setDialog(null)}>
          <p>
            {dialog.request.quantity} {dialog.request.resource.unit} of{' '}
            {dialog.request.resource.name} for {dialog.request.requester.name}.
          </p>
          <p>Approving deducts stock immediately. This decision cannot be repeated.</p>
          <Form
            label="Confirm decision"
            onSubmit={async (v) => {
              if (
                await mutate(
                  'patch',
                  `/resource-requests/${dialog.request.id}/review`,
                  v,
                  'Request reviewed',
                )
              )
                setDialog(null);
            }}
          >
            <Select label="Decision" name="status" values={['APPROVED', 'REJECTED']} />
            <Field label="Review note" name="note" maxLength={255} />
          </Form>
        </Modal>
      )}
      {dialog?.type === 'history' && (
        <Modal title="Assignment activity" onClose={() => setDialog(null)}>
          {dialog.items.length ? (
            dialog.items.map((h) => (
              <article className="history-entry" key={h.id}>
                <Badge value={h.status} />
                <p>{h.note || 'Status recorded'}</p>
                <small>{date(h.createdAt)}</small>
              </article>
            ))
          ) : (
            <Empty text="This seeded assignment has no subsequent activity yet." />
          )}
        </Modal>
      )}
    </>
  );
}
function Requests({ requests, onReview }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{onReview ? 'Review queue' : 'My resource requests'}</h2>
        <span>{requests.length} requests</span>
      </div>
      {requests.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Requested by</th>
                <th>Quantity</th>
                <th>Location</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.resource.name}</strong>
                    <small>{r.reason}</small>
                    {r.reviewNote && <small>Review: {r.reviewNote}</small>}
                  </td>
                  <td>{r.requester.name}</td>
                  <td>
                    {r.quantity} {r.resource.unit}
                  </td>
                  <td>{r.location}</td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                  <td>
                    {onReview && r.status === 'PENDING' && (
                      <button className="button light" onClick={() => onReview(r)}>
                        Review <ChevronRight size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="No resource requests yet." />
      )}
    </section>
  );
}
function Chart({ title, data, line = false }) {
  return (
    <section className="panel padded">
      <h2>{title}</h2>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          {line ? (
            <LineChart data={data} margin={{ top: 25, right: 15, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#178772" strokeWidth={3} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 25, right: 15, bottom: 45, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-18}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      ) : (
        <Empty text="No data available for this chart." />
      )}
    </section>
  );
}
