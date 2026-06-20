# Speechall n8n Node Implementation Plan

Status: Implementation-ready after preconditions  
Date: 2026-06-20  
Source PRD: [idea/prd.md](./prd.md)

## 1. Executive Decision Summary

Build `n8n-nodes-speechall` as a programmatic TypeScript n8n community node using the official n8n node scaffold. The node will call Speechall REST endpoints directly through n8n HTTP and binary helpers.

The official Speechall TypeScript SDK is useful as a contract reference, but it should not be a runtime dependency for v1. Current n8n verification guidance says verified community nodes are not allowed runtime dependencies, and the SDK itself currently has runtime dependencies. Since n8n Cloud verification is the primary success criterion in the PRD, the implementation should keep `dependencies` empty and use npm packages only as `devDependencies` or `peerDependencies`.

Key decisions:

- Node package: `n8n-nodes-speechall`.
- Node display name: `Speechall`.
- API base URL: `https://api.speechall.com/v1`.
- Authentication: Bearer API key credential named `Speechall API`.
- Runtime npm dependencies: none.
- Type safety: generate local TypeScript types from the Speechall OpenAPI spec during development using `openapi-typescript`.
- Transport: internal wrapper around n8n's authenticated HTTP helpers.
- Binary audio input: n8n binary data helpers only.
- Output normalization: consistent n8n item JSON for Speechall transcription endpoints.
- Release: GitHub Actions npm publish with provenance.

Hard preconditions before implementation:

1. Resolve the PRD conflict around OpenAI-compatible transcription by updating the PRD or recording explicit product approval for this plan's v1 scope.
2. Generate a fresh project with `npm create @n8n/node@latest` and verify the scaffolded scripts, dependency shape, and publish workflow before adding custom scripts.
3. Confirm the source URL redaction policy: sanitized URL by default, full URL only by explicit user opt-in.

Scope correction from the PRD:

- Do not expose Speechall's OpenAI-compatible transcription endpoint in the dedicated n8n node v1.
- The OpenAI-compatible endpoint is designed for users and tools that already speak the OpenAI API shape and do not have a Speechall-specific integration.
- A dedicated Speechall node should expose Speechall-native concepts directly, which is simpler for users and reduces verification, documentation, UI, and testing surface area.
- The OpenAI-compatible endpoint can still be documented separately for users who prefer generic HTTP/OpenAI-shaped workflows outside this node.
- This is a product scope change from the PRD and a hard precondition for implementation. Before any scaffold or code work starts, either update `idea/prd.md` to remove OpenAI-compatible transcription from v1 or record explicit product approval that this implementation plan supersedes that PRD item.
- The current OpenAPI marks `/openai-compatible/audio/transcriptions` with `x-internal: true` and `x-fern-ignore: true`, which supports treating it as an API compatibility surface rather than a dedicated-node v1 feature.

## 2. References Reviewed

- PRD: [idea/prd.md](./prd.md)
- Speechall TypeScript SDK: `https://github.com/Speechall/speechall-typescript-sdk`
- Speechall OpenAPI spec: `https://github.com/Speechall/speechall-openapi/blob/main/openapi.yaml`
- n8n community node docs: `https://docs.n8n.io/integrations/community-nodes/build-community-nodes/`
- n8n starter package: `https://github.com/n8n-io/n8n-nodes-starter`

Relevant OpenAPI facts:

- Server: `https://api.speechall.com/v1`.
- `POST /transcribe`: raw audio body, query parameters.
- `POST /transcribe-remote`: JSON body.
- `GET /speech-to-text-models`: model discovery.
- Global auth: HTTP bearer token.
- Supported transcription outputs: `text`, `json_text`, `json`, `srt`, `vtt`.
- OpenAI-compatible endpoints exist in the API spec, and `/openai-compatible/audio/transcriptions` is marked `x-internal: true` and `x-fern-ignore: true`; those endpoints are intentionally out of scope for this dedicated integration.

## 3. Third-Party npm Package Decisions

### 3.1 Runtime Dependencies

Do not add runtime dependencies.

```json
{
  "dependencies": {}
}
```

Rationale:

- n8n verification currently requires verified community nodes to avoid runtime dependencies.
- The PRD's primary success criterion is verified n8n distribution and n8n Cloud installability.
- n8n already provides the important runtime primitives we need: credential injection, HTTP helpers, binary helpers, item pairing, error types, and node UI schema types.

### 3.2 Speechall SDK Decision

Do not install `@speechall/sdk` in `dependencies` for v1.

The SDK is official and should be used as a reference for request/response behavior, naming, examples, and error semantics. However, as of this plan, `@speechall/sdk@2.1.0` has runtime dependencies:

- `url-join`
- `@types/url-join`

That conflicts with verified-node readiness. If n8n later allows runtime dependencies for verified nodes, v2 can reconsider using the SDK directly.

### 3.3 Development and Build Packages

Use the n8n scaffold defaults and pin versions through `package-lock.json`.

Recommended `devDependencies`:

| Package | Version Strategy | Purpose |
| --- | --- | --- |
| `@n8n/node-cli` | Scaffold current; enforce `>=0.23.0` for provenance support | Build, dev server, lint, release, and provenance-aware packaging support |
| `typescript` | Scaffold-compatible version, currently `5.9.3` in starter | Compile TypeScript node source |
| `eslint` | Scaffold-compatible version, currently `9.39.4` in starter | Lint node code using n8n rules |
| `prettier` | Scaffold-compatible version, currently `3.8.3` or later patch | Formatting |
| `release-it` | Scaffold-compatible version, currently `20.2.0` | Version, tag, and release workflow used by n8n scaffold |
| `openapi-typescript` | `^7.13.0` | Generate local TypeScript types from Speechall OpenAPI during development |
| `vitest` | `^4.1.9` | Unit tests for pure helpers such as output normalization and rule serialization |
| `@types/node` | `^22.20.0` | Node 22 type support for Buffer and native web APIs |

Peer dependency decision:

```json
{
  "n8n-workflow": "*"
}
```

Use the `peerDependencies` shape generated by `npm create @n8n/node@latest`. Before release, validate whether `n8n-workflow` as a peer dependency is accepted by the current n8n verification checks. If the scaffold no longer includes it or verification guidance changes, follow the scaffold and current verification tooling instead of this static example.

Do not add the following unless verification rules change:

- `@speechall/sdk`
- `axios`
- `form-data`
- `mime-types`
- `zod`
- `lodash`
- `yaml`

Use platform or n8n equivalents instead.

### 3.4 Scripts

Start from the scripts generated by `npm create @n8n/node@latest`. Do not hardcode extra n8n CLI commands until they are verified in the installed `@n8n/node-cli` version. The expected shape is:

```json
{
  "scripts": {
    "build": "n8n-node build",
    "build:watch": "tsc --watch",
    "dev": "n8n-node dev",
    "lint": "n8n-node lint",
    "lint:fix": "n8n-node lint --fix",
    "release": "n8n-node release",
    "generate:openapi-types": "openapi-typescript https://raw.githubusercontent.com/Speechall/speechall-openapi/main/openapi.yaml -o nodes/Speechall/generated/speechall-openapi.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

If the scaffold includes `prepublishOnly`, `prerelease`, `cloud-support`, or other verification-oriented commands, keep and use them. If it does not, do not invent script names; rely on the generated publish workflow and documented n8n CLI commands.

Keep the generated file under `nodes/Speechall/generated/` and treat it as source. The generator remains dev-only.

## 4. Target Repository Structure

Use `npm create @n8n/node@latest` to scaffold, then replace example content.

```text
n8n-nodes-speechall/
  credentials/
    SpeechallApi.credentials.ts
  nodes/
    Speechall/
      Speechall.node.ts
      Speechall.node.json
      speechall.svg
      descriptions/
        SpeechToText.description.ts
      loadOptions/
        getSpeechToTextModels.ts
      transport/
        speechallApiRequest.ts
        errors.ts
      operations/
        listModels.operation.ts
        transcribeFile.operation.ts
        transcribeRemoteUrl.operation.ts
      helpers/
        binary.ts
        fields.ts
        normalize.ts
        replacementRules.ts
        models.ts
      generated/
        speechall-openapi.ts
  examples/
    google-drive-audio-to-transcript.json
    webhook-audio-upload-to-json-transcript.json
    remote-podcast-url-to-srt.json
    meeting-recording-to-diarized-transcript.json
  test/
    normalize.test.ts
    operations.test.ts
    replacementRules.test.ts
    models.test.ts
  .github/
    workflows/
      publish.yml
      ci.yml
  package.json
  package-lock.json
  README.md
  LICENSE.md
  tsconfig.json
```

Implementation notes:

- Keep `nodes/Speechall/Speechall.node.ts` small. It should define the node, UI properties, and dispatch to operation modules.
- Put reusable HTTP logic in `transport/`.
- Put pure data mapping in `helpers/` and test those helpers with Vitest.
- Keep example workflows in `/examples` as JSON files and link to them from README.

## 5. package.json Plan

Minimum package metadata:

```json
{
  "name": "n8n-nodes-speechall",
  "version": "0.1.0",
  "description": "Transcribe audio in n8n using Speechall",
  "license": "MIT",
  "homepage": "https://github.com/Speechall/speechall-n8n-node",
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
  "author": {
    "name": "Speechall"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/Speechall/speechall-n8n-node.git"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "strict": true,
    "credentials": [
      "dist/credentials/SpeechallApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Speechall/Speechall.node.js"
    ]
  },
  "dependencies": {}
}
```

Add `peerDependencies` exactly as generated by the n8n scaffold after confirming they pass the current verification checks. Do not add peer dependencies by hand if the scaffold omits them.

## 6. Credential Interface

File: `credentials/SpeechallApi.credentials.ts`

Class:

```ts
export class SpeechallApi implements ICredentialType {
  name = 'speechallApi';
  displayName = 'Speechall API';
}
```

Credential fields:

| Display Name | Internal Name | Type | Required | Notes |
| --- | --- | --- | --- | --- |
| API Key | `apiKey` | string password | yes | Stored by n8n credential system |

Authentication:

```ts
authenticate: IAuthenticateGeneric = {
  type: 'generic',
  properties: {
    headers: {
      Authorization: '=Bearer {{$credentials?.apiKey}}',
    },
  },
};
```

Credential test:

```ts
test: ICredentialTestRequest = {
  request: {
    baseURL: 'https://api.speechall.com/v1',
    url: '/speech-to-text-models',
    method: 'GET',
  },
};
```

Credential test semantics:

- This test checks whether the credential can access Speechall's API and whether the account is ready enough to retrieve model metadata.
- `401` means the API key is invalid or missing.
- `402` means the API key may be valid, but the account has a billing or credit issue. Show that as an account readiness failure, not as an invalid-key error.
- Other 4xx/5xx errors should preserve the Speechall message and status code.

Security requirements:

- Never expose `apiKey` as a normal string field.
- Never include `apiKey` in manually constructed errors.
- Never support a user-configurable API base URL in v1.

## 7. Node Interface

File: `nodes/Speechall/Speechall.node.ts`

Node description:

```ts
export class Speechall implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Speechall',
    name: 'speechall',
    icon: { light: 'file:speechall.svg', dark: 'file:speechall.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Transcribe audio using Speechall',
    defaults: {
      name: 'Speechall',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: 'speechallApi',
        required: true,
      },
    ],
    properties: [...speechToTextProperties],
  };
}
```

Resource layout:

- Resource: `Speech-to-Text`
- Operations:
  - `Transcribe a file`
  - `Transcribe a remote URL`
  - `List speech-to-text models`

Use a `resource` options field even though v1 has only one resource. This preserves the future app-node shape required by the PRD.

## 8. Shared Type Interfaces

Use generated OpenAPI types for compile-time checks where ergonomic. Wrap them in small local interfaces for node logic so the implementation is not tightly coupled to generated type paths.

```ts
export type TranscriptOutputFormat = 'text' | 'json_text' | 'json' | 'srt' | 'vtt';

export interface SpeechallModel {
  id: string;
  model?: string;
  identifier?: string;
  display_name?: string;
  provider?: string;
  description?: string | null;
  cost_per_second_usd?: number | null;
  is_available?: boolean;
  supported_languages?: string[] | null;
  supported_formats?: string[] | null;
  punctuation?: boolean | null;
  diarization?: boolean | null;
  streamable?: boolean | null;
  max_duration_seconds?: number | null;
  max_file_size_bytes?: number | null;
  speaker_labels?: boolean | null;
  word_timestamps?: boolean | null;
  language_detection?: boolean | null;
  custom_vocabulary_support?: boolean | null;
  supports_srt?: boolean;
  supports_vtt?: boolean;
}

export type ReplacementRule =
  | {
      kind: 'exact';
      search: string;
      replacement: string;
      caseSensitive?: boolean;
    }
  | {
      kind: 'regex';
      pattern: string;
      replacement: string;
      flags?: RegexRuleFlag[];
    }
  | {
      kind: 'regex_group';
      pattern: string;
      groupReplacements: Record<string, string>;
      flags?: RegexRuleFlag[];
    };

export type RegexRuleFlag = 'i' | 'm' | 's' | 'u' | 'x';

export interface NormalizedTranscriptionItem {
  text?: string;
  outputFormat: TranscriptOutputFormat;
  model: string;
  language?: string;
  source: 'binary' | 'remote_url';
  fileUrl?: string;
  id?: string;
  segments?: unknown[];
  words?: unknown[];
  [key: string]: unknown;
}
```

## 9. API Transport Layer

File: `nodes/Speechall/transport/speechallApiRequest.ts`

Centralize all API calls behind a small wrapper. Internally, prefer full HTTP responses so response body, content type, status code, and retry headers are always available for normalization and error handling:

```ts
export interface SpeechallApiResponse<T = unknown> {
  statusCode: number;
  headers: IDataObject;
  body: T;
  rawBody?: string | Buffer;
}

export async function speechallApiRequest<T>(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  options: {
    qs?: IDataObject;
    body?: unknown;
    headers?: IDataObject;
    timeoutMs?: number;
    json?: boolean;
    encoding?: 'json' | 'text' | 'arraybuffer';
  } = {},
): Promise<SpeechallApiResponse<T>> {
  // Uses this.helpers.httpRequestWithAuthentication('speechallApi', requestOptions)
  // with returnFullResponse enabled.
}
```

Base request defaults:

- `baseURL`: `https://api.speechall.com/v1`
- `url`: endpoint
- `method`: passed in
- `timeout`: advanced field value or sensible default
- `headers.Accept`: `application/json, text/plain, */*`
- `headers.User-Agent`: `n8n-nodes-speechall`
- `headers.X-Speechall-Client`: `n8n-nodes-speechall`

Timeout strategy:

- Credential/model list requests: 30 seconds.
- Transcription requests default: 300 seconds.
- Advanced user field: `Request Timeout (Seconds)`, range 1-900.
- Convert to milliseconds for HTTP helper options.
- Document that n8n instance-level execution timeouts may still end long workflows.

Large file and model-limit strategy:

- Do not download or preflight remote URLs from the node; let Speechall validate remote file accessibility and size.
- For binary uploads, fetch `/speech-to-text-models` once per execution when the model was selected from the dynamic dropdown, then look up the selected model id for metadata.
- Compare the n8n binary metadata size against the selected model's `max_file_size_bytes` only when both values are available.
- If the selected model has a known `max_file_size_bytes` and the binary input exceeds it, fail locally with a clear `NodeOperationError` before uploading.
- If the model was entered manually, or if size metadata is unavailable, send the request and surface Speechall's API error.
- Do not estimate audio duration locally in v1. Document `max_duration_seconds` from List Models and recommend Remote URL transcription for large hosted files.
- README must explain the interaction between Speechall model limits, node request timeout, and n8n instance execution timeouts.

Error strategy:

- Use `NodeApiError` for HTTP/API failures.
- Use `NodeOperationError` for local validation failures, such as missing binary data.
- Preserve status code, Speechall `message`, Speechall `code`, and `Retry-After` header when available.
- Parse transcription responses from the full response: use requested output format first, then `Content-Type`, then conservative JSON detection for ambiguous bodies.
- Sanitize URLs and headers before putting them into error data.

## 10. Dynamic Model Selection

Implement two explicit model modes. Use a normal n8n `options` field with `typeOptions.loadOptionsMethod` for dynamic model loading. Do not use `listSearch` unless the field is changed to a `resourceLocator`.

| Field | Internal Name | Type | Default |
| --- | --- | --- | --- |
| Model Selection | `modelSelectionMode` | options: `list`, `manual` | `list` |
| Model | `model` | dynamic options | none |
| Model ID | `modelId` | string | empty |

`model` is shown when `modelSelectionMode=list`.

`modelId` is shown when `modelSelectionMode=manual`.

Helper:

```ts
export function getSelectedModel(parameters: INodeParameters): string {
  return parameters.modelSelectionMode === 'manual'
    ? String(parameters.modelId)
    : String(parameters.model);
}
```

Dynamic options property shape:

```ts
{
  displayName: 'Model',
  name: 'model',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getSpeechToTextModels',
  },
  displayOptions: {
    show: {
      modelSelectionMode: ['list'],
    },
  },
  default: '',
  required: true,
}
```

Load options method:

```ts
methods = {
  loadOptions: {
    async getSpeechToTextModels() {
      // Call GET /speech-to-text-models and return INodePropertyOptions[].
    },
  },
};
```

Model option labels:

```text
OpenAI Whisper v2 - openai.whisper-1
Deepgram Nova 3 - deepgram.nova-3
```

Fallback behavior:

- If model loading fails, dynamic dropdown shows an error in n8n.
- The manual model mode remains available so workflows are not blocked.
- Do not cache model results in node code for v1; n8n and the UI can handle repeated option loading.

## 11. Operation: List Speech-to-Text Models

Endpoint:

```text
GET /speech-to-text-models
```

Inputs:

| Field | Internal Name | Type | Default |
| --- | --- | --- | --- |
| Provider | `provider` | string | empty |
| Available Only | `availableOnly` | boolean | false |
| Supports Diarization | `supportsDiarization` | boolean | false |
| Supports SRT | `supportsSrt` | boolean | false |
| Supports VTT | `supportsVtt` | boolean | false |
| Supports Streaming | `supportsStreaming` | boolean | false |

Execution:

1. Call `/speech-to-text-models`.
2. Apply filters client-side.
3. Return one n8n item per model.
4. Normalize snake_case fields to the PRD's preferred camelCase while also preserving original raw model metadata under `raw`.

Output item:

```json
{
  "id": "openai.whisper-1",
  "displayName": "OpenAI Whisper v2",
  "provider": "openai",
  "isAvailable": true,
  "supportedLanguages": ["en", "auto"],
  "supportedFormats": ["text", "json", "json_text", "srt", "vtt"],
  "supportsSrt": true,
  "supportsVtt": true,
  "diarization": false,
  "punctuation": true,
  "wordTimestamps": true,
  "costPerSecondUsd": null,
  "raw": {}
}
```

Implementation detail:

- The current OpenAPI `SpeechToTextModel` schema uses `id` as the required identifier field.
- Older examples or SDK surfaces may refer to `model` or `identifier`.
- Normalize by using `model.id ?? model.model ?? model.identifier`; store the chosen value as `id`.
- Treat a model object with no usable identifier as malformed and skip it in dropdowns, while preserving the raw object in List Models output if the operation is called directly.
- `supported_formats` appears in examples but is not guaranteed by the formal schema. Treat it as optional.
- Derive `supportedFormats` only from explicit metadata: include `srt` when `supports_srt` is true, include `vtt` when `supports_vtt` is true, and include `text`, `json`, and `json_text` as general Speechall output formats unless the API later exposes model-specific flags for them.

## 12. Operation: Transcribe File

Endpoint:

```text
POST /transcribe
```

Request shape:

- Body: raw binary audio buffer.
- Query parameters:
  - `model`
  - `language`
  - `output_format`
  - `ruleset_id`
  - `punctuation`
  - `diarization`
  - `initial_prompt`
  - `temperature`
  - `speakers_expected`
  - `custom_vocabulary`

Core fields:

| Field | Internal Name | Type | Default | Required |
| --- | --- | --- | --- | --- |
| Binary Property | `binaryPropertyName` | string | `data` | yes |
| Model Selection | `modelSelectionMode` | options | `list` | yes |
| Model | `model` | dynamic options | none | if list |
| Model ID | `modelId` | string | empty | if manual |
| Language | `language` | options/string | `en` | no |
| Output Format | `outputFormat` | options | `text` | no |

Advanced fields:

| Field | Internal Name | Type | Default |
| --- | --- | --- | --- |
| Punctuation | `punctuation` | boolean | true |
| Diarization | `diarization` | boolean | false |
| Initial Prompt | `initialPrompt` | string | empty |
| Temperature | `temperature` | number | empty |
| Speakers Expected | `speakersExpected` | number | empty |
| Custom Vocabulary | `customVocabulary` | fixed collection | empty |
| Ruleset ID | `rulesetId` | string | empty |
| Request Timeout (Seconds) | `timeoutSeconds` | number | 300 |
| Also Return as Binary File | `alsoReturnBinary` | boolean | false |
| Binary Output Property | `binaryOutputProperty` | string | `transcript` |

Execution:

1. For each input item, read `binaryPropertyName`.
2. Validate binary data exists.
3. Use `this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName)`.
4. Use binary MIME type as `Content-Type` when available.
5. If MIME type is absent, use `application/octet-stream`; do not infer from file extension with a dependency.
6. Build query parameters, omitting empty values.
7. Send request through authenticated transport.
8. Normalize response according to `outputFormat`.
9. If `alsoReturnBinary` is enabled and output is `text`, `srt`, or `vtt`, attach transcript binary data.

Array query handling:

- Send `custom_vocabulary` as an array in `qs`.
- The expected OpenAPI style is repeated query params, for example `custom_vocabulary=Speechall&custom_vocabulary=API`.
- Verify n8n's helper serialization during implementation. If it serializes arrays incorrectly, manually build the query string with `URLSearchParams` using native Node APIs.

## 13. Operation: Transcribe Remote URL

Endpoint:

```text
POST /transcribe-remote
```

Request shape:

- Body: JSON.
- Required body fields:
  - `file_url`
  - `model`
- Optional body fields:
  - `language`
  - `output_format`
  - `ruleset_id`
  - `punctuation`
  - `diarization`
  - `initial_prompt`
  - `temperature`
  - `speakers_expected`
  - `custom_vocabulary`
  - `replacement_ruleset`

Core fields:

| Field | Internal Name | Type | Default | Required |
| --- | --- | --- | --- | --- |
| File URL | `fileUrl` | string | empty | yes |
| Model Selection | `modelSelectionMode` | options | `list` | yes |
| Model | `model` | dynamic options | none | if list |
| Model ID | `modelId` | string | empty | if manual |
| Language | `language` | options/string | `en` | no |
| Output Format | `outputFormat` | options | `text` | no |

Remote-specific advanced field:

| Field | Internal Name | Type | Default |
| --- | --- | --- | --- |
| Inline Replacement Rules | `replacementRules` | fixed collection | empty |
| Include Source URL in Output | `includeSourceUrl` | boolean | false |

Execution:

1. Validate `fileUrl` is non-empty and parses as `http:` or `https:`.
2. Build body using OpenAPI snake_case names.
3. Serialize inline replacement rules as `replacement_ruleset`.
4. Send JSON request.
5. Normalize response with `source: "remote_url"`.
6. Support optional transcript binary output for `text`, `srt`, and `vtt`.

Source URL output:

- Do not include the full `fileUrl` by default because remote URLs may contain signed S3/GCS query tokens or other secrets.
- Always include `source: "remote_url"`.
- Include `sourceUrlSanitized`, built from protocol, host, and path with query string and fragment removed.
- Include full `fileUrl` only when `includeSourceUrl` is explicitly enabled.

Replacement rule UI:

- Fixed collection with three rule groups:
  - Exact Match
  - Regex
  - Regex Group
- Exact rule fields:
  - `search`
  - `replacement`
  - `caseSensitive`
- Regex rule fields:
  - `pattern`
  - `replacement`
  - `flags` (`i`, `m`, `s`, `u`, `x`)
- Regex group rule fields:
  - `pattern`
  - `groupReplacements` fixed collection rows:
    - `groupNumber`
    - `replacement`
  - `flags` (`i`, `m`, `s`, `u`, `x`)

Regex group serialization:

- Convert rows like `{ groupNumber: 1, replacement: "[REDACTED]" }` into OpenAPI `groupReplacements` shape: `{ "1": "[REDACTED]" }`.
- Reject duplicate `groupNumber` rows.
- Require `groupNumber` to be a positive integer.

Validation:

- Exact: require `search` and `replacement`.
- Regex: require `pattern` and `replacement`.
- Regex group: require `pattern` and at least one group replacement.
- Validate regex syntax locally with `new RegExp(pattern, jsFlags.join(''))` only when the selected flags are JavaScript-compatible.
- The OpenAPI allows the `x` flag, which JavaScript `RegExp` does not support. If `x` is selected, skip local syntax validation and let Speechall validate the rule.
- Reject unknown flags before submission. Allowed flags are `i`, `m`, `s`, `u`, and `x`.
- Do not attempt to fully emulate server replacement behavior.

## 14. Shared Field Groups

Avoid duplicating field definitions manually across operations. Build small property factories:

```ts
export function modelSelectionFields(displayOptions: IDisplayOptions): INodeProperties[];
export function languageField(displayOptions: IDisplayOptions): INodeProperties;
export function transcriptOutputFormatField(displayOptions: IDisplayOptions): INodeProperties;
export function advancedTranscriptionFields(displayOptions: IDisplayOptions): INodeProperties[];
export function binaryOutputFields(displayOptions: IDisplayOptions): INodeProperties[];
```

Language field:

- Use an options list for common values and include `auto`.
- Add an "Enter Custom Language Code" mode only if the n8n UI becomes too long.
- For v1, include `auto`, `en`, `en_us`, `en_uk`, `en_au`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `tr`, `ar`, `ja`, `ko`, `zh`, and a custom string fallback.

Output format labels:

- `text`: Plain Text
- `json_text`: JSON Text
- `json`: Detailed JSON
- `srt`: SRT Subtitles
- `vtt`: WebVTT Subtitles

## 15. Response Normalization

File: `nodes/Speechall/helpers/normalize.ts`

Function:

```ts
export function normalizeSpeechallTranscriptionResponse(input: {
  response: unknown;
  rawText?: string;
  outputFormat: TranscriptOutputFormat;
  model: string;
  language?: string;
  source: 'binary' | 'remote_url';
  sourceUrlSanitized?: string;
  fileUrl?: string;
}): IDataObject;
```

Rules:

- For `text`, `srt`, and `vtt`, return:

```json
{
  "text": "...",
  "outputFormat": "text",
  "model": "...",
  "language": "...",
  "source": "binary"
}
```

- For `json_text`, return API fields plus metadata:

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

- For `json`, preserve all API fields and add metadata without flattening:

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

- Do not discard unknown fields from Speechall. Preserve provider-specific metadata.
- If adding metadata would overwrite API fields, put node metadata under `_speechall`.
- For remote URL inputs, include `sourceUrlSanitized` by default and include full `fileUrl` only when the user enabled `Include Source URL in Output`.

Text response handling:

- For `text/plain`, read response as string.
- For `application/json`, parse as JSON.
- For ambiguous content type, try JSON parse first only when the body starts with `{` or `[`.

## 16. Optional Binary Transcript Output

File: `nodes/Speechall/helpers/binary.ts`

Supported output formats:

| Output Format | Extension | MIME Type |
| --- | --- | --- |
| `text` | `.txt` | `text/plain` |
| `srt` | `.srt` | `application/x-subrip` |
| `vtt` | `.vtt` | `text/vtt` |

Rules:

- Binary output is opt-in, default `false`.
- Do not create binary output for detailed JSON by default.
- Use `this.helpers.prepareBinaryData(buffer, fileName, mimeType)`.
- Preserve existing item binary data and add a new binary property.
- Default binary property: `transcript`.
- Filename pattern: `speechall-transcript.<ext>`.

## 17. Item Execution and Continue On Fail

Each operation should process all input items:

```ts
const items = this.getInputData();
const returnData: INodeExecutionData[] = [];

for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
  try {
    // Execute operation for item
    returnData.push({
      json,
      binary,
      pairedItem: { item: itemIndex },
    });
  } catch (error) {
    if (this.continueOnFail()) {
      returnData.push({
        json: {
          error: getErrorMessage(error),
        },
        pairedItem: { item: itemIndex },
      });
      continue;
    }
    throw error;
  }
}
```

List Models behavior:

- If there are input items, run once per input item only if parameters contain expressions requiring item context.
- Simpler v1 behavior: run once and return one item per model.
- Document this behavior in README.

## 18. Error Handling

File: `nodes/Speechall/transport/errors.ts`

Local validation errors:

- Missing binary property.
- Empty manual model ID.
- Invalid remote URL.
- Invalid replacement rule.
- Temperature outside 0-1.
- Speakers expected outside 1-10.
- Timeout outside 1-900.

API error mapping:

| HTTP Status | Node Message Prefix |
| --- | --- |
| 400 | `Bad Speechall request` |
| 401 | `Invalid or missing Speechall API key` |
| 402 | `Speechall account has no available credit` |
| 404 | `Speechall resource not found` |
| 429 | `Speechall rate limit exceeded` |
| 500 | `Speechall server error` |
| 503 | `Speechall service unavailable` |
| 504 | `Speechall upstream provider timed out` |

Include:

- HTTP status code.
- API `message`.
- API `code`.
- `Retry-After` header for 429.

Do not include:

- Authorization header.
- Full credential object.
- Raw request body for binary uploads.

## 19. CI, Build, and Release

### 19.1 Local Commands

```bash
npm install
npm run generate:openapi-types
npm run lint
npm run test
npm run build
npm run dev
```

### 19.2 CI Workflow

File: `.github/workflows/ci.yml`

Run on pull request and push to `main`:

1. Install Node 22.
2. `npm ci`.
3. `npm run generate:openapi-types`.
4. `git diff --exit-code nodes/Speechall/generated` to catch stale generated types.
5. `npm run lint`.
6. `npm run test`.
7. `npm run build`.
8. Run scaffolded prerelease or cloud-support commands only if they exist in `package.json`.

Use exactly the commands exposed by the scaffolded `@n8n/node-cli`. During Milestone 1, create a fresh scaffold with `npm create @n8n/node@latest`, inspect its scripts and generated workflows, and update this plan if the scaffold's command names differ.

### 19.3 Publish Workflow

Use the `publish.yml` generated by `npm create @n8n/node`.

Requirements:

- Publish from GitHub Actions.
- Use npm provenance.
- Use npm Trusted Publishers if possible; otherwise use granular `NPM_TOKEN`.
- Do not publish from a local machine for verification-targeted releases.
- Ensure `@n8n/node-cli` is at least `0.23.0`.

## 20. Documentation Plan

README sections:

1. What Speechall is.
2. What the n8n node does.
3. Installation.
4. Credentials and API key setup.
5. Operations.
6. Transcribe File example.
7. Transcribe Remote URL example.
8. List Models example.
9. Output formats.
10. Advanced options.
11. Optional binary transcript output.
12. Replacement rules.
13. OpenAI-compatible endpoint note for generic HTTP workflows.
14. Error troubleshooting.
15. Limits and timeout guidance.
16. Example workflows.
17. Support links.
18. License.

Example workflows to include as files:

- `examples/google-drive-audio-to-transcript.json`
- `examples/webhook-audio-upload-to-json-transcript.json`
- `examples/remote-podcast-url-to-srt.json`
- `examples/meeting-recording-to-diarized-transcript.json`

## 21. Implementation Milestones

### Milestone 1: Scaffold and Metadata

Tasks:

- Resolve the PRD scope conflict by updating `idea/prd.md` or recording explicit approval that this implementation plan supersedes the OpenAI-compatible v1 requirement.
- Create repo from `npm create @n8n/node@latest`.
- Inspect the generated `package.json` scripts and publish workflow before adding custom scripts.
- Validate the generated dependency and peer dependency shape against current n8n verification checks.
- Set package name to `n8n-nodes-speechall`.
- Add MIT license.
- Add Speechall icon.
- Configure `package.json` metadata, keywords, `n8n` node paths, and empty runtime dependencies.
- Add CI workflow.
- Add publish workflow with provenance.

Exit criteria:

- `npm install` succeeds.
- `npm run lint` succeeds with placeholder node.
- `npm run build` succeeds.
- Local n8n dev server loads the Speechall node.

### Milestone 2: Credentials and Transport

Tasks:

- Implement `SpeechallApi` credential.
- Add credential test against `/speech-to-text-models`.
- Implement `speechallApiRequest`.
- Implement API error mapping and sanitization.
- Add unit tests for error normalization.

Exit criteria:

- Valid API key passes credential test.
- Invalid API key fails with clear 401 message.
- Transport handles JSON and text responses.

### Milestone 3: Model Discovery

Tasks:

- Implement List Models operation.
- Implement dynamic model dropdown.
- Implement manual model ID fallback.
- Add client-side filters.
- Add tests for model normalization.

Exit criteria:

- Models load dynamically.
- Manual model ID mode is available.
- List Models returns one item per model.

### Milestone 4: Core Transcription

Tasks:

- Implement Transcribe File.
- Implement Transcribe Remote URL.
- Implement shared advanced fields.
- Implement custom vocabulary serialization.
- Implement optional binary transcript output.
- Implement output normalization.

Exit criteria:

- Binary audio transcription works.
- Remote URL transcription works.
- `text`, `json_text`, `json`, `srt`, and `vtt` outputs work.
- Optional binary transcript output works for `text`, `srt`, and `vtt`.

### Milestone 5: Documentation and Verification Readiness

Tasks:

- Complete README.
- Add example workflows.
- Add a short README note explaining that Speechall's OpenAI-compatible endpoint is for generic HTTP/OpenAI-shaped workflows and is intentionally not exposed in the dedicated Speechall node.
- Run lint, tests, build, and any scaffolded verification-oriented checks that exist in `package.json`.
- Test in local n8n with a real Speechall API key.
- Publish prerelease through GitHub Actions.
- Submit to n8n Creator Portal.

Exit criteria:

- npm package is public.
- GitHub repository is public under Speechall.
- Package has no runtime dependencies.
- n8n CLI verification-oriented checks pass.
- Verification submission is ready.

## 22. Test Plan

### 22.1 Unit Tests

Use Vitest for pure functions:

- `normalizeSpeechallTranscriptionResponse`
- `normalizeModel`
- `serializeCustomVocabulary`
- `serializeReplacementRules`
- `validateReplacementRule`
- `getSelectedModel`
- `buildTranscriptBinaryMetadata`

### 22.2 Mocked Operation Tests

Add tests that mock the relevant `IExecuteFunctions` helper methods and assert n8n request/response behavior:

- `Transcribe File` builds `/transcribe` request options with raw binary body, binary MIME type, expected query parameters, and repeated `custom_vocabulary` values.
- `Transcribe File` fails locally when a selected model's known `max_file_size_bytes` is exceeded.
- `Transcribe Remote URL` builds `/transcribe-remote` JSON body with `file_url`, advanced options, `ruleset_id`, and inline `replacement_ruleset`.
- Remote URL normalization omits full `fileUrl` by default, includes `sourceUrlSanitized`, and includes full `fileUrl` only when opted in.
- Regex group replacement rows serialize into the OpenAPI object shape and reject duplicate or invalid group numbers.
- Text-like responses are parsed and normalized correctly when content type is `text/plain`.
- JSON responses are preserved without destructive flattening.
- Optional binary transcript output adds a new binary property without dropping existing input binary data.
- `continueOnFail` returns an item-level error and preserves `pairedItem`.
- API errors preserve status, Speechall `message`, Speechall `code`, and `Retry-After` without leaking credentials.
- Credential test error mapping distinguishes invalid credentials (`401`) from account readiness or billing problems (`402`).
- Dynamic model loading uses `loadOptions.getSpeechToTextModels` and returns `INodePropertyOptions[]`.

### 22.3 Manual Local n8n Tests

Run with `npm run dev` and test:

- Credential creation.
- Credential test success.
- Credential test failure.
- List Models.
- Transcribe File with MP3/WAV binary data.
- Transcribe Remote URL with a public audio file.
- `Continue On Fail`.
- Optional binary output.
- Dynamic model dropdown failure fallback through manual mode.

### 22.4 Live API Tests

Do not put live Speechall API tests in CI unless Speechall provides dedicated test credentials.

Recommended manual/live test matrix:

| Operation | Format | Options |
| --- | --- | --- |
| Transcribe File | `text` | default |
| Transcribe File | `json` | word timestamps if provider returns them |
| Transcribe File | `srt` | binary transcript output |
| Transcribe Remote URL | `vtt` | public URL |
| Transcribe Remote URL | `json` | diarization, speakers expected |
| Transcribe Remote URL | `text` | inline replacement rules |

## 23. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| n8n rejects runtime dependencies | Cloud verification blocked | Keep `dependencies` empty |
| SDK drift from OpenAPI | Incorrect request shape | Generate local types from OpenAPI and review SDK README examples |
| Long synchronous transcriptions timeout | Failed workflows | Expose timeout setting and document n8n execution timeout limits |
| Large binary files exceed model limits | Failed uploads after wasted time | Preflight against `max_file_size_bytes` when model metadata and binary size are known |
| API returns text with unexpected content type | Bad output parsing | Parse based on requested output format first, content type second |
| Model field names differ (`id`, `model`, `identifier`) | Dynamic dropdown broken | Treat `id` as canonical and normalize fallback fields defensively |
| Provider-specific option unsupported | User confusion | Keep options visible, rely on API errors, and document support varies by model |
| Large binary files pressure n8n memory | Workflow instability | Recommend Remote URL operation for large hosted files |

## 24. PRD Open Questions Resolved

1. Text/SRT/VTT binary output should be opt-in, not default.
2. Do not dynamically hide unsupported advanced options in v1; keep the UX stable and surface API errors clearly.
3. Do basic client-side validation only; rely on Speechall for model/provider capability validation.
4. Use raw binary `/transcribe` for Transcribe File by default.
5. Default transcription timeout should be 300 seconds, configurable up to 900 seconds.
6. Store example workflows as JSON files in `/examples` and also link them from README.
7. Send only static client metadata headers, such as `X-Speechall-Client: n8n-nodes-speechall`.
8. Remove OpenAI-compatible transcription from v1 because it is primarily useful when there is no dedicated Speechall integration.

## 25. Definition of Done

The implementation is done when:

- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.
- n8n CLI verification-oriented checks pass.
- Local n8n loads the node.
- Speechall credentials can be created and tested.
- All three v1 operations work against the live Speechall API.
- Dynamic model selection works.
- Manual model ID fallback works.
- Binary file transcription works.
- Remote URL transcription works.
- All required output formats are supported.
- Optional binary transcript output works.
- README and example workflows are complete.
- npm publish runs from GitHub Actions with provenance.
- The package has no runtime dependencies.
- The package is ready for n8n Creator Portal verification submission.
