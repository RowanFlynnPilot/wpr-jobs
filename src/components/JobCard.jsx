import { useRef, useState } from 'react'
import { typeLabel } from '../lib/taxonomy.js'
import { formatPay, daysAgo } from '../lib/format.js'

// Where share links point. When the board is embedded on the site, set the
// repo Actions variable VITE_PUBLIC_URL to the WordPress page URL so links
// send readers there instead of raw GitHub Pages (same pattern as
// wpr-community-board). Falls back to wherever the app is running.
const PUBLIC_URL =
  import.meta.env.VITE_PUBLIC_URL ||
  `${window.location.origin}${window.location.pathname}`

// One card, two homes: the public board, and the live "how it will appear"
// preview on the submission form (preview renders open, inert, no share).
const NEW_DAYS = 3

export default function JobCard({ job, open, onToggle, preview = false }) {
  const pay = formatPay(job.pay_min, job.pay_max, job.pay_period)
  const isNew =
    !preview &&
    job.published_at &&
    Date.now() - new Date(job.published_at).getTime() < NEW_DAYS * 86400000
  const applyHref = job.apply_url
    ? job.apply_url
    : `mailto:${job.apply_email}?subject=${encodeURIComponent(
        `Application: ${job.title}`,
      )}`

  const summary = (
    <>
      <div className="job-main">
        <h3 className="job-title">{job.title}</h3>
        <div className="job-company">
          {job.company} &middot; {job.location}
        </div>
        <div className="job-badges">
          {job.featured && (
            <span className="badge badge-featured">Featured</span>
          )}
          {isNew && <span className="badge badge-new">New</span>}
          <span className="badge">{typeLabel(job.employment_type)}</span>
        </div>
      </div>
      <div className="job-meta">
        {pay && <span className="pay">{pay}</span>}
        <span className="posted">{daysAgo(job.published_at)}</span>
      </div>
    </>
  )

  return (
    <article
      id={preview ? undefined : `job-${job.id}`}
      className={`job-card${open ? ' open' : ''}${job.featured ? ' featured' : ''}`}
    >
      {preview ? (
        <div className="job-summary as-div">{summary}</div>
      ) : (
        <button className="job-summary" onClick={onToggle} aria-expanded={open}>
          {summary}
          <span className="job-toggle" aria-hidden="true">
            {open ? '−' : '+'}
          </span>
        </button>
      )}
      {open && (
        <div className="job-detail">
          <div className="job-facts">
            {job.category} &middot; {typeLabel(job.employment_type)} &middot;{' '}
            {job.location}
          </div>
          <p className="job-description">{job.description}</p>
          <div className="job-detail-actions">
            {preview ? (
              <span className="btn btn-primary btn-inert">Apply now</span>
            ) : (
              <>
                <a
                  className="btn btn-primary"
                  href={applyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply now
                </a>
                <ShareLink jobId={job.id} />
              </>
            )}
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
  const url = `${PUBLIC_URL}#/job/${jobId}`

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
