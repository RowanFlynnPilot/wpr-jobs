export default function Success() {
  return (
    <div className="page page-narrow success-page">
      <img
        className="board-mark"
        src="./wpr-typewriter.png"
        alt="Wausau Pilot & Review"
        width={96}
        height={96}
        decoding="async"
      />
      <div className="eyebrow">
        <span className="eyebrow-rule" />
        <span>Payment received</span>
        <span className="eyebrow-rule" />
      </div>
      <h1>Your posting is with our editors</h1>
      <p className="lede">
        We review every submission before it goes live &mdash; usually within
        one business day.
      </p>
      <ol className="next-steps">
        <li>
          <strong>Right now</strong> &mdash; your Stripe receipt is on its way
          to your inbox, and your posting is in the newsroom&rsquo;s queue.
        </li>
        <li>
          <strong>Within a business day</strong> &mdash; an editor reviews it.
          We&rsquo;ll reach out at your contact email if anything needs a
          tweak.
        </li>
        <li>
          <strong>When it&rsquo;s live</strong> &mdash; you&rsquo;ll get an
          email with a link to your posting and its run dates.
        </li>
      </ol>
      <a className="btn btn-primary" href="#/">
        Back to the board
      </a>
    </div>
  )
}
