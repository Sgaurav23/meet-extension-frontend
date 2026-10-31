import PropTypes from 'prop-types';

function TranscriptSection({
  transcript,
  isCapturing,
  onCopy,
  onDownload,
  onRetry,
  onRetryAudio,
  isWorking,
  audioStatus,
  hasPendingAudio,
}) {
  const transcriptLines = transcript.split('\n').filter(Boolean).length;

  return (
    <section className="transcript-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">AUDIO TRANSCRIPTION</p>
          <h3>Recognized speech</h3>
        </div>
        <span className="count-pill">{transcriptLines} {transcriptLines === 1 ? 'line' : 'lines'}</span>
      </div>
      <div className={`transcript-panel ${transcript ? 'has-transcript' : ''}`}>
        {transcript
          ? <p>{transcript}</p>
          : (
            <div className="empty-transcript">
              <span className="waveform" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              <p>{audioStatus === 'capturing' ? 'Recording meeting audio' : 'Your transcript will appear here'}</p>
              <span>
                {audioStatus === 'capturing'
                  ? 'Stop the capture to transcribe the audio and create a recap.'
                  : 'Start audio capture; captions are not required.'}
              </span>
            </div>
          )}
      </div>
      <div className="transcript-actions">
        <button className="text-button" type="button" onClick={onCopy} disabled={!transcript}>
          Copy transcript <span aria-hidden="true">↗</span>
        </button>
        <button className="text-button" type="button" onClick={onDownload} disabled={!transcript}>
          Download .txt <span aria-hidden="true">↓</span>
        </button>
        {!isCapturing && transcript && (
          <button className="text-button" type="button" onClick={onRetry} disabled={isWorking}>
            Retry recap <span aria-hidden="true">→</span>
          </button>
        )}
        {!isCapturing && hasPendingAudio && (
          <button className="text-button" type="button" onClick={onRetryAudio} disabled={isWorking}>
            Retry audio upload <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </section>
  );
}

TranscriptSection.propTypes = {
  transcript: PropTypes.string.isRequired,
  isCapturing: PropTypes.bool.isRequired,
  onCopy: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onRetryAudio: PropTypes.func,
  isWorking: PropTypes.bool.isRequired,
  audioStatus: PropTypes.string,
  hasPendingAudio: PropTypes.bool,
};

TranscriptSection.defaultProps = {
  onRetryAudio: () => {},
  audioStatus: null,
  hasPendingAudio: false,
};

export default TranscriptSection;
