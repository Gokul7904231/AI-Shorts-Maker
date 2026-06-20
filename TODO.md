# TODO

- [x] Add structured parse metrics to scene-agent JSON parsing retries:
  - [x] Track `directParseSuccess`, `regexFallbackUsed`, `retryCount` in structured output.
  - [ ] Ensure metrics persist/propagate from scene-agent caller(s).
- [ ] Update job completion/manifest to include parse metrics for observability.
- [ ] Add provider name into metrics (for later reliability measurement).
- [ ] (Future) Implement automatic repair pass: "repair this JSON only" using a tiny model.
- [ ] (Future) Move toward provider-native structured outputs (JSON mode/function calling/constrained decoding/schema-guided generation).


