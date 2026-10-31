function Welcome() {
  return (
    <section className="welcome">
      <div className="welcome-copy">
        <p className="section-kicker">YOUR MEETING, RECAPTURED</p>
        <h2>Stay in the<br /><span>conversation.</span></h2>
        <p className="welcome-description">
          Capture meeting audio, transcribe multilingual conversations, and turn them into a useful recap.
        </p>
      </div>
      <div className="orbital-art" aria-hidden="true">
        <div className="orbital-ring" />
        <div className="orbital-ring ring-two" />
        <div className="orbital-core"><span>✳</span></div>
        <i className="orbit-dot dot-one" />
        <i className="orbit-dot dot-two" />
      </div>
    </section>
  );
}

export default Welcome;
