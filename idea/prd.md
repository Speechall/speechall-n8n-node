# Product Requirements Document: Speechall n8n Node

## 1. Document Control

**Product:** Speechall n8n Community Node
**Package Name:** `n8n-nodes-speechall`
**Repository Owner:** Speechall GitHub organization
**Maintainers:** Speechall team and `github.com/atacan`
**License:** MIT
**Target Distribution:** Verified n8n community node, installable from n8n Cloud and self-hosted n8n
**Primary Success Criteria:** Listed in the n8n integrations directory and installable from n8n Cloud
**Version:** PRD v1.0
**Status:** Ready for technical architecture planning

---

## 2. Executive Summary

Speechall should build an official n8n community node that allows n8n users to transcribe audio using Speechall’s synchronous REST API.

The node should be verification-ready from the first public release. It should support API-key authentication, dynamic model discovery, local binary audio transcription, remote URL transcription, OpenAI-compatible transcription, multiple output formats, diarization, timestamps, punctuation, custom vocabulary, replacement ruleset usage, and advanced model/provider options.

The node should be designed as a broader **Speechall** app node with multiple resources and operations, not as a single-purpose “Transcription” node. This leaves room for future Speechall speech APIs while keeping v1 focused on batch speech-to-text.

---

## 3. Background

Speechall provides a unified API for accessing multiple speech-to-text providers and models through one interface. n8n users commonly build workflows around files, forms, webhooks, cloud storage, support tickets, meetings, podcasts, call recordings, and content publishing. Speechall can fit these workflows by converting audio inputs into text, subtitles, structured transcript JSON, or diarized transcripts.

n8n supports third-party integrations through community nodes. To be installable by n8n Cloud users and discoverable from the node panel, the Speechall node must be built to n8n’s verified community node standards and submitted for verification.

---

## 4. Problem Statement

n8n users who want speech-to-text automation currently need to use generic HTTP Request nodes or provider-specific transcription nodes. This creates friction because users must manually configure authentication, binary file uploads, model IDs, output formats, error handling, and provider-specific options.

Speechall should provide a native n8n node that makes transcription workflows simple, discoverable, and reusable.

---

## 5. Goals

### 5.1 Product Goals

1. Enable n8n users to transcribe audio files using Speechall without manually configuring HTTP requests.
2. Support both binary file inputs and public remote URL inputs.
3. Allow users to choose Speechall models dynamically from the API.
4. Expose all relevant batch transcription options available through Speechall REST endpoints.
5. Return transcript outputs in formats useful for downstream n8n workflows.
6. Meet n8n verified community node requirements from the first release.
7. Become discoverable in n8n Cloud and self-hosted n8n through verified node installation.
8. Become eligible for listing in the public n8n integrations directory.

### 5.2 Business Goals

1. Increase Speechall API usage through no-code and low-code automation builders.
2. Make Speechall visible to n8n’s automation user base.
3. Reduce integration support burden by offering a native node instead of custom HTTP setup instructions.
4. Support acquisition of new Speechall users from n8n workflows.
5. Establish Speechall as a flexible speech-to-text layer for automation platforms.

---

## 6. Non-Goals

The following are explicitly out of scope for v1:

1. **Translation.** Speechall’s n8n node v1 should not expose translation operations.
2. **WebSocket streaming transcription.** Streaming is WebSocket-based and should not be included in the initial REST-focused node.
3. **Billing or usage lookup.** There is no billing endpoint in the v1 product scope.
4. **OAuth.** Authentication is API-key only.
5. **Custom API base URL.** The node should use the single production Speechall API endpoint.
6. **Asynchronous transcription jobs.** The current target is synchronous REST transcription.
7. **Webhook callbacks for transcription completion.** Not needed for synchronous v1.
8. **Direct provider credentials.** Users authenticate only with Speechall, not with OpenAI, Deepgram, AssemblyAI, Google, Rev AI, or other underlying providers.
9. **Generic HTTP proxy behavior.** The node should be a Speechall-specific product integration, not a general API gateway.

---

## 7. Target Users

### 7.1 Primary User

**n8n automation builder**

A no-code or low-code user who wants to build workflows such as:

* Upload audio file to Google Drive, Dropbox, S3, or another storage system.
* Send the file to Speechall for transcription.
* Store the transcript in Google Docs, Notion, Airtable, a database, or Slack.
* Generate subtitles for media workflows.
* Extract diarized transcripts from calls or meetings.
* Process files submitted through webhooks or forms.

### 7.2 Secondary User

**Developer or technical operator**

A technical user who wants a faster, safer alternative to manually configuring HTTP Request nodes. This user may care about model IDs, output formats, timestamps, diarization, custom vocabulary, and OpenAI-compatible behavior.

### 7.3 n8n Cloud User

A user who expects to find Speechall by searching inside the n8n node panel and installing the verified node directly.

---

## 8. Product Scope

The product should be an official n8n app node named **Speechall**.

The node should contain multiple resources and operations.

### 8.1 Resource: Speech-to-Text

Operations:

1. **Transcribe File**
2. **Transcribe Remote URL**
3. **OpenAI-Compatible Transcription**
4. **List Models**

### 8.2 Future Resource: Replacement Rules

Replacement rule management may be implemented in a later release if Speechall wants n8n users to create and manage reusable replacement rulesets directly from n8n.

For v1, the transcription operations should support using a `ruleset_id` and, where supported by the API, inline replacement rules.

---

## 9. Functional Requirements

## 9.1 Authentication

### Requirement

The node must provide a Speechall credential type that accepts a secret API key and sends it as a Bearer token.

### User Experience

Credential name: **Speechall API**

Fields:

| Field   | Type     | Required | Notes                                     |
| ------- | -------- | -------: | ----------------------------------------- |
| API Key | Password |      Yes | Stored securely by n8n credentials system |

### Credential Test

The credential should be tested by calling the model listing endpoint. A successful response confirms the API key is valid.

### Acceptance Criteria

* User can create Speechall credentials in n8n.
* API key is masked as a password field.
* Credentials are not logged.
* Invalid API keys produce a clear authentication error.
* Credential test succeeds when the API key is valid.

---

## 9.2 Resource and Operation Layout

### Requirement

The node should be structured as:

```text
Node: Speechall
  Resource: Speech-to-Text
    Operation: Transcribe File
    Operation: Transcribe Remote URL
    Operation: OpenAI-Compatible Transcription
    Operation: List Models
```

### Acceptance Criteria

* User can search for “Speechall” in n8n.
* User can choose “Speech-to-Text” as the resource.
* User can choose one of the supported operations.
* Operation names follow n8n-style action naming.
* Node UI is written in English.

---

## 9.3 Operation: Transcribe File

### Purpose

Transcribe an audio file provided as n8n binary data.

### API Behavior

Uses the Speechall raw binary transcription endpoint.

### Required Inputs

| Field           | Type                     | Required | Default | Notes                                                     |
| --------------- | ------------------------ | -------: | ------- | --------------------------------------------------------- |
| Binary Property | String                   |      Yes | `data`  | Name of the n8n binary property containing the audio file |
| Model           | Dynamic options / string |      Yes | None    | Model identifier in `provider.model` format               |
| Language        | Options / string         |       No | `en`    | Should include `auto`                                     |
| Output Format   | Options                  |       No | `text`  | `text`, `json_text`, `json`, `srt`, `vtt`                 |

### Advanced Inputs

| Field               | Type                | Required | Notes                                                     |
| ------------------- | ------------------- | -------: | --------------------------------------------------------- |
| Punctuation         | Boolean             |       No | Enable automatic punctuation where supported              |
| Diarization         | Boolean             |       No | Enable speaker diarization where supported                |
| Initial Prompt      | String              |       No | Context prompt for models that support it                 |
| Temperature         | Number              |       No | 0 to 1                                                    |
| Speakers Expected   | Number              |       No | Hint for diarization                                      |
| Custom Vocabulary   | String collection   |       No | Words or phrases to improve recognition                   |
| Ruleset ID          | String              |       No | UUID of a pre-defined replacement ruleset                 |
| Timeout             | Number              |       No | Request timeout configuration if allowed by n8n standards |
| Retry on Rate Limit | Boolean             |       No | Honor retry behavior where safe                           |
| Continue On Fail    | Native n8n behavior |       No | Should work with n8n’s standard failure handling          |

### Output Behavior

The node should normalize outputs so downstream n8n nodes can use them easily.

For `text`, `srt`, and `vtt` outputs:

```json
{
  "text": "...",
  "outputFormat": "text",
  "model": "...",
  "language": "...",
  "source": "binary"
}
```

For `json_text`:

```json
{
  "id": "...",
  "text": "...",
  "outputFormat": "json_text",
  "model": "...",
  "language": "...",
  "source": "binary"
}
```

For `json`:

```json
{
  "id": "...",
  "text": "...",
  "language": "...",
  "segments": [],
  "words": [],
  "outputFormat": "json",
  "model": "...",
  "source": "binary"
}
```

### Optional Binary Output

The operation should include an optional setting:

| Field                      | Type    | Default      | Notes                                 |
| -------------------------- | ------- | ------------ | ------------------------------------- |
| Also Return as Binary File | Boolean | `false`      | Useful for SRT/VTT/TXT outputs        |
| Binary Output Property     | String  | `transcript` | Used only if binary output is enabled |

When enabled, the node should return the transcript/subtitle output as n8n binary data in addition to JSON metadata.

### Acceptance Criteria

* User can transcribe an audio file from a prior n8n node.
* User can choose any supported output format.
* Text/subtitle output is available as JSON text.
* Optional binary output works for text-like outputs.
* Detailed JSON preserves segments, words, timestamps, and speaker labels when returned by the API.
* Errors include useful messages and status codes.

---

## 9.4 Operation: Transcribe Remote URL

### Purpose

Transcribe an audio file hosted at a publicly accessible URL.

### API Behavior

Uses the Speechall remote transcription endpoint.

### Required Inputs

| Field         | Type                     | Required | Default | Notes                                     |
| ------------- | ------------------------ | -------: | ------- | ----------------------------------------- |
| File URL      | String                   |      Yes | None    | Publicly accessible audio URL             |
| Model         | Dynamic options / string |      Yes | None    | Model identifier                          |
| Language      | Options / string         |       No | `en`    | Should include `auto`                     |
| Output Format | Options                  |       No | `text`  | `text`, `json_text`, `json`, `srt`, `vtt` |

### Advanced Inputs

Same as **Transcribe File**, plus:

| Field                    | Type             | Required | Notes                                            |
| ------------------------ | ---------------- | -------: | ------------------------------------------------ |
| Inline Replacement Rules | Fixed collection |       No | Exact, regex, and regex group rules if supported |
| Ruleset ID               | String           |       No | Reusable ruleset ID                              |

### Output Behavior

Same as **Transcribe File**, except `source` should be `remote_url` and the output should include `fileUrl` metadata when safe.

### Acceptance Criteria

* User can transcribe a public MP3, WAV, M4A, MP4, OGG, FLAC, or other supported audio URL.
* Inaccessible URL errors are clear.
* Output formats match the behavior of Transcribe File.
* Inline replacement rules are passed correctly when configured.
* Ruleset ID is passed correctly when configured.

---

## 9.5 Operation: OpenAI-Compatible Transcription

### Purpose

Support users migrating from OpenAI-style audio transcription workflows or users who already expect OpenAI-compatible request/response behavior.

### API Behavior

Uses the Speechall OpenAI-compatible transcription endpoint.

### Inputs

| Field                   | Type                     | Required | Default   | Notes                                        |
| ----------------------- | ------------------------ | -------: | --------- | -------------------------------------------- |
| Binary Property         | String                   |      Yes | `data`    | Audio file input                             |
| Model                   | Dynamic options / string |      Yes | None      | Speechall `provider.model` format            |
| Language                | String                   |       No | None      | Input language                               |
| Prompt                  | String                   |       No | None      | Equivalent to initial prompt                 |
| Response Format         | Options                  |       No | `json`    | `json`, `text`, `srt`, `verbose_json`, `vtt` |
| Temperature             | Number                   |       No | 0         | 0 to 1                                       |
| Timestamp Granularities | Multi-options            |       No | `segment` | `word`, `segment`; only with verbose JSON    |

### Scope Guardrail

This operation must be transcription-only. It must not expose translation.

### Output Behavior

Return the API response with minimal transformation, while still ensuring it conforms to n8n’s expected item structure.

### Acceptance Criteria

* User can transcribe using OpenAI-compatible request structure.
* Response formats behave as expected.
* Verbose JSON preserves words and segments.
* Translation is not exposed in the UI.

---

## 9.6 Operation: List Models

### Purpose

Retrieve available speech-to-text models and their capabilities.

### API Behavior

Calls the Speechall model listing endpoint.

### Inputs

Optional filters may be added if helpful:

| Field                | Type           | Required | Notes                                                   |
| -------------------- | -------------- | -------: | ------------------------------------------------------- |
| Provider             | String/options |       No | Filter returned models client-side                      |
| Available Only       | Boolean        |       No | Show only currently available models                    |
| Supports Diarization | Boolean        |       No | Client-side filter                                      |
| Supports SRT         | Boolean        |       No | Client-side filter                                      |
| Supports VTT         | Boolean        |       No | Client-side filter                                      |
| Supports Streaming   | Boolean        |       No | Metadata only; streaming operation remains out of scope |

### Output Behavior

Return each model as one n8n item or return a single item with a models array. Preferred default: one item per model, because it is easier to process in n8n.

Example item:

```json
{
  "id": "openai.whisper-1",
  "displayName": "OpenAI Whisper",
  "provider": "openai",
  "isAvailable": true,
  "supportedLanguages": [],
  "supportsSrt": true,
  "supportsVtt": true,
  "diarization": false,
  "punctuation": true,
  "wordTimestamps": true,
  "costPerSecondUsd": null
}
```

### Acceptance Criteria

* User can list models with a valid API key.
* Dynamic model dropdowns use this endpoint.
* Model metadata is preserved for downstream workflow logic.
* If the model endpoint fails, the transcription operations still allow manual model ID entry.

---

## 9.7 Dynamic Model Selection

### Requirement

The model field in transcription operations should dynamically fetch available Speechall speech-to-text models.

### UX Requirements

The field should support two modes:

1. **Choose from list**
2. **Enter model ID manually**

This prevents workflows from breaking when new models are added before the node is updated.

### Model Option Label

Model dropdown labels should be human-readable:

```text
OpenAI Whisper — openai.whisper-1
Deepgram Nova 3 — deepgram.nova-3
```

### Acceptance Criteria

* Model dropdown loads dynamically from the Speechall API.
* User can manually enter a model ID.
* Model IDs use the `provider.model` format.
* The node does not require package releases for newly available Speechall models.

---

## 9.8 Output Formats

### Requirement

The node must support all Speechall speech-to-text output formats:

1. `text`
2. `json_text`
3. `json`
4. `srt`
5. `vtt`

The OpenAI-compatible operation should support:

1. `json`
2. `text`
3. `srt`
4. `verbose_json`
5. `vtt`

### Acceptance Criteria

* Output format is visible and easy to understand.
* Plain text and subtitle responses are normalized into n8n JSON.
* Optional binary output is available for text, SRT, and VTT.
* Detailed JSON is not flattened destructively.
* Diarized transcript data is preserved when available.

---

## 9.9 Diarization and Speaker Labels

### Requirement

The node should expose diarization as an advanced option.

### Inputs

| Field             | Type    | Notes                                         |
| ----------------- | ------- | --------------------------------------------- |
| Diarization       | Boolean | Enables diarization where supported           |
| Speakers Expected | Number  | Optional hint for expected number of speakers |

### Output

When diarization is enabled and supported, returned `segments` and/or `words` should preserve speaker identifiers.

### Acceptance Criteria

* User can enable diarization.
* User can provide expected speaker count.
* Speaker labels are returned when the API provides them.
* Unsupported model/provider cases are handled through clear API errors or warnings.

---

## 9.10 Custom Vocabulary

### Requirement

The node should allow users to provide custom vocabulary terms.

### UX

Use a fixed collection or comma-separated list. Preferred UX:

```text
Custom Vocabulary
  - Term
  - Term
  - Term
```

### Acceptance Criteria

* User can add multiple custom vocabulary terms.
* Values are sent as an array.
* Empty values are ignored.
* API errors from unsupported providers are surfaced clearly.

---

## 9.11 Replacement Ruleset Support

### Requirement

The transcription operations should allow users to provide an existing `ruleset_id`.

### Remote URL Inline Rules

For remote URL transcription, the node should support inline replacement rules if supported by the API.

Rule types:

1. Exact match
2. Regex
3. Regex group

### Acceptance Criteria

* User can provide a ruleset ID.
* Remote URL transcription can include inline rules.
* Exact, regex, and regex group rule structures are serialized correctly.
* Invalid rule configurations are caught where possible before API submission.

---

## 9.12 Error Handling

### Requirement

The node should provide useful error messages for all expected API error classes.

### Expected Error Categories

| Status | Meaning             | Expected Node Behavior                                      |
| -----: | ------------------- | ----------------------------------------------------------- |
|    400 | Bad request         | Show validation or unsupported option message               |
|    401 | Unauthorized        | Show invalid/missing API key message                        |
|    402 | Payment required    | Show no credit/payment message                              |
|    404 | Not found           | Show invalid endpoint, ruleset, or inaccessible URL message |
|    429 | Rate limit          | Show rate limit message and retry guidance if available     |
|    500 | Server error        | Show retry/contact support message                          |
|    503 | Service unavailable | Show temporary unavailability message                       |
|    504 | Gateway timeout     | Show upstream provider timeout message                      |

### Acceptance Criteria

* Errors are attached to the correct input item.
* `Continue On Fail` works.
* Error messages include API-provided message and code when available.
* Sensitive data, especially API keys, is never included in errors or logs.
* Rate limit responses preserve retry guidance where available.

---

## 10. UX Requirements

## 10.1 Node Identity

| Attribute     | Value                                          |
| ------------- | ---------------------------------------------- |
| Display Name  | Speechall                                      |
| Internal Name | `speechall`                                    |
| Package Name  | `n8n-nodes-speechall`                          |
| Icon          | Speechall logo SVG                             |
| Category      | AI or Utility, depending on n8n classification |
| Description   | Transcribe audio using Speechall               |

## 10.2 Operation Naming

Use n8n-style action labels:

* Transcribe a file
* Transcribe a remote URL
* Create an OpenAI-compatible transcription
* List speech-to-text models

## 10.3 Field Organization

Fields should be grouped as:

1. Required fields
2. Output options
3. Advanced options

Advanced options should not overwhelm first-time users.

## 10.4 Defaults

Recommended defaults:

| Field                                           | Default   |
| ----------------------------------------------- | --------- |
| Binary Property                                 | `data`    |
| Language                                        | `en`      |
| Output Format                                   | `text`    |
| Punctuation                                     | `true`    |
| Diarization                                     | `false`   |
| Response Format for OpenAI-compatible operation | `json`    |
| Timestamp Granularity                           | `segment` |

## 10.5 Help Text

Each field should include concise n8n-style descriptions.

Examples:

* **Model:** “Speechall model ID, for example `openai.whisper-1`. Choose from available models or enter a custom ID.”
* **Language:** “Language code of the audio. Use `auto` for automatic detection when supported by the selected model.”
* **Output Format:** “Transcript output format. Use `json` for timestamps, segments, speaker labels, and metadata.”
* **Diarization:** “Identify and label different speakers where supported by the selected model.”

---

## 11. Technical Requirements

## 11.1 Build Method

The node should be built as a programmatic n8n community node using TypeScript.

Rationale:

* Binary input handling requires custom logic.
* Different response content types require normalization.
* Optional binary transcript output requires custom handling.
* Error handling and item-level execution should be controlled explicitly.

## 11.2 Package Structure

Expected structure:

```text
n8n-nodes-speechall/
  credentials/
    SpeechallApi.credentials.ts
  nodes/
    Speechall/
      Speechall.node.ts
      Speechall.node.json
      speechall.svg
  package.json
  README.md
  LICENSE.md
  .github/
    workflows/
      publish.yml
```

## 11.3 Package Metadata

`package.json` must include:

```json
{
  "name": "n8n-nodes-speechall",
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "speechall",
    "transcription",
    "speech-to-text",
    "audio",
    "subtitles",
    "diarization"
  ],
  "license": "MIT"
}
```

The package must also define the node and credentials under the `n8n` package attribute.

## 11.4 Dependencies

The node should avoid runtime external dependencies to comply with verified node expectations.

If helper functions are needed, they should be implemented internally unless n8n’s standards allow otherwise.

## 11.5 API Client Approach

The node should call Speechall’s REST API directly through n8n HTTP helpers.

The Speechall SDK should not be required in v1 unless the technical architect determines there is a critical benefit that does not conflict with n8n verification expectations.

## 11.6 Binary Handling

The node must use n8n’s binary data helpers to read input binary files.

The node must not directly access internal binary storage assumptions.

## 11.7 Request Content Types

| Operation                       | Request Type        |
| ------------------------------- | ------------------- |
| Transcribe File                 | Raw binary body     |
| Transcribe Remote URL           | JSON body           |
| OpenAI-Compatible Transcription | Multipart form data |
| List Models                     | GET request         |

## 11.8 Response Handling

The implementation must handle both JSON and text responses.

Text-like responses should be wrapped in n8n JSON item format.

Detailed JSON should be preserved.

## 11.9 Security

The node must not:

* Read environment variables.
* Access the file system.
* Log API keys.
* Include sensitive values in error messages.
* Send credentials to non-Speechall endpoints.
* Use user-provided base URLs in v1.

## 11.10 Publishing

The package must be published to npm through GitHub Actions with provenance.

Local machine publishing should not be used for the verification-targeted release.

---

## 12. Verification and Distribution Requirements

## 12.1 Verification Target

The initial public release should be built as a verification-ready n8n community node.

## 12.2 Required Distribution Assets

1. Public GitHub repository under the Speechall account.
2. MIT license.
3. npm package named `n8n-nodes-speechall`.
4. README with setup, usage, examples, credentials, and troubleshooting.
5. GitHub Actions workflow for npm publishing with provenance.
6. Passing lint and build checks.
7. Passing n8n community package scan.
8. Example n8n workflow JSON files.

## 12.3 README Requirements

The README should include:

1. What Speechall is.
2. What the n8n node does.
3. How to get a Speechall API key.
4. How to add Speechall credentials in n8n.
5. Supported operations.
6. Supported output formats.
7. Example workflows.
8. Error troubleshooting.
9. Link to Speechall documentation.
10. Maintainer and support information.
11. License.

## 12.4 Example Workflows

At minimum, include these examples:

### Example 1: Google Drive Audio to Transcript

```text
Google Drive Trigger → Download File → Speechall Transcribe File → Google Docs
```

### Example 2: Webhook Audio Upload to JSON Transcript

```text
Webhook → Speechall Transcribe File → Respond to Webhook
```

### Example 3: Remote Podcast URL to SRT

```text
Manual Trigger → Set Podcast URL → Speechall Transcribe Remote URL → Upload SRT to Storage
```

### Example 4: Meeting Recording to Diarized Transcript

```text
Cloud Storage Trigger → Speechall Transcribe File with Diarization → Slack / Notion
```

---

## 13. Acceptance Criteria

## 13.1 Product Acceptance

The product is acceptable when:

1. n8n users can authenticate with a Speechall API key.
2. Users can transcribe binary audio files.
3. Users can transcribe public remote audio URLs.
4. Users can use OpenAI-compatible transcription.
5. Users can list available Speechall models.
6. Users can dynamically select a model.
7. Users can manually enter a model ID.
8. Users can choose all supported output formats.
9. Users can enable diarization.
10. Users can use timestamps and detailed JSON outputs.
11. Users can provide custom vocabulary.
12. Users can provide a ruleset ID.
13. Text, JSON, SRT, VTT, and diarized transcript outputs are usable in downstream n8n nodes.
14. Error messages are clear and actionable.
15. The package is ready for n8n verification submission.

## 13.2 Technical Acceptance

The implementation is acceptable when:

1. TypeScript build passes.
2. n8n linting passes.
3. n8n scan-community-package passes.
4. Local n8n development instance loads the node.
5. Credentials test succeeds with a valid API key.
6. All operations work against the live Speechall API.
7. Binary input handling works with common n8n source nodes.
8. No runtime external dependencies are included unless explicitly approved.
9. No API keys or sensitive data appear in logs.
10. GitHub Actions publishes the package to npm with provenance.

## 13.3 Verification Acceptance

The verification effort is acceptable when:

1. Package is published under the Speechall-owned npm account or approved owner.
2. GitHub repo is public under the Speechall GitHub organization.
3. Package metadata satisfies n8n community node requirements.
4. README and examples are complete.
5. The node is submitted through n8n’s verification process.
6. n8n reviewers can install, test, and validate the node without private setup beyond a Speechall API key.

---

## 14. Metrics and Success Criteria

## 14.1 Launch Success

Primary launch success:

1. Node is accepted as a verified n8n community node.
2. Node is installable from n8n Cloud.
3. Node appears in the n8n integration discovery experience.
4. Node receives a public n8n integration listing.

## 14.2 Adoption Metrics

Track:

1. npm downloads.
2. GitHub stars.
3. GitHub issues.
4. Speechall API calls originating from n8n.
5. New Speechall signups attributed to n8n.
6. Active API keys used from n8n workflows.
7. Number of users using Transcribe File vs Transcribe Remote URL.
8. Output format usage split.
9. Model usage split.
10. Error rates by operation.

## 14.3 Quality Metrics

Track:

1. Transcription operation success rate.
2. 401 authentication failure rate.
3. 402 payment required rate.
4. 429 rate limit frequency.
5. 5xx/timeout rate.
6. Median transcription request duration.
7. Support tickets related to n8n setup.
8. GitHub issue resolution time.

---

## 15. Release Plan

## 15.1 Milestone 1: Technical Foundation

Deliverables:

1. Create public GitHub repo.
2. Scaffold node with official n8n node tooling.
3. Add MIT license.
4. Add Speechall credentials.
5. Add package metadata.
6. Add local dev setup.
7. Add CI checks.

Exit criteria:

* Node loads in local n8n.
* Credentials can be created.
* Build and lint pass.

## 15.2 Milestone 2: Core Transcription

Deliverables:

1. Implement Transcribe File.
2. Implement Transcribe Remote URL.
3. Implement output format handling.
4. Implement advanced transcription fields.
5. Implement error handling.
6. Implement optional binary transcript output.

Exit criteria:

* Local file transcription works.
* Remote URL transcription works.
* Text, JSON, SRT, and VTT outputs work.
* Diarization and timestamps are preserved when returned.

## 15.3 Milestone 3: Model Discovery and Compatibility

Deliverables:

1. Implement List Models.
2. Implement dynamic model dropdown.
3. Implement manual model ID fallback.
4. Implement OpenAI-Compatible Transcription.

Exit criteria:

* Models load dynamically.
* Manual model IDs work.
* OpenAI-compatible transcription works.

## 15.4 Milestone 4: Verification Readiness

Deliverables:

1. Complete README.
2. Add example workflows.
3. Add tests where appropriate.
4. Add GitHub Actions npm publish workflow with provenance.
5. Run n8n package scan.
6. Publish npm package.
7. Submit to n8n Creator Portal / verification process.

Exit criteria:

* npm package is public.
* GitHub repository is public.
* Verification checklist is complete.
* Submission is ready for n8n review.

---

## 16. Risks and Mitigations

| Risk                                                   | Impact                 | Mitigation                                                                                  |
| ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------- |
| n8n verification rejects package due to dependencies   | Delayed listing        | Avoid runtime external dependencies                                                         |
| Binary handling differs across n8n deployments         | Transcription failures | Use official n8n binary helpers                                                             |
| Long synchronous transcriptions hit timeouts           | Failed executions      | Expose timeout guidance and document workflow expectations                                  |
| Provider-specific options not supported by every model | User confusion         | Use help text and model metadata; surface API errors clearly                                |
| Dynamic model endpoint unavailable                     | Poor UX                | Allow manual model ID entry                                                                 |
| OpenAI-compatible translation appears in API spec      | Scope creep            | Exclude translation from node UI                                                            |
| Large files cause n8n memory pressure                  | Workflow instability   | Document n8n deployment considerations; rely on remote URL operation for large hosted files |
| Verification process changes                           | Launch delay           | Follow current n8n docs and keep package standards conservative                             |

---

## 17. Open Questions for Architect

These questions do not block the PRD but should be resolved during technical planning:

1. Should text/SRT/VTT outputs be returned as binary by default or only when the user opts in?
2. Should model capability metadata dynamically hide unsupported options, or should all options remain visible with clear help text?
3. Should the node include client-side validation for output formats per model, or rely on API errors?
4. Should Transcribe File use raw binary endpoint by default and reserve OpenAI-compatible transcription as an advanced operation?
5. What request timeout should be recommended for long synchronous transcription jobs?
6. Should example workflows be stored as JSON files in `/examples` or embedded only in README?
7. Should the node include telemetry-safe user agent metadata such as `n8n-nodes-speechall/version`?

---

## 18. Recommended Implementation Defaults

Unless the architect decides otherwise, use these defaults:

```text
Node name: Speechall
Package name: n8n-nodes-speechall
Build style: Programmatic TypeScript node
Authentication: Bearer API key
Credential test: List speech-to-text models
Primary operations:
  - Transcribe File
  - Transcribe Remote URL
  - OpenAI-Compatible Transcription
  - List Models
Default language: en
Allow automatic language detection: yes, via auto
Default output format: text
Advanced options:
  - punctuation
  - diarization
  - initial_prompt
  - temperature
  - speakers_expected
  - custom_vocabulary
  - ruleset_id
  - inline replacement rules for remote URL transcription where supported
Model selection:
  - dynamic dropdown
  - manual model ID fallback
Output:
  - normalized JSON for all operations
  - optional binary file output for text, srt, and vtt
Distribution:
  - public GitHub repo
  - MIT license
  - npm package
  - GitHub Actions provenance publishing
  - n8n verification submission
```

---

## 19. Final Definition of Done

The project is done when:

1. `n8n-nodes-speechall` is published to npm from the Speechall-owned repository.
2. The node can be installed and used in a local n8n instance.
3. The node can authenticate using a Speechall API key.
4. The node supports binary file transcription.
5. The node supports remote URL transcription.
6. The node supports OpenAI-compatible transcription.
7. The node supports model listing and dynamic model selection.
8. The node supports all required output formats.
9. The node supports advanced transcription parameters.
10. The node has complete documentation and example workflows.
11. The package passes n8n linting and verification-oriented scans.
12. The package is submitted for n8n verification.
13. After approval, Speechall is installable from n8n Cloud and eligible for the n8n integrations directory.
