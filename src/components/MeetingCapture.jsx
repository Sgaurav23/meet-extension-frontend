import PropTypes from 'prop-types';

function MeetingCapture({
  title,
  onTitleChange,
  isCapturing,
  isWorking,
  hasPendingAudio,
  onStart,
  onStop,
}) {
  return (
    <section className="meeting-card" aria-label="Meeting capture">
      <div className="card-heading">
        <div>
          <p className="section-kicker">NEW RECAP</p>
          <label className="title-label" htmlFor="meeting-title">Meeting title</label>
        </div>
        <span className="secure-label"><span aria-hidden="true">●</span> Saved on this device</span>
      </div>
      <input
        id="meeting-title"
        className="title-input"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="e.g. Weekly product sync"
        maxLength={120}
        disabled={isCapturing}
      />
      <button
        className={`capture-button ${isCapturing ? 'stop-button' : ''}`}
        type="button"
        onClick={isCapturing ? onStop : onStart}
        disabled={isWorking || hasPendingAudio}
      >
        <span className="capture-icon" aria-hidden="true">{isWorking ? '…' : isCapturing ? '■' : '●'}</span>
        {isWorking ? 'Working…' : isCapturing ? 'Stop & create recap' : 'Start audio capture'}
        <span className="button-arrow" aria-hidden="true">→</span>
      </button>
      <p className="capture-hint">
        {isCapturing
          ? 'Meet and microphone audio will be uploaded when you stop.'
          : hasPendingAudio
            ? 'Retry the saved audio before starting another capture.'
            : 'Captures Meet and microphone audio; upload starts when you stop.'}
      </p>
    </section>
  );
}

MeetingCapture.propTypes = {
  title: PropTypes.string.isRequired,
  onTitleChange: PropTypes.func.isRequired,
  isCapturing: PropTypes.bool.isRequired,
  isWorking: PropTypes.bool.isRequired,
  hasPendingAudio: PropTypes.bool,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
};

MeetingCapture.defaultProps = {
  hasPendingAudio: false,
};

export default MeetingCapture;
