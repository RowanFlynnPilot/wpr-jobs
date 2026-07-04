import { useState } from 'react'
import { supabase } from '../supabase.js'
import { PRICE_LABEL, FEATURED_PRICE_LABEL, POSTING_DAYS } from '../config.js'
import { CATEGORIES, EMPLOYMENT_TYPES } from '../lib/taxonomy.js'
import JobCard from '../components/JobCard.jsx'

const BLANK = {
  tier: 'standard',
  company: '',
  title: '',
  location: 'Wausau, WI',
  employment_type: 'full_time',
  category: '',
  pay_min: '',
  pay_max: '',
  pay_period: 'hour',
  description: '',
  apply_method: 'url',
  apply_url: '',
  apply_email: '',
  contact_name: '',
  contact_email: '',
}

export default function PostJob() {
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.description.trim().length < 40) {
      setError('Description needs at least 40 characters — give candidates something to go on.')
      return
    }

    const payload = {
      tier: form.tier,
      company: form.company,
      title: form.title,
      location: form.location,
      employment_type: form.employment_type,
      category: form.category,
      pay_min: form.pay_min === '' ? null : Number(form.pay_min),
      pay_max: form.pay_max === '' ? null : Number(form.pay_max),
      pay_period: form.pay_min === '' && form.pay_max === '' ? null : form.pay_period,
      description: form.description,
      apply_url: form.apply_method === 'url' ? form.apply_url : null,
      apply_email: form.apply_method === 'email' ? form.apply_email : null,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
    }

    setSubmitting(true)
    const { data, error: fnError } = await supabase.functions.invoke('submit-job', {
      body: payload,
    })

    if (fnError) {
      // Surface the function's own message when it returned one.
      let message = fnError.message
      try {
        const details = await fnError.context.json()
        if (details?.error) message = details.error
      } catch {
        /* keep the generic message */
      }
      setError(message)
      setSubmitting(false)
      return
    }

    window.location.assign(data.url)
  }

  return (
    <div className="page page-narrow">
      <a className="back-link" href="#/">&larr; Back to the board</a>

      <header className="form-header">
        <div className="eyebrow">
          <span className="eyebrow-rule" />
          <span>Post a job</span>
          <span className="eyebrow-rule" />
        </div>
        <h1>Reach Marathon County&rsquo;s workforce</h1>
        <p className="lede">
          {PRICE_LABEL} for a {POSTING_DAYS}-day posting, or{' '}
          {FEATURED_PRICE_LABEL} to feature it at the top of the board. Our
          newsroom reviews every submission before it goes live &mdash;
          usually within one business day.
        </p>
      </header>

      <form className="job-form" onSubmit={onSubmit}>
        <fieldset disabled={submitting}>
          <div className="field-group">
            <div className="field-group-label">Posting tier</div>
            <label className="radio tier-option">
              <input
                type="radio"
                name="tier"
                value="standard"
                checked={form.tier === 'standard'}
                onChange={set('tier')}
              />
              <span>
                <strong>Standard &mdash; {PRICE_LABEL}.</strong>{' '}
                {POSTING_DAYS} days on the board, newest first.
              </span>
            </label>
            <label className="radio tier-option">
              <input
                type="radio"
                name="tier"
                value="featured"
                checked={form.tier === 'featured'}
                onChange={set('tier')}
              />
              <span>
                <strong>Featured &mdash; {FEATURED_PRICE_LABEL}.</strong>{' '}
                Front and center at the top of the board for the full{' '}
                {POSTING_DAYS} days, with the standout treatment.
              </span>
            </label>
          </div>

          <label>
            Company name
            <input required minLength={2} maxLength={120} value={form.company} onChange={set('company')} />
          </label>

          <label>
            Job title
            <input required minLength={3} maxLength={120} value={form.title} onChange={set('title')} />
          </label>

          <label>
            Location
            <input required minLength={2} maxLength={120} value={form.location} onChange={set('location')} />
          </label>

          <div className="field-row">
            <label>
              Employment type
              <select value={form.employment_type} onChange={set('employment_type')}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label>
              Category
              <select required value={form.category} onChange={set('category')}>
                <option value="" disabled>Choose one</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-group">
            <div className="field-group-label">
              Pay range <span className="optional">optional, but postings with pay get more applicants</span>
            </div>
            <div className="field-row field-row-pay">
              <label>
                Minimum
                <input type="number" min="0" step="0.01" value={form.pay_min} onChange={set('pay_min')} placeholder="18" />
              </label>
              <label>
                Maximum
                <input type="number" min="0" step="0.01" value={form.pay_max} onChange={set('pay_max')} placeholder="24" />
              </label>
              <label>
                Per
                <select value={form.pay_period} onChange={set('pay_period')}>
                  <option value="hour">Hour</option>
                  <option value="year">Year</option>
                </select>
              </label>
            </div>
          </div>

          <label>
            Job description
            <textarea
              required
              minLength={40}
              maxLength={6000}
              rows={8}
              value={form.description}
              onChange={set('description')}
              placeholder="Responsibilities, requirements, schedule, benefits. Plain text — line breaks are preserved."
            />
            <span className="char-count">
              {form.description.trim().length < 40
                ? `${form.description.trim().length} characters — ${
                    40 - form.description.trim().length
                  } more to go`
                : `${form.description.trim().length.toLocaleString()} characters`}
            </span>
          </label>

          <div className="field-group">
            <div className="field-group-label">How should candidates apply?</div>
            <div className="radio-row">
              <label className="radio">
                <input
                  type="radio"
                  name="apply_method"
                  value="url"
                  checked={form.apply_method === 'url'}
                  onChange={set('apply_method')}
                />
                Application link
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="apply_method"
                  value="email"
                  checked={form.apply_method === 'email'}
                  onChange={set('apply_method')}
                />
                Email
              </label>
            </div>
            {form.apply_method === 'url' ? (
              <label>
                Application link
                <input
                  type="url"
                  required
                  value={form.apply_url}
                  onChange={set('apply_url')}
                  placeholder="https://yourcompany.com/careers/…"
                />
              </label>
            ) : (
              <label>
                Application email
                <input
                  type="email"
                  required
                  value={form.apply_email}
                  onChange={set('apply_email')}
                  placeholder="hiring@yourcompany.com"
                />
              </label>
            )}
          </div>

          <div className="field-group">
            <div className="field-group-label">
              Your contact info <span className="optional">not published — for your receipt and questions from our team</span>
            </div>
            <div className="field-row">
              <label>
                Contact name
                <input required minLength={2} maxLength={120} value={form.contact_name} onChange={set('contact_name')} />
              </label>
              <label>
                Contact email
                <input type="email" required value={form.contact_email} onChange={set('contact_email')} />
              </label>
            </div>
          </div>

          <div className="preview-block">
            <div className="eyebrow eyebrow-left">
              <span>How it will appear on the board</span>
            </div>
            <JobCard
              preview
              open
              job={{
                id: 'preview',
                title: form.title.trim() || 'Job title',
                company: form.company.trim() || 'Company name',
                location: form.location.trim() || 'Wausau, WI',
                employment_type: form.employment_type,
                category: form.category || 'Category',
                pay_min: form.pay_min === '' ? null : Number(form.pay_min),
                pay_max: form.pay_max === '' ? null : Number(form.pay_max),
                pay_period:
                  form.pay_min === '' && form.pay_max === ''
                    ? null
                    : form.pay_period,
                description:
                  form.description.trim() ||
                  'Your job description appears here.',
                apply_url: null,
                apply_email: null,
                published_at: new Date().toISOString(),
                featured: form.tier === 'featured',
              }}
            />
          </div>

          {error && <div className="notice notice-error">{error}</div>}

          <button className="btn btn-cta btn-submit" type="submit">
            {submitting
              ? 'Starting checkout…'
              : `Continue to payment — ${form.tier === 'featured' ? FEATURED_PRICE_LABEL : PRICE_LABEL}`}
          </button>
          <p className="fine-print">
            Payment is handled by Stripe. Your posting goes to our editors the
            moment payment clears and runs for {POSTING_DAYS} days from approval.
          </p>
        </fieldset>
      </form>
    </div>
  )
}
