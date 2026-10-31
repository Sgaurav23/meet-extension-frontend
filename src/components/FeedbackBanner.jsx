import PropTypes from 'prop-types';

function FeedbackBanner({ feedback }) {
  return (
    <div className={`feedback ${feedback.type === 'error' ? 'feedback-error' : ''}`} role="status">
      <span aria-hidden="true">{feedback.type === 'error' ? '!' : '✓'}</span>
      {feedback.message}
    </div>
  );
}

FeedbackBanner.propTypes = {
  feedback: PropTypes.shape({
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
};

export default FeedbackBanner;
