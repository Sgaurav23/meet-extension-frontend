const chromeApi = globalThis.chrome;

async function ensureOffscreenDocument() {
  if (await chromeApi.offscreen.hasDocument()) return;

  await chromeApi.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Keep Google Meet audio recording while the extension popup is closed.',
  });
}

function sendToOffscreen(message) {
  return new Promise((resolve, reject) => {
    chromeApi.runtime.sendMessage({ ...message, target: 'offscreen' }, (response) => {
      const error = chromeApi.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      } else if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

chromeApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target || ![
    'start_audio_capture',
    'stop_audio_capture',
    'retry_audio_summary',
  ].includes(request.action)) {
    return false;
  }

  (async () => {
    if (request.action === 'start_audio_capture') {
      const streamId = await new Promise((resolve, reject) => {
        chromeApi.tabCapture.getMediaStreamId({ targetTabId: request.tabId }, (id) => {
          const error = chromeApi.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(id);
        });
      });
      await ensureOffscreenDocument();
      return sendToOffscreen({
        action: 'start_audio_capture',
        streamId,
        title: request.title,
        tabId: request.tabId,
        summaryEndpoint: request.summaryEndpoint,
      });
    }

    return sendToOffscreen({ action: request.action });
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));

  return true;
});
