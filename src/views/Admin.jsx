import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { POSTING_DAYS } from '../config.js'
import { typeLabel } from '../lib/taxonomy.js'
import { formatPay, formatDate, daysLeft } from '../lib/format.js'

// Admin = any authenticated user. Signups are disabled in Supabase Auth;
// the only accounts that exist are invited newsroom accounts.

export default function Admin() {
  const [session, setSession] = useState(undefined) // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="page"><div className="notice">Checking session…</div></div>
  if (!session) return <Login />
  return <Queue />
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setBusy(false)
    }
    // Success: onAuthStateChange in Admin swaps this view out.
  }

  return (
    <div className="page page-narrow">
      <header className="form-header">
        <div className="eyebrow">
          <span className="eyebrow-rule" />
          <span>Newsroom only</span>
          <span className="eyebrow-rule" />
        </div>
        <h1>Review queue sign-in</h1>
      </header>
      <form className="job-form" onSubmit={onSubmit}>
        <fieldset disabled={busy}>
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="notice notice-error">{error}</div>}
          <button className="btn btn-primary btn-submit" type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </fieldset>
      </form>
    </div>
  )
}

const TABS = [
  { id: 'pending', label: 'Review queue' },
  { id: 'live', label: 'Live' },
  { id: 'archive', label: 'Archive' },
]

function Queue() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('pending')

  async function loadJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setJobs(data)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const now = Date.now()
  const isLive = (j) => j.status === 'published' && new Date(j.expires_at).getTime() > now
  const isExpired = (j) => j.status === 'published' && new Date(j.expires_at).getTime() <= now

  const buckets = {
    pending: (jobs ?? []).filter((j) => j.status === 'pending_review'),
    live: (jobs ?? []).filter(isLive),
    archive: (jobs ?? []).filter((j) => j.status === 'rejected' || isExpired(j)),
  }

  async function approve(job) {
    const publishedAt = new Date()
    const expiresAt = new Date(publishedAt.getTime() + POSTING_DAYS * 86400000)
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'published',
        published_at: publishedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', job.id)
    if (error) setError(error.message)
    else await loadJobs()
  }

  async function reject(job, reason) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', job.id)
    if (error) setError(error.message)
    else await loadJobs()
  }

  async function takeDown(job) {
    if (!window.confirm(`Take down "${job.title}" at ${job.company}? It disappears from the board immediately.`)) return
    const { error } = await supabase
      .from('jobs')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', job.id)
    if (error) setError(error.message)
    else await loadJobs()
  }

  return (
    <div className="page">
      <header className="admin-header">
        <div>
          <div className="eyebrow eyebrow-left">
            <span>Now Hiring &middot; admin</span>
          </div>
          <h1>Review queue</h1>
        </div>
        <button className="btn btn-quiet" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="tab-count">{buckets[t.id].length}</span>
          </button>
        ))}
      </div>

      {error && <div className="notice notice-error">{error}</div>}
      {jobs === null && !error && <div className="notice">Loading…</div>}

      {jobs !== null && buckets[tab].length === 0 && (
        <div className="notice">
          {tab === 'pending' && 'Queue is clear. Nothing waiting on review.'}
          {tab === 'live' && 'Nothing live right now.'}
          {tab === 'archive' && 'Archive is empty.'}
        </div>
      )}

      <div className="job-list">
        {buckets[tab].map((job) => (
          <AdminCard
            key={job.id}
            job={job}
            expired={isExpired(job)}
            onApprove={() => approve(job)}
            onReject={(reason) => reject(job, reason)}
            onTakeDown={() => takeDown(job)}
          />
        ))}
      </div>
    </div>
  )
}

function AdminCard({ job, expired, onApprove, onReject, onTakeDown }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const pay = formatPay(job.pay_min, job.pay_max, job.pay_period)

  return (
    <article className="job-card admin-card open">
      <div className="job-summary as-div">
        <div className="job-main">
          <h3 className="job-title">{job.title}</h3>
          <div className="job-company">
            {job.company} &middot; {job.location}
          </div>
        </div>
        <div className="job-meta">
          <span className="badge">{typeLabel(job.employment_type)}</span>
          {pay && <span className="pay">{pay}</span>}
          {job.status === 'published' && !expired && (
            <span className="posted">{daysLeft(job.expires_at)} days left</span>
          )}
          {expired && <span className="posted">Expired {formatDate(job.expires_at)}</span>}
          {job.status === 'rejected' && <span className="posted">Rejected</span>}
        </div>
      </div>

      <div className="job-detail">
        <div className="job-facts">
          {job.category} &middot; submitted {formatDate(job.created_at)}
          {job.paid_at && <> &middot; paid {formatDate(job.paid_at)}</>}
        </div>
        <p className="job-description">{job.description}</p>
        <div className="admin-contact">
          <div>
            <span className="contact-label">Apply via</span>{' '}
            {job.apply_url ? <a href={job.apply_url} target="_blank" rel="noopener noreferrer">{job.apply_url}</a> : job.apply_email}
          </div>
          <div>
            <span className="contact-label">Contact</span> {job.contact_name} &middot;{' '}
            <a href={`mailto:${job.contact_email}`}>{job.contact_email}</a>
          </div>
          {job.rejection_reason && (
            <div>
              <span className="contact-label">Rejection reason</span> {job.rejection_reason}
            </div>
          )}
        </div>

        {job.status === 'pending_review' && !rejecting && (
          <div className="admin-actions">
            <button className="btn btn-primary" onClick={onApprove}>
              Approve &amp; publish ({POSTING_DAYS} days)
            </button>
            <button className="btn btn-quiet" onClick={() => setRejecting(true)}>
              Reject…
            </button>
          </div>
        )}

        {job.status === 'pending_review' && rejecting && (
          <div className="admin-actions admin-reject">
            <input
              autoFocus
              placeholder="Reason (kept internal, shared with employer if they ask)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className="btn btn-danger"
              disabled={reason.trim().length < 3}
              onClick={() => onReject(reason.trim())}
            >
              Confirm reject
            </button>
            <button className="btn btn-quiet" onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </div>
        )}

        {job.status === 'published' && !expired && (
          <div className="admin-actions">
            <button className="btn btn-danger" onClick={onTakeDown}>
              Take down now
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
