import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Radio,
  MapPin,
  Users,
  Package,
  ShieldCheck,
  Activity,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Logo, Field, Select, Form } from '../components/UI';
import { useAuth } from '../context/Auth';
import { errorMessage } from '../services/api';
export function Landing() {
  return (
    <div className="landing">
      <nav className="public-nav">
        <Link to="/">
          <Logo />
        </Link>
        <div>
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
          <Link to="/about">About NEXUS</Link>
        </div>
        <Link to="/login" className="button light">
          Sign in <ArrowUpRight size={16} />
        </Link>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> CONNECTED COMMUNITIES. COORDINATED RESPONSE.
          </div>
          <h1>
            When every
            <br />
            second counts,
            <br />
            <em>come together.</em>
          </h1>
          <p>NEXUS — Disaster Response Coordination Platform</p>
          <p className="hero-sub">Connecting Communities. Coordinating Response. Saving Lives.</p>
          <div className="hero-actions">
            <Link className="button orange" to="/citizen/report">
              Report emergency <ArrowUpRight size={18} />
            </Link>
            <Link className="button outline" to="/register">
              Join the response <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-foot">
            <ShieldCheck size={18} /> One shared picture. A more coordinated response.
          </div>
        </div>
        <div className="hero-visual">
          <div className="radar-grid" />
          <div className="radar-circle c1" />
          <div className="radar-circle c2" />
          <div className="radar-circle c3" />
          <div className="radar-center">
            <Radio size={38} />
          </div>
          <span className="map-label l1">INDIA</span>
          <span className="map-label l2">36 REGIONS</span>
          <span className="pulse-point p1" />
          <span className="pulse-point p2" />
          <span className="pulse-point p3" />
          <div className="floating-card fc1">
            <span className="mini-icon orange-bg">
              <Radio size={18} />
            </span>
            <div>
              <strong>Every report matters</strong>
              <small>Locate · Verify · Respond</small>
            </div>
            <span className="live-dot" />
          </div>
          <div className="floating-card fc2">
            <span className="mini-icon green-bg">
              <Users size={18} />
            </span>
            <div>
              <strong>One connected response</strong>
              <small>People, teams & essential supplies</small>
            </div>
          </div>
          <span className="visual-caption">COORDINATION STARTS WITH CONNECTION</span>
        </div>
      </section>
      <div className="landing-strip">
        <span>
          <b>04</b> Connected roles
        </span>
        <span>
          <b>07</b> Incident categories
        </span>
        <span>
          <b>01</b> Shared coordination platform
        </span>
        <span>
          <ShieldCheck size={20} /> 28 states ? 8 union territories
        </span>
      </div>
      <section className="landing-section" id="platform">
        <div className="eyebrow green">BUILT FOR A COLLECTIVE RESPONSE</div>
        <h2>
          The right information.
          <br />
          The right people. The right time.
        </h2>
        <div className="feature-grid">
          {[
            [
              MapPin,
              'A clearer picture',
              'Report incidents with precise locations and track every update.',
            ],
            [
              Users,
              'A connected team',
              'Bring citizens, volunteers, and rescue responders into one workflow.',
            ],
            [
              Package,
              'Resources where needed',
              'Review requests and allocate supplies from available inventory.',
            ],
            [
              Activity,
              'Decisions with context',
              'Monitor verified reports, operational progress, and response trends.',
            ],
          ].map(([Icon, t, d]) => (
            <article key={t}>
              <Icon />
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="workflow-section" id="workflow">
        <div>
          <div className="eyebrow green">FROM FIRST REPORT TO RESOLUTION</div>
          <h2>
            One report.
            <br />A coordinated chain of action.
          </h2>
          <Link to="/register" className="button primary">
            Become part of NEXUS <ArrowUpRight size={16} />
          </Link>
        </div>
        <ol>
          {[
            ['01', 'Citizens report', 'Share what happened, where, and who needs help.'],
            ['02', 'Administrators verify', 'Review the report and decide the response priority.'],
            ['03', 'Teams respond', 'Assign responders, volunteers, and essential supplies.'],
            ['04', 'Everyone stays informed', 'Track progress through to a resolved incident.'],
          ].map(([n, t, d]) => (
            <li key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
              <CheckCircle2 size={20} />
            </li>
          ))}
        </ol>
      </section>
      <footer>
        <Logo />
        <p>Connecting Communities. Coordinating Response. Saving Lives.</p>
        <small>Professional Training I · Fictional demonstration platform</small>
      </footer>
    </div>
  );
}
export function AuthPage({ register = false }) {
  const { login } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState('');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  return (
    <div className="auth-page">
      <aside>
        <Link to="/">
          <Logo />
        </Link>
        <div>
          <div className="eyebrow">STRONGER, TOGETHER</div>
          <h1>
            Coordination
            <br />
            makes the
            <br />
            <em>difference.</em>
          </h1>
          <p>A shared space for communities and the people who respond when they need help.</p>
        </div>
        <small>NEXUS · Disaster Response Coordination Platform</small>
      </aside>
      <main>
        <div className="auth-form">
          <span className="eyebrow green">WELCOME TO NEXUS</span>
          <h2>{register ? 'Join the response.' : 'Good to see you.'}</h2>
          <p>
            {register
              ? 'Create your account to get involved.'
              : 'Sign in to your coordination workspace.'}
          </p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <Form
            label={register ? 'Create account' : 'Sign in'}
            onSubmit={async (v) => {
              setError('');
              try {
                const u = await login(v, register);
                navigate(`/${u.role.toLowerCase()}/dashboard`);
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            {register && <Field label="Full name" name="name" required maxLength={100} />}
            <Field
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={register ? 8 : 1}
              maxLength={72}
            />
            {register && (
              <Select label="I want to join as" name="role" values={['CITIZEN', 'VOLUNTEER']} />
            )}
          </Form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to NEXUS?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          {!register && (
            <div className="demo-logins">
              <small>LOCAL DEMO ACCOUNTS · FICTIONAL DATA</small>
              <div>
                {['Citizen', 'Volunteer', 'Responder', 'Admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setEmail(r.toLowerCase() + '@nexus.demo');
                      setPassword('NexusDemo123!');
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <small>Select a role to fill its demo credentials.</small>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
export function About() {
  return (
    <div className="about-page">
      <Link to="/">
        <Logo />
      </Link>
      <div className="eyebrow green">ABOUT THE PROJECT</div>
      <h1>
        A shared platform for
        <br />
        disaster response.
      </h1>
      <p>
        NEXUS connects citizens, volunteers, rescue responders, and administrators to improve
        incident coordination and resource management.
      </p>
      <div className="feature-grid">
        {[
          ['Citizens', 'Report emergencies, request supplies, and follow the response.'],
          ['Volunteers', 'Maintain availability and skills, accept tasks, and record progress.'],
          [
            'Responders',
            'See assigned incidents, location information, and update rescue operations.',
          ],
          [
            'Administrators',
            'Verify reports, set priorities, coordinate teams, allocate resources, and publish alerts.',
          ],
        ].map(([t, d]) => (
          <article key={t}>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </div>
      <p>
        This Professional Training I demonstration uses React, a secured Spring Boot REST API, and
        PostgreSQL persistence. All initial incidents and identities are fictional. Priority
        recommendations use transparent rules; administrators retain final control.
      </p>
      <Link className="button primary" to="/login">
        Open your workspace <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
