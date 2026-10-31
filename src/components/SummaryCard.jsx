import PropTypes from 'prop-types';

function SummaryCard({ summary, onCopy }) {
  return (
    <section className="summary-card">
      <div className="section-heading summary-heading">
        <div>
          <p className="section-kicker">MEETING RECAP</p>
          <h3>{summary.title}</h3>
        </div>
        <button className="copy-button" type="button" onClick={onCopy}>
          Copy recap
        </button>
      </div>
      <div className="summary-content">{summary.summary}</div>
    </section>
  );
}

SummaryCard.propTypes = {
  summary: PropTypes.shape({
    title: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
  }).isRequired,
  onCopy: PropTypes.func.isRequired,
};

export default SummaryCard;
