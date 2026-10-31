const chromeApi = globalThis.chrome;
const CAPTURE_KEY = 'meetCapture';
const AUDIO_DB_NAME = 'meetbrief-audio';
const AUDIO_STORE_NAME = 'recordings';

let capture;
let recorder;
let tabStream;
let microphoneStream;
let recordingStream;
let audioContext;
let audioChunks = [];
let pendingAudio;
let pendingAudioPersisted = false;

async function saveCapture(nextCapture) {
  capture = nextCapture;
  await chromeApi.storage.local.set({ [CAPTURE_KEY]: capture });
  return capture;
}

function openAudioDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(AUDIO_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingAudio(audio) {
  const database = await openAudioDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, 'readwrite');
    transaction.objectStore(AUDIO_STORE_NAME).put(audio, 'pending');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function loadPendingAudio() {
  const database = await openAudioDatabase();
  const audio = await new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, 'readonly');
    const request = transaction.objectStore(AUDIO_STORE_NAME).get('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return audio;
}

async function clearPendingAudio() {
  const database = await openAudioDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, 'readwrite');
    transaction.objectStore(AUDIO_STORE_NAME).delete('pending');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function releaseAudioResources() {
  [tabStream, microphoneStream, recordingStream].forEach((stream) => {
    stream?.getTracks().forEach((track) => track.stop());
  });
  if (audioContext && audioContext.state !== 'closed') await audioContext.close();
  tabStream = null;
  microphoneStream = null;
  recordingStream = null;
  audioContext = null;
}

async function startCapture({ streamId, title, tabId, summaryEndpoint }) {
  if (recorder?.state === 'recording') {
    throw new Error('Audio capture is already running.');
  }
  const stored = await chromeApi.storage.local.get(CAPTURE_KEY);
  if (stored[CAPTURE_KEY]?.hasPendingAudio) {
    throw new Error('Retry the previous audio upload before starting another capture.');
  }
  await clearPendingAudio();

  const mimeType = 'audio/webm;codecs=opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    throw new Error('This Chrome version cannot record Meet audio in a supported format.');
  }

  try {
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    audioContext = new AudioContext();
    await audioContext.resume();
    const output = audioContext.createMediaStreamDestination();
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    const microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
    tabSource.connect(output);
    tabSource.connect(audioContext.destination);
    microphoneSource.connect(output);
    recordingStream = output.stream;

    recorder = new MediaRecorder(recordingStream, { mimeType, audioBitsPerSecond: 32000 });
    audioChunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) audioChunks.push(event.data);
    });
    recorder.start(1000);

    const nextCapture = {
      title: title || 'Google Meet',
      transcript: '',
      summary: '',
      isCapturing: true,
      startedAt: new Date().toISOString(),
      tabId,
      summaryEndpoint,
      audioStatus: 'capturing',
    };
    await saveCapture(nextCapture);
    return { capture: nextCapture };
  } catch (error) {
    await releaseAudioResources();
    recorder = null;
    audioChunks = [];
    throw error;
  }
}

function stopRecorder() {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state !== 'recording') {
      reject(new Error('There is no active audio capture to stop.'));
      return;
    }

    recorder.addEventListener('stop', resolve, { once: true });
    recorder.addEventListener('error', (event) => {
      reject(new Error(event.error?.message || 'Chrome could not finish recording the meeting audio.'));
    }, { once: true });
    recorder.stop();
  });
}

async function uploadAudio(audio) {
  await saveCapture({
    ...capture,
    isCapturing: false,
    audioStatus: 'processing',
    hasPendingAudio: true,
  });
  try {
    const formData = new FormData();
    formData.append('title', capture.title);
    formData.append('audio', audio, 'meeting-audio.webm');
    const response = await fetch(`${capture.summaryEndpoint.replace(/\/$/, '')}/audio`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    });
    if (!response.ok) {
      const details = (await response.text()).trim();
      throw new Error(details || `Audio summary service returned ${response.status}.`);
    }

    const result = await response.json();
    if (!result.transcript?.trim() || !result.summary?.trim()) {
      throw new Error('The audio summary service returned an incomplete result.');
    }

    const completedCapture = {
      ...capture,
      transcript: result.transcript,
      summary: result.summary,
      audioStatus: 'complete',
      hasPendingAudio: false,
      completedAt: new Date().toISOString(),
    };
    await saveCapture(completedCapture);
    await clearPendingAudio();
    pendingAudio = null;
    pendingAudioPersisted = false;
    return { capture: completedCapture };
  } catch (error) {
    const failedCapture = {
      ...capture,
      isCapturing: false,
      audioStatus: 'failed',
      hasPendingAudio: pendingAudioPersisted,
      error: error.message,
    };
    await saveCapture(failedCapture);
    throw error;
  }
}

async function stopCapture() {
  try {
    await stopRecorder();
    await releaseAudioResources();
    const audio = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];
    recorder = null;
    if (!audio.size) throw new Error('No Meet audio was captured.');
    if (audio.size > 14 * 1024 * 1024) {
      throw new Error('This recording exceeds the backend 14 MB upload limit. Use a shorter recording.');
    }

    pendingAudio = audio;
    await savePendingAudio(audio);
    pendingAudioPersisted = true;
    return uploadAudio(audio);
  } catch (error) {
    await releaseAudioResources();
    audioChunks = [];
    recorder = null;
    const failedCapture = {
      ...capture,
      isCapturing: false,
      audioStatus: 'failed',
      hasPendingAudio: pendingAudioPersisted,
      error: error.message,
    };
    await saveCapture(failedCapture);
    throw error;
  }
}

async function retryAudioSummary() {
  const stored = await chromeApi.storage.local.get(CAPTURE_KEY);
  capture = stored[CAPTURE_KEY];
  if (!capture?.hasPendingAudio) {
    throw new Error('There is no saved audio available to retry.');
  }

  pendingAudio = await loadPendingAudio();
  if (!pendingAudio) {
    pendingAudioPersisted = false;
    const failedCapture = {
      ...capture,
      hasPendingAudio: false,
      error: 'The saved audio could not be found. Start a new capture.',
    };
    await saveCapture(failedCapture);
    throw new Error(failedCapture.error);
  }
  pendingAudioPersisted = true;
  return uploadAudio(pendingAudio);
}

chromeApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== 'offscreen') return false;

  const operation = request.action === 'start_audio_capture'
    ? startCapture(request)
    : request.action === 'stop_audio_capture'
      ? stopCapture()
      : request.action === 'retry_audio_summary'
        ? retryAudioSummary()
      : Promise.reject(new Error('Unknown audio capture action.'));

  operation
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true;
});
