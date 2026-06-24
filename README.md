# n8n-nodes-speechall

Speechall is a unified speech-to-text API for transcribing audio with multiple providers and models. This package adds a verified-ready n8n community node for Speechall batch transcription workflows.

## Installation

Install `n8n-nodes-speechall` as a community node in n8n Cloud or self-hosted n8n after the package is published to npm.

For local development:

```bash
nvm use
npm ci --ignore-scripts
npm run generate:openapi-types
npm run lint
npm run test
npm run build
```

This repository keeps runtime `dependencies` empty for n8n Cloud verification readiness. Development tooling is installed only as `devDependencies`.

Use Node 22 LTS for local n8n tooling. Newer non-LTS Node releases can fail while installing n8n development dependencies with native modules such as `isolated-vm`.

## Local n8n UI Testing

Use this flow when you want to test the node in a real local n8n editor before publishing it.

### Recommended: install the packed node into a local n8n user folder

This is the closest local equivalent to installing the package as an n8n community node. It avoids development hot-reload edge cases and uses the stable node type name `n8n-nodes-speechall.speechall`.

```bash
nvm use
npm ci --ignore-scripts
npm run build
npm pack --silent

REPO_ROOT=$(pwd)
mkdir -p /tmp/speechall-n8n-ui/.n8n/nodes
cd /tmp/speechall-n8n-ui/.n8n/nodes
npm install "$REPO_ROOT/n8n-nodes-speechall-0.1.0.tgz" --ignore-scripts

N8N_USER_FOLDER=/tmp/speechall-n8n-ui npx n8n@latest
```

Then open:

```text
http://localhost:5678
```

Important details:

- `N8N_USER_FOLDER` should be `/tmp/speechall-n8n-ui`, not `/tmp/speechall-n8n-ui/.n8n`. n8n creates and reads its `.n8n` directory inside the user folder.
- The installed community node package lives under `/tmp/speechall-n8n-ui/.n8n/nodes`.
- After code changes, repeat `npm run build`, `npm pack --silent`, and the `npm install ...tgz` command, then restart n8n.
- Stop n8n with `Ctrl+C` in the terminal running `npx n8n@latest`.
- The temporary user folder keeps local credentials and workflows between restarts. Remove `/tmp/speechall-n8n-ui` only when you want to reset the local n8n instance.

If you prefer to keep the repository path explicit:

```bash
REPO_ROOT=/path/to/speechall-n8n-node
cd /tmp/speechall-n8n-ui/.n8n/nodes
npm install "$REPO_ROOT/n8n-nodes-speechall-0.1.0.tgz" --ignore-scripts
```

### Development hot-reload mode

The package also supports `n8n-node dev`:

```bash
nvm use
npm run dev -- --custom-user-folder /tmp/speechall-n8n-ui
```

This mode is useful while editing node descriptions or operation code, but it may register a temporary development node type such as `CUSTOM.speechall`. If n8n reports `Unrecognized node type: CUSTOM.speechall`, stop the dev server and use the packed-node flow above.

### Quick smoke test

1. Create a **Speechall API** credential and run the credential test.
2. Create `Manual Trigger -> Speechall`.
3. Run **List Speech-to-Text Models** and confirm one item is returned per model.
4. Run **Transcribe a Remote URL** with a public MP3 URL and confirm output includes `text`, `outputFormat`, `model`, `source: "remote_url"`, and `sourceUrlSanitized`.
5. Keep **Include Source URL in Output** disabled unless you intentionally want the full URL in output.

## Credentials

Create a **Speechall API** credential and paste your Speechall API key into the masked **API Key** field. The credential sends requests to `https://api.speechall.com/v1` with a Bearer token and tests access by calling `/speech-to-text-models`.

## Operations

### Transcribe a File

Transcribes audio from n8n binary data using `POST /transcribe`.

Important fields:

- `Binary Property`: Defaults to `data`.
- `Model Selection`: Choose a model from Speechall or enter a model ID manually.
- `Language`: Defaults to `en`; use `auto` where supported.
- `Output Format`: `text`, `json_text`, `json`, `srt`, or `vtt`.
- `Also Return as Binary File`: Adds `.txt`, `.srt`, or `.vtt` transcript binary output.

### Transcribe a Remote URL

Transcribes a public HTTP or HTTPS audio URL using `POST /transcribe-remote`.

Remote URL output includes `source: "remote_url"` and `sourceUrlSanitized` by default. The full `fileUrl` is included only when **Include Source URL in Output** is enabled, because signed storage URLs can contain secrets.

Remote URL transcription also supports inline replacement rules:

- Exact match
- Regex
- Regex group replacements

### List Speech-to-Text Models

Calls `GET /speech-to-text-models`, applies optional client-side filters, and returns one n8n item per model. The dynamic model dropdown uses the same endpoint, while manual model ID mode remains available if model loading fails.

## Output Formats

- `text`: Plain transcript text.
- `json_text`: JSON response with transcript text and metadata.
- `json`: Detailed JSON, preserving segments, words, timestamps, speaker labels, and provider metadata.
- `srt`: SRT subtitles.
- `vtt`: WebVTT subtitles.

Text-like responses are normalized into item JSON with `text`, `outputFormat`, `model`, `language`, and `source`. Detailed JSON responses preserve unknown Speechall/provider fields.

## Advanced Options

The transcription operations expose punctuation, diarization, initial prompt, temperature, expected speaker count, custom vocabulary terms, reusable `ruleset_id`, and request timeout. Provider and model support varies; unsupported combinations are surfaced as Speechall API errors.

The default request timeout is 300 seconds and can be set from 1 to 900 seconds. n8n instance-level workflow execution timeouts may still end long-running executions. For large hosted files, prefer **Transcribe a Remote URL** to avoid moving large binary data through n8n memory.

## OpenAI-Compatible Endpoint

Speechall also offers OpenAI-compatible transcription APIs for generic HTTP/OpenAI-shaped workflows. This dedicated Speechall node v1 intentionally exposes Speechall-native operations only.

## Troubleshooting

- `401`: Invalid or missing Speechall API key.
- `402`: API key may be valid, but the Speechall account has a billing or credit issue.
- `429`: Rate limit exceeded; retry guidance is preserved when Speechall sends `Retry-After`.
- `504`: Upstream transcription provider timed out.
- Missing binary data: Check the incoming item has the configured binary property.
- Remote URL errors: Confirm the URL is public and starts with `http://` or `https://`.

## Example Workflows

- [Google Drive audio to transcript](examples/google-drive-audio-to-transcript.json)
- [Webhook audio upload to JSON transcript](examples/webhook-audio-upload-to-json-transcript.json)
- [Remote podcast URL to SRT](examples/remote-podcast-url-to-srt.json)
- [Meeting recording to diarized transcript](examples/meeting-recording-to-diarized-transcript.json)

## Support

Speechall documentation: https://docs.speechall.com

Repository: https://github.com/Speechall/speechall-n8n-node

## License

MIT
