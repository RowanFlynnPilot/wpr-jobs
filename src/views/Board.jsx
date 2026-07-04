import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { PRICE_LABEL, POSTING_DAYS } from '../config.js'
import { CATEGORIES, EMPLOYMENT_TYPES, typeLabel } from '../lib/taxonomy.js'
import { formatPay, daysAgo } from '../lib/format.js'

// The anon column grant is the contract: enumerate exactly what the public
// may read. `select('*')` would fail loudly — by design. And note there is
// no status filter here: anon can't even read the status column; the RLS
// policy alone decides what is visible.
const PUBLIC_COLUMNS =
  'id,title,company,location,employment_type,category,' +
  'pay_min,pay_max,pay_period,description,apply_url,apply_email,' +
  'published_at,expires_at'

export default function Board() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    supabase
      .from('jobs')
      .select(PUBLIC_COLUMNS)
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setJobs(data)
      })
  }, [])

  const filtered = useMemo(() => {
    if (!jobs) return []
    const q = search.trim().toLowerCase()
    return jobs.filter((job) => {
      if (category !== 'all' && job.category !== category) return false
      if (type !== 'all' && job.employment_type !== type) return false
      if (!q) return true
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q)
      )
    })
  }, [jobs, search, category, type])

  return (
    <div className="page">
      <header className="board-header">
        <div className="eyebrow">
          <span className="eyebrow-rule" />
          <span>Help wanted &middot; Wausau Pilot &amp; Review</span>
          <span className="eyebrow-rule" />
        </div>
        <h1>Now Hiring in Marathon County</h1>
        <p className="lede">
          Local openings from local employers. Every posting is reviewed by our
          newsroom and runs for {POSTING_DAYS} days.
        </p>
        <a className="btn btn-primary" href="#/post">
          Post a job &mdash; {PRICE_LABEL}
        </a>
      </header>

      <div className="filters">
        <input
          type="search"
          className="filter-search"
          placeholder="Search title, company, or keywords"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search jobs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by employment type"
        >
          <option value="all">All types</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="notice notice-error">
          Couldn&rsquo;t load the board: {error}
        </div>
      )}

      {!error && jobs === null && <div className="notice">Loading openings&hellip;</div>}

      {jobs !== null && !error && (
        <>
          <div className="count-line">
            {filtered.length === 1
              ? '1 open position'
              : `${filtered.length} open positions`}
          </div>

          {filtered.length === 0 && (
            <div className="notice">
              {jobs.length === 0
                ? 'No open positions right now — check back soon.'
                : 'No openings match those filters.'}
            </div>
          )}

          <div className="job-list">
            {filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                open={openId === job.id}
                onToggle={() => setOpenId(openId === job.id ? null : job.id)}
              />
            ))}
          </div>
        </>
      )}

      <footer className="board-footer">
        A community job board from{' '}
        <a
          href="https://wausaupilotandreview.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Wausau Pilot &amp; Review
        </a>
        , your nonprofit local newsroom.
      </footer>
    </div>
  )
}

function JobCard({ job, open, onToggle }) {
  const pay = formatPay(job.pay_min, job.pay_max, job.pay_period)
  const applyHref = job.apply_url
    ? job.apply_url
    : `mailto:${job.apply_email}?subject=${encodeURIComponent(
        `Application: ${job.title}`,
      )}`

  return (
    <article className={`job-card${open ? ' open' : ''}`}>
      <button className="job-summary" onClick={onToggle} aria-expanded={open}>
        <div className="job-main">
          <h3 className="job-title">{job.title}</h3>
          <div className="job-company">
            {job.company} &middot; {job.location}
          </div>
        </div>
        <div className="job-meta">
          <span className="badge">{typeLabel(job.employment_type)}</span>
          {pay && <span className="pay">{pay}</span>}
          <span className="posted">{daysAgo(job.published_at)}</span>
        </div>
      </button>
      {open && (
        <div className="job-detail">
          <div className="job-facts">{job.category}</div>
          <p className="job-description">{job.description}</p>
          <a
            className="btn btn-primary"
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply now
          </a>
        </div>
      )}
    </article>
  )
}
