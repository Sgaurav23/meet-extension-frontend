import PropTypes from 'prop-types';

function Footer({ backendAvailable }) {
  return (
    <footer className="footer">
      <span><span className="footer-sparkle">✳</span> MeetBrief</span>
      <span>{backendAvailable === false ? 'Backend unavailable' : 'Your transcript stays on this device'}</span>
    </footer>
  );
}

Footer.propTypes = {
  backendAvailable: PropTypes.bool,
};

export default Footer;
