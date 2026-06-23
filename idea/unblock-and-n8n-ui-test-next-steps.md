# Speechall n8n Node: Unblock and UI Test Next Steps

Date: 2026-06-21  
Package: `n8n-nodes-speechall`  
Current local status: implementation, lint, tests, build, release guard, and npm pack dry-run pass.

## 1. Current Blockers

The implementation is locally complete, but the full plan is blocked on external validation and release steps:

1. A real Speechall API key is required for credential and live transcription tests.
2. Local full n8n dev launch should be run with Node 22 LTS. Node 26 fails while installing current `n8n@latest` native dependencies, specifically `isolated-vm`.
3. GitHub/npm release setup is required for provenance publishing.
4. n8n Creator Portal access is required for final verification submission.

## 2. Environment Setup

Use Node 22 LTS before running n8n tooling:

```bash
nvm use
npm ci --ignore-scripts
npm run generate:openapi-types
npm run lint
npm run test
npm run build
```

Expected evidence:

- `npm run lint` exits successfully.
- `npm run test` reports all tests passing.
- `npm run build` reports `Build successful`.
- `npm pack --dry-run` includes `dist/`, README/license, `package.json`, and the four example workflows.

## 3. Local n8n UI Launch

Run the n8n dev server with the project linked as a community node:

```bash
npm run dev -- --custom-user-folder /tmp/speechall-n8n-ui
```

Expected evidence:

- TypeScript watch reports `Found 0 errors`.
- n8n server prints `Editor is now accessible`.
- The n8n editor opens at the URL shown in the terminal, normally `http://localhost:5678`.
- Searching for `Speechall` in the node panel shows the Speechall node.

Fallback if full launch fails:

```bash
npm run dev -- --external-n8n --custom-user-folder /tmp/speechall-n8n-ui
```

Then start a separate Node 22 n8n instance with:

```bash
N8N_USER_FOLDER=/tmp/speechall-n8n-ui/.n8n N8N_DEV_RELOAD=true npx n8n@latest
```

## 4. Credential UI Test

Steps:

1. Open n8n.
2. Go to **Credentials**.
3. Create a new credential named **Speechall API**.
4. Paste a valid Speechall API key into **API Key**.
5. Save and run the credential test.

Expected evidence:

- API key field is masked.
- Valid key succeeds by calling `/speech-to-text-models`.
- Invalid key returns a clear `401` authentication failure.
- A valid key with billing or credit issues should surface as a `402` account readiness failure.

## 5. Workflow Test: List Models

Workflow:

```text
Manual Trigger -> Speechall
```

Speechall node settings:

- Resource: `Speech-to-Text`
- Operation: `List speech-to-text models`
- Credential: `Speechall API`
- Optional filters:
  - Available Only: enabled
  - Supports SRT: enabled

Expected evidence:

- Execution succeeds.
- One n8n item is returned per model.
- Each model item includes `id`, `displayName`, `provider`, `supportedFormats`, and `raw`.
- Dynamic model dropdowns in transcription operations can load models.

## 6. Workflow Test: Transcribe Remote URL

Workflow:

```text
Manual Trigger -> Set -> Speechall -> Inspect Output
```

Set node fields:

```json
{
  "fileUrl": "https://example.com/path/to/public-audio.mp3"
}
```

Speechall node settings:

- Resource: `Speech-to-Text`
- Operation: `Transcribe a remote URL`
- File URL: `={{$json.fileUrl}}`
- Model Selection: `Choose From List`
- Model: choose a model from the dropdown
- Language: `auto`
- Output Format: `text`
- Include Source URL in Output: disabled

Expected evidence:

- Execution succeeds.
- Output contains:
  - `text`
  - `outputFormat: "text"`
  - `model`
  - `source: "remote_url"`
  - `sourceUrlSanitized`
- Output does not contain full `fileUrl` unless **Include Source URL in Output** is enabled.

Repeat with:

- Output Format: `json`
- Diarization: enabled
- Speakers Expected: `2`
- Custom Vocabulary: at least one term
- Inline Replacement Rules: one exact match and one regex group rule

Expected evidence:

- Detailed JSON preserves `segments`, `words`, speaker labels, timestamps, and unknown provider metadata when Speechall returns them.
- Invalid replacement rules fail locally before submission where possible.

## 7. Workflow Test: Transcribe File

Workflow:

```text
Manual Trigger or Webhook -> node that provides binary audio -> Speechall
```

Recommended sources:

- Webhook file upload
- Read Binary File node in self-hosted n8n
- Google Drive Download File
- S3 Download

Speechall node settings:

- Resource: `Speech-to-Text`
- Operation: `Transcribe a file`
- Binary Property: `data`
- Model Selection: `Choose From List`
- Model: choose a model from the dropdown
- Language: `en`
- Output Format: `srt`
- Also Return as Binary File: enabled
- Binary Output Property: `transcript`

Expected evidence:

- Execution succeeds with binary input.
- Output JSON contains transcript text and metadata.
- Output binary data keeps the original input binary property and adds `transcript`.
- `transcript` has file name `speechall-transcript.srt` and MIME type `application/x-subrip`.
- If the selected model exposes `max_file_size_bytes` and the input is too large, the node fails locally before uploading.

## 8. Workflow Test: Continue On Fail

Workflow:

```text
Manual Trigger -> Speechall
```

Speechall node settings:

- Operation: `Transcribe a file`
- Binary Property: `data`
- Continue On Fail: enabled in node settings
- Do not provide binary input.

Expected evidence:

- Workflow execution completes instead of stopping.
- Output item contains an `error` field.
- `pairedItem` points back to the failed input item.

## 9. Timeout and Large File Test

Run one hosted large audio file through **Transcribe a remote URL**.

Expected evidence:

- Request Timeout (Seconds) can be set up to `900`.
- README guidance is accurate: n8n execution timeout can still stop long workflows independently of the node request timeout.
- Remote URL path avoids loading large audio into n8n binary memory.

## 10. Release Unblock Steps

1. Push the repository to `https://github.com/Speechall/speechall-n8n-node`.
2. Confirm GitHub Actions CI passes:
   - `npm ci --ignore-scripts`
   - `npm run generate:openapi-types`
   - generated types diff check
   - `npm run lint`
   - `npm run test`
   - `npm run build`
3. Configure npm Trusted Publishing for `.github/workflows/publish.yml`, or add a scoped `NPM_TOKEN`.
4. Create a version tag matching `*.*.*`, for example `0.1.0`.
5. Confirm GitHub Actions publishes to npm with provenance.
6. Install the published package in a clean n8n instance.
7. Re-run the UI tests above against the published package.
8. Submit the package to the n8n Creator Portal.

## 11. Final Acceptance Checklist

- [ ] Valid Speechall API key credential test passes.
- [ ] Invalid key returns a clear `401`.
- [ ] `402` billing or credit failure is understandable.
- [ ] Speechall node appears in n8n UI.
- [ ] Dynamic model dropdown loads.
- [ ] Manual model ID mode works.
- [ ] List Models returns one item per model.
- [ ] Remote URL transcription works for `text`, `json`, `srt`, and `vtt`.
- [ ] File transcription works for `text`, `json`, `srt`, and `vtt`.
- [ ] Optional transcript binary output works for `text`, `srt`, and `vtt`.
- [ ] Inline replacement rules serialize correctly.
- [ ] `Continue On Fail` returns item-level errors.
- [ ] Package is published from GitHub Actions with provenance.
- [ ] Published package has no runtime dependencies.
- [ ] n8n Creator Portal submission is ready.
