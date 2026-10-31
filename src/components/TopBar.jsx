import PropTypes from 'prop-types';

function TopBar({ isCapturing, backendAvailable }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="eyebrow">MEETING NOTES, MADE SIMPLE</p>
          <h1>MeetBrief</h1>
        </div>
      </div>
      <div className={`connection-badge ${isCapturing ? 'is-live' : ''}`} role="status">
        <span className="status-dot" />
        {isCapturing ? 'Capturing' : backendAvailable === false ? 'Offline' : 'Ready'}
      </div>
    </header>
  );
}

TopBar.propTypes = {
  isCapturing: PropTypes.bool.isRequired,
  backendAvailable: PropTypes.bool,
};

export default TopBar;
