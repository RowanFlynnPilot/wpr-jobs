import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { PRICE_LABEL, POSTING_DAYS } from '../config.js'
import { CATEGORIES, EMPLOYMENT_TYPES } from '../lib/taxonomy.js'
import JobCard from '../components/JobCard.jsx'

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

  const filtering = search.trim() !== '' || category !== 'all' || type !== 'all'

  function clearFilters() {
    setSearch('')
    setCategory('all')
    setType('all')
  }

  // Newsletter clicks outlive 30-day runs: a deep link to a posting that
  // has expired (or never existed) gets a gentle explanation, not a
  // silently unremarkable board.
  const linkedGone =
    jobId !== null && jobs !== null && !jobs.some((j) => j.id === jobId)

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const job of jobs ?? []) {
      counts[job.category] = (counts[job.category] ?? 0) + 1
    }
    return counts
  }, [jobs])

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
              {categoryCounts[c] ? `${c} (${categoryCounts[c]})` : c}
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

      {linkedGone && !error && (
        <div className="notice">
          That posting is no longer on the board &mdash; postings run for{' '}
          {POSTING_DAYS} days. Here&rsquo;s who&rsquo;s hiring now.
        </div>
      )}

      {!error && jobs === null && (
        <div className="notice notice-loading">
          Setting type<span className="cursor" aria-hidden="true" />
        </div>
      )}

      {jobs !== null && !error && (
        <>
          <div className="count-line" aria-live="polite">
            {filtered.length === 1
              ? '1 open position'
              : `${filtered.length} open positions`}
          </div>

          {filtered.length === 0 && (
            <div className="notice">
              {jobs.length === 0 ? (
                <>
                  <p>The board is fresh out of openings.</p>
                  <a className="btn btn-cta" href="#/post">
                    Be the first &mdash; post a job
                  </a>
                </>
              ) : (
                <>
                  <p>No openings match those filters.</p>
                  {filtering && (
                    <button className="btn btn-quiet" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </>
              )}
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
