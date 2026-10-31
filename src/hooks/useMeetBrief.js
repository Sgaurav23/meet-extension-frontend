import { useCallback, useEffect, useState } from 'react';
import { CAPTURE_KEY, SUMMARIES_KEY, SUMMARY_ENDPOINT } from '../constants/summaryEndpoing';
import callStorage from '../function/callStorage';
import normalizeSummary from '../function/normalizeSummary';

function getChrome() {
  return globalThis.chrome;
}

function getActiveMeetTab() {
  return new Promise((resolve, reject) => {
    const chromeApi = getChrome();
    if (!chromeApi?.tabs) {
      reject(new Error('Open this popup from Chrome to use meeting capture.'));
      return;
    }

    chromeApi.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chromeApi.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      const tab = tabs[0];
      if (!tab?.id || !tab.url?.startsWith('https://meet.google.com/')) {
        reject(new Error('Open an active Google Meet tab before starting capture.'));
        return;
      }
      resolve(tab);
    });
  });
}

function parseSummary(result) {
  try {
    const parsed = JSON.parse(result);
    return typeof parsed === 'string' ? parsed : parsed.summary ?? parsed.summaryText ?? result;
  } catch {
    return result;
  }
}

function useMeetBrief() {
  const [capture, setCapture] = useState({
    title: 'Google Meet',
    transcript: '',
    isCapturing: false,
  });
  const [title, setTitle] = useState('Google Meet');
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(null);

  const cacheSummary = useCallback(async (summary, meetingTitle) => {
    const item = {
      id: `local-${Date.now()}`,
      title: meetingTitle || 'Google Meet',
      summary,
      createdAt: new Date().toISOString(),
    };
    const stored = await callStorage('get', [SUMMARIES_KEY]);
    const updated = [item, ...(stored[SUMMARIES_KEY] || [])]
      .filter((entry, index, list) => list.findIndex((candidate) => candidate.summary === entry.summary) === index)
      .slice(0, 30);
    await callStorage('set', { [SUMMARIES_KEY]: updated });
    setSummaries(updated.map(normalizeSummary));
    setSelectedSummary(item);
    return item;
  }, []);

  const fetchSummaries = useCallback(async () => {
    setLoadingSummaries(true);
    try {
      const [response, stored] = await Promise.all([
        fetch(SUMMARY_ENDPOINT, { headers: { Accept: 'application/json' } }),
        callStorage('get', [SUMMARIES_KEY]),
      ]);
      if (!response.ok) throw new Error(`Summary service returned ${response.status}.`);

      const remote = await response.json();
      const remoteItems = (Array.isArray(remote) ? remote : [remote])
        .map(normalizeSummary)
        .filter((item) => item.summary);
      const localItems = (stored[SUMMARIES_KEY] || []).map(normalizeSummary);
      const merged = [...remoteItems];
      localItems.forEach((item) => {
        if (!merged.some((saved) => saved.summary === item.summary)) merged.push(item);
      });
      setSummaries(merged);
      setBackendAvailable(true);
    } catch {
      setBackendAvailable(false);
      try {
        const stored = await callStorage('get', [SUMMARIES_KEY]);
        setSummaries((stored[SUMMARIES_KEY] || []).map(normalizeSummary));
      } catch (storageError) {
        setFeedback({ type: 'error', message: storageError.message });
      }
    } finally {
      setLoadingSummaries(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    callStorage('get', [CAPTURE_KEY, SUMMARIES_KEY, 'meetActiveTabId'])
      .then((stored) => {
        if (!mounted) return;
        const savedCapture = stored[CAPTURE_KEY];
        if (savedCapture) {
          setCapture(savedCapture);
          setTitle(savedCapture.title || 'Google Meet');
          setIsWorking(savedCapture.audioStatus === 'processing');
          if (savedCapture.audioStatus === 'complete' && savedCapture.summary) {
            cacheSummary(savedCapture.summary, savedCapture.title)
              .catch((error) => setFeedback({ type: 'error', message: error.message }));
          } else if (savedCapture.audioStatus === 'failed' && savedCapture.error) {
            setFeedback({ type: 'error', message: savedCapture.error });
          }
        }
        setSummaries((stored[SUMMARIES_KEY] || []).map(normalizeSummary));
      })
      .catch((error) => {
        if (mounted) setFeedback({ type: 'error', message: error.message });
      });

    const chromeApi = getChrome();
    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes[CAPTURE_KEY]?.newValue) {
        const nextCapture = changes[CAPTURE_KEY].newValue;
        setCapture(nextCapture);
        setIsWorking(nextCapture.audioStatus === 'processing');
        if (nextCapture.title) setTitle(nextCapture.title);
        if (nextCapture.audioStatus === 'complete' && nextCapture.summary) {
          cacheSummary(nextCapture.summary, nextCapture.title)
            .catch((error) => setFeedback({ type: 'error', message: error.message }));
        } else if (nextCapture.audioStatus === 'failed' && nextCapture.error) {
          setFeedback({ type: 'error', message: nextCapture.error });
        }
      }
      if (changes[SUMMARIES_KEY]?.newValue) {
        setSummaries(changes[SUMMARIES_KEY].newValue.map(normalizeSummary));
      }
    };
    chromeApi?.storage?.onChanged?.addListener(handleStorageChange);
    fetchSummaries();

    return () => {
      mounted = false;
      chromeApi?.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, [cacheSummary, fetchSummaries]);

  const startCapture = async () => {
    setIsWorking(true);
    setFeedback(null);
    try {
      if (capture.hasPendingAudio) {
        throw new Error('Retry the previous audio upload before starting another capture.');
      }
      const tab = await getActiveMeetTab();
      const chromeApi = getChrome();
      const response = await chromeApi.runtime.sendMessage({
        action: 'start_audio_capture',
        title: title.trim() || 'Google Meet',
        tabId: tab.id,
        summaryEndpoint: SUMMARY_ENDPOINT,
      });
      if (response?.error) throw new Error(response.error);
      if (!response?.capture) throw new Error('MeetBrief could not start audio capture.');
      await callStorage('set', {
        meetActiveTabId: tab.id,
        [CAPTURE_KEY]: response.capture,
      });
      setCapture(response.capture);
      setFeedback({
        type: 'success',
        message: 'Meet audio is recording. Stop the capture to transcribe it and create your recap.',
      });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const generateSummary = async (transcript, meetingTitle) => {
    if (!transcript.trim()) {
      setFeedback({ type: 'error', message: 'No transcript is available to summarize.' });
      return;
    }
    setIsWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(SUMMARY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/plain, application/json' },
        body: JSON.stringify({ title: meetingTitle, rawTranscript: transcript }),
      });
      if (!response.ok) {
        const details = (await response.text()).trim();
        throw new Error(details || `Summary service returned ${response.status}.`);
      }
      const summary = parseSummary(await response.text());
      if (!summary.trim()) throw new Error('The summary service returned an empty summary.');

      await cacheSummary(summary, meetingTitle);
      setBackendAvailable(true);
      setFeedback({ type: 'success', message: 'Your meeting recap is ready and saved.' });
    } catch (error) {
      setBackendAvailable(false);
      setFeedback({
        type: 'error',
        message: `${error.message} Your transcript is still saved; check that the backend is running and retry.`,
      });
    } finally {
      setIsWorking(false);
    }
  };

  const stopCapture = async () => {
    setIsWorking(true);
    setFeedback(null);
    try {
      const response = await getChrome().runtime.sendMessage({ action: 'stop_audio_capture' });
      if (response?.error) throw new Error(response.error);
      const stoppedCapture = response?.capture;
      if (!stoppedCapture) throw new Error('Could not stop the Meet audio capture.');
      await callStorage('set', {
        [CAPTURE_KEY]: stoppedCapture,
        meetActiveTabId: stoppedCapture.tabId,
      });
      setCapture(stoppedCapture);
      if (stoppedCapture.audioStatus !== 'complete') {
        throw new Error(stoppedCapture.error || 'The audio could not be transcribed.');
      }
      await cacheSummary(stoppedCapture.summary, stoppedCapture.title || title);
      setBackendAvailable(true);
      setFeedback({ type: 'success', message: 'Your audio-based meeting recap is ready and saved.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const retryAudioSummary = async () => {
    setIsWorking(true);
    setFeedback(null);
    try {
      const response = await getChrome().runtime.sendMessage({ action: 'retry_audio_summary' });
      if (response?.error) throw new Error(response.error);
      const retriedCapture = response?.capture;
      if (!retriedCapture || retriedCapture.audioStatus !== 'complete') {
        throw new Error('The saved audio could not be processed.');
      }
      setCapture(retriedCapture);
      await cacheSummary(retriedCapture.summary, retriedCapture.title || title);
      setBackendAvailable(true);
      setFeedback({ type: 'success', message: 'Your audio-based meeting recap is ready and saved.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsWorking(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ type: 'success', message: `${label} copied to clipboard.` });
    } catch {
      setFeedback({ type: 'error', message: 'Clipboard access was denied by Chrome.' });
    }
  };

  const exportTranscript = () => {
    const file = new Blob([capture.transcript], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `${(capture.title || 'meet-transcript').replace(/[^\w-]+/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    setFeedback({ type: 'success', message: 'Transcript downloaded.' });
  };

  return {
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
  };
}

export default useMeetBrief;
