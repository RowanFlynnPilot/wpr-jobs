import { useEffect, useMemo, useRef, useState } from 'react'
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
  'published_at,expires_at,featured'

export default function Board({ jobId = null }) {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const [openId, setOpenId] = useState(jobId)

  useEffect(() => {
    supabase
      .from('jobs')
      .select(PUBLIC_COLUMNS)
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setJobs(data)
      })
  }, [])

  // Deep link (#/job/:id): once the board has loaded, bring the linked
  // card into view.
  useEffect(() => {
    if (jobId && jobs) {
      document
        .getElementById(`job-${jobId}`)
        ?.scrollIntoView({ block: 'start' })
    }
  }, [jobId, jobs])

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
        <img
          className="board-mark"
          src="./wpr-typewriter.png"
          alt="Wausau Pilot & Review"
          width={76}
          height={76}
          decoding="async"
        />
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
        <a className="btn btn-cta" href="#/post">
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
        <p>
          A community job board from{' '}
          <a
            href="https://wausaupilotandreview.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wausau Pilot &amp; Review
          </a>
          , your nonprofit local newsroom.
        </p>
        <p className="footer-family">
          More from WPR:{' '}
          <a
            href="https://wausaupilotandreview.com/community-board"
            target="_blank"
            rel="noopener noreferrer"
          >
            The Community Board
          </a>{' '}
          &middot;{' '}
          <a
            href="https://wausaupilotandreview.com/obituaries"
            target="_blank"
            rel="noopener noreferrer"
          >
            Obituaries
          </a>{' '}
          &middot;{' '}
          <a
            href="https://wausaupilotandreview.com/events"
            target="_blank"
            rel="noopener noreferrer"
          >
            Events
          </a>
        </p>
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
    <article
      id={`job-${job.id}`}
      className={`job-card${open ? ' open' : ''}${job.featured ? ' featured' : ''}`}
    >
      <button className="job-summary" onClick={onToggle} aria-expanded={open}>
        <div className="job-main">
          <h3 className="job-title">{job.title}</h3>
          <div className="job-company">
            {job.company} &middot; {job.location}
          </div>
        </div>
        <div className="job-meta">
          {job.featured && <span className="badge badge-featured">Featured</span>}
          <span className="badge">{typeLabel(job.employment_type)}</span>
          {pay && <span className="pay">{pay}</span>}
          <span className="posted">{daysAgo(job.published_at)}</span>
        </div>
      </button>
      {open && (
        <div className="job-detail">
          <div className="job-facts">{job.category}</div>
          <p className="job-description">{job.description}</p>
          <div className="job-detail-actions">
            <a
              className="btn btn-primary"
              href={applyHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apply now
            </a>
            <ShareLink jobId={job.id} />
          </div>
        </div>
      )}
    </article>
  )
}

// A deep link to this opening — works from articles, social posts, and the
// newsletter. Falls back to opening the link when the iframe denies
// clipboard access.
function ShareLink({ jobId }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  const url = `${window.location.origin}${window.location.pathname}#/job/${jobId}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  return (
    <button className="btn btn-quiet" onClick={copy} type="button">
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  )
}
