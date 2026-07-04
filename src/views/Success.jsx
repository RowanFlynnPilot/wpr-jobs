export default function Success() {
  return (
    <div className="page page-narrow success-page">
      <div className="eyebrow">
        <span className="eyebrow-rule" />
        <span>Payment received</span>
        <span className="eyebrow-rule" />
      </div>
      <h1>Your posting is with our editors</h1>
      <p className="lede">
        We review every submission before it goes live — usually within one
        business day. Your Stripe receipt is on its way to your inbox, and
        we&rsquo;ll reach out at your contact email if anything needs a tweak.
      </p>
      <a className="btn btn-primary" href="#/">
        Back to the board
      </a>
    </div>
  )
}
