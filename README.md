# MeetBrief

MeetBrief is a Chrome extension popup that records Google Meet tab audio and microphone audio, transcribes the conversation, and creates a recap with the Spring Boot backend.

## Features

- Start and stop audio capture from the extension popup; recording continues if the popup is closed.
- Transcribe the recorded audio in its original language without relying on Meet captions.
- Set a meeting title, copy or download the transcript, and retry recap generation.
- Generate, copy, and browse saved recaps. Recaps are cached in extension storage; failed audio uploads remain in local IndexedDB so they can be retried.
- Receive clear feedback when Meet is not active or the backend cannot be reached.

## Backend

When audio capture stops, the offscreen recorder sends the audio file as multipart form data to `POST /api/v1/summarize/audio`. The backend transcribes the audio in its original language, creates an English recap, and saves the recap.

The existing text endpoint remains available for retrying a recap from a transcript. It accepts `POST /api/v1/summarize` with:

```json
{
  "title": "Google Meet",
  "rawTranscript": "..."
}
```

The default endpoint is `http://localhost:8080/api/v1/summarize`. Set `VITE_SUMMARY_ENDPOINT` in the frontend environment to override it. If the endpoint uses another host, add its origin to `host_permissions` in `public/manifest.json`.

## Run locally

1. Set `GOOGLE_API_KEY` in the backend environment, then start the Spring Boot backend on the configured endpoint.
2. Run `npm run build` in this directory.
3. In Chrome, open `chrome://extensions`, enable Developer mode, and load the generated `dist` directory as an unpacked extension.
4. Open or reload a Google Meet tab, then open MeetBrief from the toolbar.
5. Enter a meeting title and select **Start audio capture**. Grant microphone access when Chrome asks. Stop the capture to upload the audio, transcribe it, and create a recap.

Audio from the Meet tab and microphone is uploaded to the configured backend only after you stop recording. Chrome asks for microphone access, and recording will not start if access is denied. The extension stores the resulting transcript and recap locally. If processing fails, the captured audio is kept in local IndexedDB for retry, including after the browser is restarted. The backend accepts recordings up to 14 MB.
