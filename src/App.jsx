import Footer from './components/Footer';
import FeedbackBanner from './components/FeedbackBanner';
import MeetingCapture from './components/MeetingCapture';
import SavedSummaries from './components/SavedSummaries';
import SummaryCard from './components/SummaryCard';
import TopBar from './components/TopBar';
import TranscriptSection from './components/TranscriptSection';
import Welcome from './components/Welcome';
import useMeetBrief from './hooks/useMeetBrief';
import './index.css';

function App() {
  const {
    capture,
    title,
    setTitle,
    summaries,
    selectedSummary,
    setSelectedSummary,
    loadingSummaries,
    isWorking,
    feedback,
    backendAvailable,
    fetchSummaries,
    startCapture,
    stopCapture,
    retryAudioSummary,
    generateSummary,
    copyText,
    exportTranscript,
  } = useMeetBrief();

  return (
    <main className="app-shell">
      <TopBar isCapturing={capture.isCapturing} backendAvailable={backendAvailable} />
      <Welcome />
      <MeetingCapture
        title={title}
        onTitleChange={setTitle}
        isCapturing={capture.isCapturing}
        isWorking={isWorking}
        hasPendingAudio={capture.hasPendingAudio}
        onStart={startCapture}
        onStop={stopCapture}
      />
      <TranscriptSection
        transcript={capture.transcript}
        isCapturing={capture.isCapturing}
        audioStatus={capture.audioStatus}
        hasPendingAudio={capture.hasPendingAudio}
        onCopy={() => copyText(capture.transcript, 'Transcript')}
        onDownload={exportTranscript}
        onRetry={() => generateSummary(capture.transcript, title || capture.title)}
        onRetryAudio={retryAudioSummary}
        isWorking={isWorking}
      />
      {feedback && <FeedbackBanner feedback={feedback} />}
      {selectedSummary && (
        <SummaryCard summary={selectedSummary} onCopy={() => copyText(selectedSummary.summary, 'Recap')} />
      )}
      <SavedSummaries
        summaries={summaries}
        selectedSummary={selectedSummary}
        loading={loadingSummaries}
        onRefresh={fetchSummaries}
        onSelect={setSelectedSummary}
      />
      <Footer backendAvailable={backendAvailable} />
    </main>
  );
}

export default App;
