import PropTypes from 'prop-types';

function SavedSummaries({ summaries, selectedSummary, loading, onRefresh, onSelect }) {
  return (
    <section className="saved-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">YOUR LIBRARY</p>
          <h3>Saved recaps</h3>
        </div>
        <button className="refresh-button" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {summaries.length === 0 ? (
        <p className="saved-empty">
          {loading ? 'Loading saved recaps…' : 'No recaps yet. Your next meeting recap will show up here.'}
        </p>
      ) : (
        <div className="saved-list">
          {summaries.slice(0, 5).map((item) => (
            <button
              className={`saved-item ${selectedSummary?.summary === item.summary ? 'is-selected' : ''}`}
              key={`${item.id}-${item.summary.slice(0, 16)}`}
              type="button"
              onClick={() => onSelect(item)}
            >
              <span className="saved-item-title">{item.title}</span>
              <span className="saved-item-preview">{item.summary}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

SavedSummaries.propTypes = {
  summaries: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
  })).isRequired,
  selectedSummary: PropTypes.shape({
    summary: PropTypes.string.isRequired,
  }),
  loading: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default SavedSummaries;
