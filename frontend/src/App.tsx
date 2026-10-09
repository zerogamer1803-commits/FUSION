

import { useEffect, useState } from 'react'
import type React from 'react'

import {

  Activity, AlertTriangle, BarChart3, Bell, Cpu, Gauge, LayoutDashboard,

  Radio, Settings, ShieldCheck, Thermometer, Zap, RefreshCw, Wifi, WifiOff,

  ArrowUpRight, SlidersHorizontal,

} from 'lucide-react'

import { checkBackend, fetchLatest, assessTransformer } from './api'

import type { SensorReadings, FaultPrediction, TransformerReadings, HealthAssessment } from './api'

import './App.css'

type NavItem =

  | 'Overview'

  | 'Live Monitoring'

  | 'Equipment'

  | 'Fault Analysis'
  | 'Health Index'

  | 'Alerts'

  | 'Analytics'

  | 'Settings'

const initialReadings: SensorReadings = {

  voltage: 230,

  current: 5,

  temperature: 45,

  frequency: 50,

  power_factor: 0.95,

  vibration_level: 2,

  device_age_years: 5,

  terminal_efficiency: 95,

  load_variation: 5,

  signal_strength: -60,

  apparent_power: 1150,

  real_power: 1092.5,

  energy_consumed: 12.5,

}

const fields: {

  key: keyof SensorReadings

  label: string

  unit: string

  step?: string

}[] = [

  { key: 'voltage', label: 'Voltage', unit: 'V', step: 'any' },

  { key: 'current', label: 'Current', unit: 'A', step: 'any' },

  { key: 'temperature', label: 'Temperature', unit: '°C', step: 'any' },

  { key: 'frequency', label: 'Frequency', unit: 'Hz', step: 'any' },

  { key: 'power_factor', label: 'Power factor', unit: '0–1', step: 'any' },

  { key: 'vibration_level', label: 'Vibration level', unit: 'mm/s', step: 'any' },

  { key: 'device_age_years', label: 'Device age', unit: 'years', step: '1' },

  { key: 'terminal_efficiency', label: 'Terminal efficiency', unit: '%', step: 'any' },

  { key: 'load_variation', label: 'Load variation', unit: '%', step: 'any' },

  { key: 'signal_strength', label: 'Signal strength', unit: 'dB', step: 'any' },

  { key: 'apparent_power', label: 'Apparent power', unit: 'VA', step: 'any' },

  { key: 'real_power', label: 'Real power', unit: 'W', step: 'any' },

  { key: 'energy_consumed', label: 'Energy consumed', unit: 'kWh', step: 'any' },

]

const equipment = [

  { name: 'Transformer T-01', location: 'Zone A · Bay 01', status: 'Normal', temp: '45°C', type: 'Transformer' },

  { name: 'Circuit Breaker CB-02', location: 'Zone A · Bay 02', status: 'Normal', temp: '38°C', type: 'Circuit breaker' },

  { name: 'Transformer T-03', location: 'Zone B · Bay 01', status: 'Warning', temp: '68°C', type: 'Transformer' },

  { name: 'Busbar BB-04', location: 'Zone B · Bay 02', status: 'Normal', temp: '41°C', type: 'Busbar' },

]

const sampleAlerts = [

  { title: 'Temperature threshold warning', detail: 'Transformer T-03 · Example event', time: '09:24 AM', severity: 'warning' },

  { title: 'Vibration level elevated', detail: 'Equipment CB-07 · Example event', time: '09:11 AM', severity: 'critical' },

]

const initialTransformerReadings: TransformerReadings = {
  Hydrogen: 100, Oxygen: 2000, Nitrogen: 50000, Methane: 20, CO: 300, CO2: 3000,
  Ethylene: 10, Ethane: 15, Acetylene: 1, DBDS: 0, power_factor: 0.95,
  interfacial_v: 35, dielectric_rigidity: 55, water_content: 20,
}

const transformerFields: { key: keyof TransformerReadings; label: string; unit: string; step?: string }[] = [
  { key: 'Hydrogen', label: 'Hydrogen (H₂)', unit: 'ppm' },
  { key: 'Oxygen', label: 'Oxygen (O₂)', unit: 'ppm' },
  { key: 'Nitrogen', label: 'Nitrogen (N₂)', unit: 'ppm' },
  { key: 'Methane', label: 'Methane (CH₄)', unit: 'ppm' },
  { key: 'CO', label: 'Carbon monoxide (CO)', unit: 'ppm' },
  { key: 'CO2', label: 'Carbon dioxide (CO₂)', unit: 'ppm' },
  { key: 'Ethylene', label: 'Ethylene (C₂H₄)', unit: 'ppm' },
  { key: 'Ethane', label: 'Ethane (C₂H₆)', unit: 'ppm' },
  { key: 'Acetylene', label: 'Acetylene (C₂H₂)', unit: 'ppm' },
  { key: 'DBDS', label: 'DBDS', unit: 'ppm' },
  { key: 'power_factor', label: 'Power factor', unit: '0–1', step: '0.01' },
  { key: 'interfacial_v', label: 'Interfacial tension', unit: 'mN/m' },
  { key: 'dielectric_rigidity', label: 'Dielectric rigidity', unit: 'kV' },
  { key: 'water_content', label: 'Water content', unit: 'ppm' },
]

function App() {

  const [activeNav, setActiveNav] = useState<NavItem>('Overview')


  const [backendOnline, setBackendOnline] = useState(false)

  const [backendChecking, setBackendChecking] = useState(true)

  const [readings, setReadings] = useState<SensorReadings>(initialReadings)

  const [prediction, setPrediction] = useState<FaultPrediction | null>(null)
  const [transformerReadings, setTransformerReadings] = useState<TransformerReadings>(initialTransformerReadings)
  const [healthAssessment, setHealthAssessment] = useState<HealthAssessment | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState('')



  const [search, setSearch] = useState('')

  const [latestUpdatedAt, setLatestUpdatedAt] = useState('')

  const [latestAvailable, setLatestAvailable] = useState(false)

  async function refreshBackendStatus() {

    setBackendChecking(true)

    try {

      await checkBackend()

      setBackendOnline(true)

    } catch {

      setBackendOnline(false)

    } finally {

      setBackendChecking(false)

    }

  }

  // Check backend when the dashboard opens.

  useEffect(() => {

    void refreshBackendStatus()

  }, [])

  // Automatically fetch the latest Swagger/hardware-submitted prediction.

  useEffect(() => {

    let active = true

    async function syncLatestData() {

      try {

        const latest = await fetchLatest()

        if (!active) return

        if (!latest.available || !latest.readings || !latest.prediction) {

          setLatestAvailable(false)

          return

        }

        setReadings(latest.readings)

        setPrediction(latest.prediction)

        setLatestUpdatedAt(latest.updated_at ?? '')

        setLatestAvailable(true)

        setBackendOnline(true)


      } catch {

        // Keep the existing dashboard data if one refresh fails.

      }

    }

    void syncLatestData()

    const timer = window.setInterval(() => {

      void syncLatestData()

    }, 3000)

    return () => {

      active = false

      window.clearInterval(timer)

    }

  }, [])

  const navItems: { label: NavItem; icon: typeof LayoutDashboard }[] = [

    { label: 'Overview', icon: LayoutDashboard },

    { label: 'Live Monitoring', icon: Radio },

    { label: 'Equipment', icon: Cpu },

    { label: 'Fault Analysis', icon: BarChart3 },
    { label: 'Health Index', icon: Gauge },

    { label: 'Alerts', icon: Bell },

    { label: 'Analytics', icon: Activity },

    { label: 'Settings', icon: Settings },

  ]

  async function runHealthAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHealthLoading(true)
    setHealthError('')
    setHealthAssessment(null)
    try {
      const result = await assessTransformer(transformerReadings)
      setHealthAssessment(result)
      if (!result.available) setHealthError(result.message || 'Health model is not available.')
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : 'Health assessment failed.')
    } finally {
      setHealthLoading(false)
    }
  }

  const probabilityPercent = prediction

    ? Math.max(0, Math.min(100, prediction.fault_probability * 100))

    : 0

  const pageDescriptions: Record<NavItem, string> = {

    Overview: 'System status, sensor telemetry and recent events.',

    'Live Monitoring': 'Latest backend readings, refreshed automatically.',

    Equipment: 'Example equipment inventory for the demo environment.',

    'Fault Analysis': 'Inspect the latest dataset-trained classifier result.',
    'Health Index': 'Estimate transformer health and life expectation using dissolved-gas and oil-condition readings.',

    Alerts: 'Example alert history; no live alert feed is connected.',

    Analytics: 'Illustrative metrics and sample inventory.',

    Settings: 'Workspace and backend connectivity settings.',

  }

  return (

    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon"><Activity size={22} /></div>

          <div>

            <h1>FUSION<span>.</span></h1>

            <p>GRID INTELLIGENCE</p>

          </div>

        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation" aria-label="Main navigation">

          {navItems.map(({ label, icon: Icon }) => (

            <button

              key={label}

              className={`nav-item ${activeNav === label ? 'active' : ''}`}

              onClick={() => setActiveNav(label)}

              aria-current={activeNav === label ? 'page' : undefined}

            >

              <Icon size={18} />

              <span>{label}</span>

              {label === 'Live Monitoring' && (

                <span className="nav-tag">LIVE</span>

              )}

            </button>

          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="system-card">

            <div className="system-card-title">

              <span className={`status-dot ${backendOnline ? 'online' : 'offline'}`} />

              SYSTEM CONNECTION

            </div>

            <strong>

              {backendChecking

                ? 'Checking backend…'

                : backendOnline

                  ? 'Backend connected'

                  : 'Backend offline'}

            </strong>

            <p>FastAPI · Latest prediction sync</p>

            <button

              className="sidebar-refresh"

              onClick={() => void refreshBackendStatus()}

              disabled={backendChecking}

            >

              <RefreshCw size={13} /> Refresh status

            </button>

          </div>

          <div className="profile">

            <div className="avatar">FG</div>

            <div className="profile-text">

              <strong>Grid Operator</strong>

              <span>FUSION workspace</span>

            </div>

          </div>

        </div>

      </aside>

      <main className="main-area">

        <header className="topbar">

          <div className="breadcrumb">

            Workspace <span>/</span> <strong>{activeNav}</strong>

          </div>

          <div className="topbar-actions">

            <span className="environment-tag">

              <span className="status-dot demo" /> BACKEND SYNC

            </span>

            <button

              className="icon-button"

              aria-label="Open alerts"

              onClick={() => setActiveNav('Alerts')}

            >

              <Bell size={18} />

            </button>

            <div className="date-label">FUSION WORKSPACE</div>

          </div>

        </header>

        <div className="page-content">

          <section className="welcome-row">

            <div>

              <div className="eyebrow">

                <span className="eyebrow-line" />

                ELECTRICAL GRID MONITORING

              </div>

              <h2>{activeNav === 'Overview' ? 'System overview' : activeNav}</h2>

              <p className="subtitle">{pageDescriptions[activeNav]}</p>

            </div>
</section>

          <div className="notice-banner">

            <AlertTriangle size={17} />

            <span>

              <strong>Data status.</strong>{' '}

              {latestAvailable

                ? 'Showing the latest sensor readings and prediction received from the backend.'

                : 'Waiting for a successful prediction submission. Submit JSON in Swagger to populate the dashboard.'}

              {' '}Model output is a dataset-based classification, not a validated future-failure prediction.

            </span>

          </div>

          {activeNav === 'Overview' && (

            <>

              <section className="metrics-grid">

                <MetricCard

                  title="TOTAL EQUIPMENT"

                  value="12"

                  unit="units"

                  note="Illustrative inventory"

                  icon={<Cpu />}

                  color="blue"

                />

                <MetricCard

                  title="LATEST STATUS"

                  value={prediction?.status_label ?? 'Waiting'}

                  unit=""

                  note="Latest model result"

                  icon={<ShieldCheck />}

                  color="green"

                />

                <MetricCard

                  title="FAULT SCORE"

                  value={prediction ? `${probabilityPercent.toFixed(2)}%` : '—'}

                  unit=""

                  note="Model score, not real-world risk"

                  icon={<AlertTriangle />}

                  color="orange"

                />

                <MetricCard

                  title="MODEL STATUS"

                  value={backendChecking ? 'Checking' : backendOnline ? 'Connected' : 'Offline'}

                  unit=""

                  note="FastAPI backend"

                  icon={<Activity />}

                  color="purple"

                />

              </section>

              <SectionHeading

                title="Electrical parameters"

                description={latestAvailable ? 'Latest backend readings' : 'Waiting for backend readings'}

                action={

                  <button className="text-button" onClick={() => setActiveNav('Live Monitoring')}>

                    View readings <ArrowUpRight size={14} />

                  </button>

                }

              />

              <section className="sensor-grid">

                <SensorCard icon={<Zap />} title="Voltage" value={latestAvailable ? String(readings.voltage) : '—'} unit="V" detail="Backend reading" color="blue" />

                <SensorCard icon={<Gauge />} title="Current" value={latestAvailable ? String(readings.current) : '—'} unit="A" detail="Backend reading" color="purple" />

                <SensorCard icon={<Thermometer />} title="Temperature" value={latestAvailable ? String(readings.temperature) : '—'} unit="°C" detail="Backend reading" color="orange" />

                <SensorCard icon={<Activity />} title="Vibration" value={latestAvailable ? String(readings.vibration_level) : '—'} unit="mm/s" detail="Backend reading" color="green" />

              </section>

              <section className="dashboard-grid">

                <div className="panel chart-panel">

                  <PanelHeader title="Latest sensor readings" description="Values received from the backend" />

                  {latestAvailable ? (

                    <div className="parameter-list">

                      <ParameterRow name="Frequency" value={`${readings.frequency} Hz`} />

                      <ParameterRow name="Power factor" value={String(readings.power_factor)} />

                      <ParameterRow name="Device age" value={`${readings.device_age_years} years`} />

                      <ParameterRow name="Energy consumed" value={`${readings.energy_consumed} kWh`} />

                      <ParameterRow name="Terminal efficiency" value={`${readings.terminal_efficiency}%`} />

                      <ParameterRow name="Load variation" value={`${readings.load_variation}%`} />

                    </div>

                  ) : (

                    <EmptyMessage message="No backend readings received yet. Submit a JSON prediction in Swagger." />

                  )}

                </div>

                <div className="panel prediction-panel">
                  <PanelHeader
                    title="Latest AI classification"
                    description="Result received from the backend."
                    action={<button className="text-button" onClick={() => setActiveNav('Fault Analysis')}>Details <ArrowUpRight size={14} /></button>}
                  />
                  <PredictionSummary
                    prediction={latestAvailable ? prediction : null}
                    probabilityPercent={probabilityPercent}
                  />
                </div>

              </section>

            </>

          )}

          {activeNav === 'Live Monitoring' && (
            <div className="live-monitoring-page">
              <SubstationScene backendOnline={backendOnline} latestAvailable={latestAvailable} readings={readings} />
              <section className="panel full-panel">
                <PanelHeader
                  title="Live sensor readings"
                  description="Automatically synced from the backend every 3 seconds."
                  action={<span className="table-count">13 parameters</span>}
                />
                <div className="sync-status">
                  <span className={`status-dot ${latestAvailable ? 'online' : 'offline'}`} />
                  <div>
                    <strong>{latestAvailable ? 'Latest backend data received' : 'Waiting for backend data'}</strong>
                    <p>{latestUpdatedAt ? `Last update: ${new Date(latestUpdatedAt).toLocaleString()}` : 'Submit sensor data through POST /predict to populate the dashboard.'}</p>
                  </div>
                  <button className="outline-button" onClick={() => void refreshBackendStatus()} disabled={backendChecking}>
                    <RefreshCw size={14} /> Check connection
                  </button>
                </div>
                {latestAvailable ? (
                  <>
                    <div className="live-summary-strip">
                      <div><span>GRID FREQUENCY</span><strong>{readings.frequency}<small>Hz</small></strong></div>
                      <div><span>POWER FACTOR</span><strong>{Number(readings.power_factor).toFixed(2)}</strong></div>
                      <div><span>VIBRATION</span><strong>{readings.vibration_level}<small>mm/s</small></strong></div>
                      <div><span>ENERGY CONSUMED</span><strong>{readings.energy_consumed}<small>kWh</small></strong></div>
                    </div>
                    <div className="live-section-caption"><div><strong>Electrical parameters</strong><span>Latest values received from the backend</span></div><span className="live-refresh-label"><i /> AUTO-REFRESH · 3 SEC</span></div>
                    <div className="live-summary-strip">
                      <div><span>GRID FREQUENCY</span><strong>{readings.frequency}<small>Hz</small></strong></div>
                      <div><span>POWER FACTOR</span><strong>{Number(readings.power_factor).toFixed(2)}</strong></div>
                      <div><span>VIBRATION</span><strong>{readings.vibration_level}<small>mm/s</small></strong></div>
                      <div><span>ENERGY CONSUMED</span><strong>{readings.energy_consumed}<small>kWh</small></strong></div>
                    </div>
                    <div className="live-section-caption"><div><strong>Electrical parameters</strong><span>Latest values received from the backend</span></div><span className="live-refresh-label"><i /> AUTO-REFRESH · 3 SEC</span></div>
                    <div className="input-grid">
                      {fields.map(field => (
                        <div className="sensor-input" key={field.key}>
                          <span className="sensor-input-label">{field.label}</span>
                          <strong className="sensor-input-value">{readings[field.key]}<small>{field.unit}</small></strong>
                          <span className="sensor-input-state"><i /> Live reading</span>
                        </div>
                      ))}
                    </div>
                    <div className="inline-latest-result">
                      <PredictionSummary prediction={prediction} probabilityPercent={probabilityPercent} />
                      <button className="text-button" onClick={() => setActiveNav('Fault Analysis')}>
                        View feature analysis <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <EmptyMessage message="No backend readings received yet. Submit sensor data through POST /predict in Swagger. This panel will update automatically." />
                )}
                <p className="panel-footnote">
                  Values come from the backend. No sample readings are generated here. The model score is not a validated estimate of real-world failure risk.
                </p>
              </section>
            </div>
          )}

          {activeNav === 'Equipment' && (

            <section className="panel full-panel">

              <PanelHeader

                title="Equipment inventory"

                description="Illustrative records; not connected to physical devices."

                action={<span className="table-count">4 sample records</span>}

              />

              <div className="table-toolbar">

                <div className="search-field">

                  <input

                    value={search}

                    onChange={e => setSearch(e.target.value)}

                    placeholder="Search equipment or location…"

                  />

                </div>

                <span className="demo-label">SAMPLE DATA</span>

              </div>

              <div className="table-wrap">

                <table>

                  <thead>

                    <tr><th>Equipment</th><th>Location</th><th>Type</th><th>Temperature</th><th>Status</th></tr>

                  </thead>

                  <tbody>

                    {equipment

                      .filter(item => `${item.name} ${item.location} ${item.type}`.toLowerCase().includes(search.toLowerCase()))

                      .map(item => (

                        <tr key={item.name}>

                          <td><span className="table-equipment-icon"><Cpu size={16} /></span><strong>{item.name}</strong></td>

                          <td>{item.location}</td>

                          <td>{item.type}</td>

                          <td>{item.temp}</td>

                          <td><StatusPill status={item.status} /></td>

                        </tr>

                      ))}

                  </tbody>

                </table>

              </div>

              <p className="panel-footnote">Equipment records remain illustrative sample data.</p>

            </section>

          )}

          {activeNav === 'Fault Analysis' && (
            <section className="analysis-layout">
              <div className="panel input-quick-panel">
                <PanelHeader title="Latest prediction input" description="Sensor readings received from the backend." />
                {latestAvailable ? (
                  <>
                    <div className="quick-reading-list">
                      {fields.map(field => (
                        <ParameterRow key={field.key} name={field.label} value={`${readings[field.key]} ${field.unit}`} />
                      ))}
                    </div>
                    {latestUpdatedAt && <p className="panel-footnote">Last updated: {new Date(latestUpdatedAt).toLocaleString()}</p>}
                    <button className="outline-button" onClick={() => setActiveNav('Live Monitoring')}>
                      View live readings <SlidersHorizontal size={15} />
                    </button>
                  </>
                ) : (
                  <EmptyMessage message="Waiting for a prediction from the backend. Submit sensor data through POST /predict." />
                )}
              </div>
              <div className="panel result-detail-panel">
                <PredictionSummary prediction={latestAvailable ? prediction : null} probabilityPercent={probabilityPercent} />
                <PanelHeader title="Top influencing features" description="Feature contributions returned by the backend." />
                {latestAvailable && prediction ? (
                  prediction.top_influencing_features.map(item => (
                    <div className="feature-row" key={item.feature}>
                      <div className="feature-copy">
                        <strong>{item.feature}</strong>
                        <span>Sensor value: {Number(item.sensor_value.toFixed(3))}</span>
                      </div>
                      <span className={`feature-contribution ${item.contribution > 0 ? 'positive' : 'negative'}`}>
                        {item.contribution > 0 ? '+' : ''}{item.contribution.toFixed(4)}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyMessage message="No feature analysis is available until the backend returns a prediction." />
                )}
                {latestAvailable && prediction && (
                  <>
                    <p className="panel-footnote">{prediction.model_type} · {prediction.prediction_type}</p>
                    <p className="warning-copy">{prediction.warning}</p>
                  </>
                )}
              </div>
            </section>
          )}

          {activeNav === 'Alerts' && (

            <section className="panel full-panel">

              <PanelHeader

                title="Alert history"

                description="Example events; not generated by connected hardware."

                action={<span className="table-count">2 sample alerts</span>}

              />

              {sampleAlerts.map(alert => (

                <div className="alert-item" key={alert.title}>

                  <div className={`alert-icon ${alert.severity}`}><AlertTriangle size={17} /></div>

                  <div className="alert-copy">

                    <strong>{alert.title}</strong>

                    <p>{alert.detail}</p>

                    <span>{alert.time} · SIMULATED</span>

                  </div>

                </div>

              ))}

              <p className="panel-footnote">These alerts are examples and are not generated from the latest prediction.</p>

            </section>

          )}

          {activeNav === 'Health Index' && (
            <section className="health-page">
              <div className="health-intro panel">
                <div className="health-intro-icon"><Gauge size={24} /></div>
                <div>
                  <h3>Transformer Health Assessment</h3>
                  <p>Enter dissolved-gas analysis (DGA) and oil-condition readings, then run the trained backend model.</p>
                </div>
                <span className={`health-model-pill ${backendOnline ? 'online' : 'offline'}`}>{backendOnline ? 'API connected' : 'API offline'}</span>
              </div>
              <form className="panel health-form" onSubmit={runHealthAssessment}>
                <PanelHeader title="Assessment inputs" description="Use readings from your transformer test report and the units expected by your training dataset." />
                <div className="health-fields-grid">
                  {transformerFields.map(field => (
                    <label className="health-field" key={field.key}>
                      <span>{field.label}</span>
                      <div className="health-input-wrap">
                        <input type="number" min="0" max={field.key === 'power_factor' ? '1' : undefined} step={field.step ?? 'any'} required value={transformerReadings[field.key]} onChange={event => setTransformerReadings(current => ({ ...current, [field.key]: Number(event.target.value) }))} />
                        <small>{field.unit}</small>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="health-form-footer">
                  <p>Results depend on the trained model, its dataset, and input units. They are not a substitute for an engineering inspection.</p>
                  <button className="primary-button" type="submit" disabled={healthLoading || !backendOnline}><Gauge size={17} /> {healthLoading ? 'Assessing…' : 'Assess transformer health'}</button>
                </div>
              </form>
              {healthError && <div className="health-error"><AlertTriangle size={18} /><div><strong>Assessment unavailable</strong><p>{healthError}</p></div></div>}
              {healthAssessment?.available && (
                <div className="health-results-grid">
                  <div className="panel health-result-card"><span className="health-result-label">PREDICTED HEALTH INDEX</span><strong>{healthAssessment.health_index ?? '—'}<small> / model scale</small></strong><p>Predicted by the loaded health-index model.</p></div>
                  <div className="panel health-result-card"><span className="health-result-label">LIFE EXPECTATION</span><strong>{healthAssessment.life_expectation ?? '—'}<small> / model units</small></strong><p>Interpret units according to the model training data.</p></div>
                  <div className="panel health-result-message"><ShieldCheck size={22} /><div><strong>Assessment completed</strong><p>{healthAssessment.message}</p>{healthAssessment.updated_at && <small>Updated {new Date(healthAssessment.updated_at).toLocaleString()}</small>}</div></div>
                </div>
              )}
              {!healthAssessment && !healthError && <p className="health-empty-note">No health assessment displayed yet. Submit readings above to request a prediction.</p>}
            </section>
          )}

          {activeNav === 'Analytics' && (

            <section className="metrics-grid">

              <MetricCard title="SAMPLE INVENTORY" value="12" unit="units" note="Illustrative total" icon={<Cpu />} color="blue" />

              <MetricCard title="LATEST MODEL STATUS" value={prediction?.status_label ?? 'Waiting'} unit="" note="Latest backend prediction" icon={<ShieldCheck />} color="green" />

              <MetricCard title="FAULT SCORE" value={prediction ? `${probabilityPercent.toFixed(2)}%` : '—'} unit="" note="Model score" icon={<AlertTriangle />} color="orange" />

              <MetricCard title="MODEL STATUS" value={backendOnline ? 'Connected' : 'Offline'} unit="" note="FastAPI backend" icon={<Activity />} color="purple" />

            </section>

          )}

          {activeNav === 'Settings' && (

            <section className="settings-grid">

              <div className="panel">

                <PanelHeader title="Workspace settings" description="Current connection configuration." />
<SettingRow

                  icon={<Wifi size={18} />}

                  title="Backend connection"

                  detail={backendOnline ? 'FastAPI backend is reachable.' : 'Backend could not be reached.'}

                  control={

                    <button className="outline-button" onClick={() => void refreshBackendStatus()} disabled={backendChecking}>

                      {backendChecking ? 'Checking…' : 'Test connection'}

                    </button>

                  }

                />

                <SettingRow

                  icon={<ShieldCheck size={18} />}

                  title="Model limitation"

                  detail="Dataset-based classification, not validated future failure prediction."

                />

              </div>

              <div className="panel">

                <PanelHeader title="Connection status" description="API health and latest data." />

                <div className="connection-status">

                  <div className={`connection-icon ${backendOnline ? 'connected' : 'disconnected'}`}>

                    {backendOnline ? <Wifi size={24} /> : <WifiOff size={24} />}

                  </div>

                  <div>

                    <strong>{backendChecking ? 'Checking…' : backendOnline ? 'Backend connected' : 'Backend offline'}</strong>

                    <p>{latestAvailable ? 'Latest prediction data is available.' : 'Waiting for a submitted prediction.'}</p>

                  </div>

                </div>

                <button className="primary-button light-button" onClick={() => void refreshBackendStatus()} disabled={backendChecking}>

                  <RefreshCw size={15} /> Refresh status

                </button>

              </div>

            </section>

          )}

          <footer className="page-footer">

            <span>FUSION <b>·</b> Grid intelligence platform</span>

            <span>{latestAvailable ? 'Latest backend data synced' : 'Waiting for backend telemetry'}</span>

          </footer>

        </div>

      </main>

    </div>

  )

}

function SubstationScene({ backendOnline, latestAvailable, readings }: { backendOnline: boolean; latestAvailable: boolean; readings: SensorReadings }) {
  const sceneStyle: React.CSSProperties = {
    position: 'relative', overflow: 'hidden', borderRadius: 18, minHeight: 390,
    marginBottom: 22, background: 'linear-gradient(135deg, #071b35 0%, #123b5b 48%, #0b263e 100%)',
    boxShadow: '0 14px 35px rgba(24, 55, 88, .14)', color: '#fff', isolation: 'isolate'
  }
  const overlayStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 2, top: 20, left: 20, width: 218, padding: '16px 17px',
    borderRadius: 12, background: 'rgba(5, 26, 42, .86)', border: '1px solid #72f58b',
    boxShadow: '0 0 22px rgba(69, 255, 125, .18)', backdropFilter: 'blur(8px)'
  }
  const secondOverlayStyle: React.CSSProperties = {
    ...overlayStyle, left: 'auto', right: 20, top: 20, borderColor: '#3fe4ff',
    boxShadow: '0 0 22px rgba(63, 228, 255, .18)'
  }
  const labelStyle: React.CSSProperties = { fontSize: 10, letterSpacing: 1.6, color: '#b5c9dc', fontWeight: 700 }
  const valueStyle: React.CSSProperties = { display: 'block', fontSize: 25, fontWeight: 750, margin: '8px 0 5px', lineHeight: 1.1 }
  return (
    <section style={sceneStyle} aria-label="Substation visual monitoring">
      <div style={{ position: 'absolute', inset: 0, opacity: .22, backgroundImage: 'linear-gradient(rgba(127,205,245,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(127,205,245,.22) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
      <div style={{ position: 'absolute', left: '24%', right: '24%', top: 95, bottom: 8, zIndex: 1 }}>
        <svg viewBox="0 0 700 300" role="img" aria-label="Illustration of an electrical substation with transformers, steel gantries and power lines" style={{ width: '100%', height: '100%', minHeight: 250 }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="yardGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#244f69"/><stop offset="1" stopColor="#0b2439"/></linearGradient>
            <linearGradient id="transformerMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8e7ef"/><stop offset="1" stopColor="#6d8fa5"/></linearGradient>
          </defs>
          <path d="M25 245 L350 205 L675 245 L350 292 Z" fill="url(#yardGround)" stroke="#4d829b" strokeWidth="1.5" />
          {[70,150,230,310,390,470,550,630].map((x) => <g key={x} stroke="#6c9eb4" strokeWidth="2" opacity=".7"><path d={`M${x} 72 L${x} 238`} /><path d={`M${x-16} 95 L${x+16} 95`} /><path d={`M${x-16} 120 L${x+16} 120`} /></g>)}
          {[0,1,2].map((n) => <g key={n} transform={`translate(${80+n*205},${n===1?0:14})`} stroke="#a9c5d5" strokeWidth="3" fill="none"><path d="M0 65 L22 0 L44 65 M9 40 L35 40 M4 55 L40 55 M22 0 L22 70"/><path d="M-8 10 L52 10 M-12 25 L56 25" stroke="#72d8f5" strokeWidth="2"/><path d="M-25 10 L-12 10 M52 10 L65 10" stroke="#72d8f5" strokeWidth="2"/></g>)}
          <g transform="translate(205 155)"><rect x="0" y="30" width="118" height="57" rx="5" fill="url(#transformerMetal)" stroke="#d8edf5" strokeWidth="2"/><rect x="12" y="16" width="94" height="17" rx="3" fill="#91afbf" stroke="#d8edf5"/><g stroke="#385e73" strokeWidth="3">{[17,29,41,53,65,77,89,101].map(x=><path key={x} d={`M${x} 37 v42`}/>)}</g><rect x="20" y="5" width="12" height="15" fill="#dceaf1"/><rect x="52" y="0" width="12" height="20" fill="#dceaf1"/><rect x="84" y="5" width="12" height="15" fill="#dceaf1"/><path d="M18 87 v13 M100 87 v13" stroke="#a8c5d3" strokeWidth="5"/></g>
          <g transform="translate(410 180)"><rect width="105" height="48" rx="4" fill="#8eabbc" stroke="#d6e7ef" strokeWidth="2"/><g stroke="#3c6277" strokeWidth="3">{[10,22,34,46,58,70,82,94].map(x=><path key={x} d={`M${x} 6 v36`}/>)}</g><path d="M12 0 V-20 M36 0 V-28 M60 0 V-20 M84 0 V-28" stroke="#c5dbe5" strokeWidth="5"/><path d="M12 -20 h72" stroke="#63e6ff" strokeWidth="2"/></g>
          <path d="M20 70 C160 60 230 80 350 68 S550 65 680 72" fill="none" stroke="#62dfff" strokeWidth="2" opacity=".8"/><path d="M20 82 C160 72 230 92 350 80 S550 77 680 84" fill="none" stroke="#62dfff" strokeWidth="1" opacity=".55"/>
          <g fill="#77f69a"><circle cx="262" cy="192" r="4"><animate attributeName="opacity" values=".35;1;.35" dur="2s" repeatCount="indefinite"/></circle><circle cx="457" cy="202" r="4"/></g>
        </svg>
      </div>
      <div style={overlayStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: '#6eff91', boxShadow: '0 0 10px #6eff91' }} /><span style={labelStyle}>SUBSTATION 1</span></div>
        <strong style={valueStyle}>{backendOnline ? 'ONLINE' : 'CONNECTING'}</strong>
        <div style={{ fontSize: 12, color: '#b8d1df' }}>Grid connection status</div>
        <div style={{ height: 4, borderRadius: 8, background: '#244355', marginTop: 13, overflow: 'hidden' }}><div style={{ width: backendOnline ? '100%' : '38%', height: '100%', background: '#6eff91', borderRadius: 8 }} /></div>
      </div>
      <div style={secondOverlayStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: '#3fe4ff', boxShadow: '0 0 10px #3fe4ff' }} /><span style={labelStyle}>TRANSFORMER 1</span></div>
        <strong style={valueStyle}>{latestAvailable ? `${readings.temperature}°C` : '— °C'}</strong>
        <div style={{ fontSize: 12, color: '#b8d1df' }}>Transformer temperature</div>
        <div style={{ height: 4, borderRadius: 8, background: '#244355', marginTop: 13, overflow: 'hidden' }}><div style={{ width: latestAvailable ? `${Math.max(0, Math.min(100, readings.temperature))}%` : '12%', height: '100%', background: '#3fe4ff', borderRadius: 8 }} /></div>
      </div>
      <div style={{ position: 'absolute', zIndex: 2, left: 22, bottom: 19 }}><div style={{ fontSize: 10, letterSpacing: 2, color: '#8fb6cb', fontWeight: 700 }}>FUSION GRID VISUALIZATION</div><div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>Substation overview</div></div>
      <div style={{ position: 'absolute', zIndex: 2, right: 22, bottom: 22, display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#c2d9e6' }}><span style={{ width: 7, height: 7, borderRadius: 50, background: latestAvailable ? '#6eff91' : '#ffba61' }} />{latestAvailable ? 'TELEMETRY RECEIVED' : 'AWAITING TELEMETRY'}</div>
    </section>
  )
}

function MetricCard({

  title, value, unit, note, icon, color,

}: {

  title: string

  value: string

  unit: string

  note: string

  icon: React.ReactNode

  color: string

}) {

  return (

    <div className="metric-card">

      <div className={`metric-icon ${color}`}>{icon}</div>

      <div className="metric-title">{title}</div>

      <div className="metric-value">{value}<span>{unit}</span></div>

      <div className="metric-note">{note}</div>

    </div>

  )

}

function SensorCard({

  icon, title, value, unit, detail, color,

}: {

  icon: React.ReactNode

  title: string

  value: string

  unit: string

  detail: string

  color: string

}) {

  return (

    <div className="sensor-card">

      <div className="sensor-top">

        <span className={`sensor-icon ${color}`}>{icon}</span>

        <span className="sensor-live">BACKEND</span>

      </div>

      <div className="sensor-title">{title}</div>

      <div className="sensor-value">{value}<span>{unit}</span></div>

      <div className="sensor-detail">{detail}</div>

    </div>

  )

}

function SectionHeading({

  title, description, action,

}: {

  title: string

  description: string

  action?: React.ReactNode

}) {

  return (

    <div className="section-heading">

      <div><h3>{title}</h3><p>{description}</p></div>

      {action}

    </div>

  )

}

function PanelHeader({

  title, description, action,

}: {

  title: string

  description: string

  action?: React.ReactNode

}) {

  return (

    <div className="panel-header">

      <div><h3>{title}</h3><p>{description}</p></div>

      {action}

    </div>

  )

}

function ParameterRow({ name, value }: { name: string; value: string }) {

  return (

    <div className="parameter-row">

      <span>{name}</span>

      <strong>{value}</strong>

    </div>

  )

}

function EmptyMessage({ message }: { message: string }) {

  return (

    <div className="empty-state">

      <div className="empty-state-icon"><BarChart3 size={22} /></div>

      <strong>No data available</strong>

      <p>{message}</p>

    </div>

  )

}

function PredictionSummary({

  prediction, probabilityPercent,

}: {

  prediction: FaultPrediction | null

  probabilityPercent: number

}) {

  const fault = prediction?.status_label === 'FAULT'

  return (

    <>

      <div className={`prediction-result ${fault ? 'fault-result' : ''}`}>

        <div className="prediction-icon">

          {fault ? <AlertTriangle size={25} /> : <ShieldCheck size={25} />}

        </div>

        <div>

          <span className="result-label">{prediction ? 'MODEL RESULT' : 'READY TO TEST'}</span>

          <h4>{prediction?.status_label ?? 'No prediction'}</h4>

          <p>{prediction ? 'Dataset-trained classifier output' : 'Submit sensor data to see a result'}</p>

        </div>

      </div>

      <div className="probability-heading">

        <span>Fault probability score</span>

        <strong>{prediction ? `${probabilityPercent.toFixed(2)}%` : '—'}</strong>

      </div>

      <div className="progress-track">

        <div

          className={`progress-fill ${fault ? 'fault-fill' : ''}`}

          style={{ width: `${probabilityPercent}%` }}

        />

      </div>

      <div className="prediction-note">

        <AlertTriangle size={15} />

        <span>Dataset-based classification only; not a validated prediction of future failure.</span>

      </div>

    </>

  )

}

function SettingRow({

  icon, title, detail, control,

}: {

  icon: React.ReactNode

  title: string

  detail: string

  control?: React.ReactNode

}) {

  return (

    <div className="setting-row">

      <div className="setting-icon">{icon}</div>

      <div className="setting-copy"><strong>{title}</strong><span>{detail}</span></div>

      {control}

    </div>

  )

}

function StatusPill({ status }: { status: string }) {

  const cls =

    status.toLowerCase() === 'normal'

      ? 'normal'

      : status.toLowerCase() === 'warning'

        ? 'warning'

        : 'unknown'

  return <span className={`status-pill ${cls}`}><i />{status}</span>

}

export default App
