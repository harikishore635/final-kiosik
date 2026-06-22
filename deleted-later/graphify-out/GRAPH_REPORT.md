# Graph Report - src/ai  (2026-05-27)

## Corpus Check
- Corpus is ~12,303 words - fits in a single context window. You may not need a graph.

## Summary
- 147 nodes · 204 edges · 17 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Session and Context Memory|Session and Context Memory]]
- [[_COMMUNITY_Multilingual Processor|Multilingual Processor]]
- [[_COMMUNITY_NVIDIA AI API|NVIDIA AI API]]
- [[_COMMUNITY_Prompt Building|Prompt Building]]
- [[_COMMUNITY_AI Engine Core|AI Engine Core]]
- [[_COMMUNITY_Speech Synthesis TTS|Speech Synthesis TTS]]
- [[_COMMUNITY_Speech Recognition STT|Speech Recognition STT]]
- [[_COMMUNITY_Accessibility Actions|Accessibility Actions]]
- [[_COMMUNITY_Audio Manager|Audio Manager]]
- [[_COMMUNITY_Transcript Manager|Transcript Manager]]
- [[_COMMUNITY_Wake Word Detection|Wake Word Detection]]
- [[_COMMUNITY_Form Actions|Form Actions]]
- [[_COMMUNITY_Kiosk Actions|Kiosk Actions]]
- [[_COMMUNITY_UI Actions|UI Actions]]
- [[_COMMUNITY_Intent Router|Intent Router]]
- [[_COMMUNITY_Navigation Actions|Navigation Actions]]
- [[_COMMUNITY_System Prompt|System Prompt]]

## God Nodes (most connected - your core abstractions)
1. `processConversationTurn()` - 12 edges
2. `saveToStorage()` - 10 edges
3. `callNvidiaAI()` - 9 edges
4. `speakViaSarvam()` - 6 edges
5. `extractAndStoreEntities()` - 5 edges
6. `detectLanguage()` - 5 edges
7. `buildMessages()` - 5 edges
8. `runSarvamChunk()` - 5 edges
9. `speakInternal()` - 5 edges
10. `notify()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `speakViaSarvam()` --calls--> `sarvamTTS()`  [INFERRED]
  src\ai\voice\speechSynthesis.js → src\ai\api\sarvamApi.js
- `processConversationTurn()` --calls--> `setLanguagePreference()`  [INFERRED]
  src\ai\brain\conversationManager.js → src\ai\brain\multilingualProcessor.js
- `processConversationTurn()` --calls--> `callNvidiaAI()`  [INFERRED]
  src\ai\brain\conversationManager.js → src\ai\api\nvidiaApi.js
- `speakViaSarvam()` --calls--> `getSarvamCode()`  [INFERRED]
  src\ai\voice\speechSynthesis.js → src\ai\api\sarvamApi.js
- `detectLanguage()` --calls--> `detectLanguageFromText()`  [INFERRED]
  src\ai\brain\multilingualProcessor.js → src\ai\api\sarvamApi.js

## Communities

### Community 0 - "Session and Context Memory"
Cohesion: 0.21
Nodes (14): resetSession(), addMessage(), createFreshContext(), endFormFilling(), extractAndStoreEntities(), loadFromStorage(), resetContext(), saveToStorage() (+6 more)

### Community 1 - "Multilingual Processor"
Cohesion: 0.15
Nodes (10): detectLanguage(), getCurrentLanguage(), isMixedLanguage(), isWakeWord(), normaliseTranscript(), setLanguagePreference(), detectLanguageFromText(), getSarvamCode() (+2 more)

### Community 2 - "NVIDIA AI API"
Cohesion: 0.35
Nodes (11): buildErrorResponse(), buildOfflineFallback(), callNvidiaAI(), callVisionModel(), consumeStream(), getApiKey(), isUnhealthy(), markUnhealthy() (+3 more)

### Community 3 - "Prompt Building"
Cohesion: 0.22
Nodes (5): getContextSummary(), getMessagesForAPI(), buildMessages(), getRelevantKnowledge(), buildKnowledgeSummary()

### Community 4 - "AI Engine Core"
Cohesion: 0.31
Nodes (7): getGreeting(), processUtterance(), buildErrorResponse(), buildOfflineResponse(), generateGreeting(), normaliseAIResponse(), processConversationTurn()

### Community 5 - "Speech Synthesis TTS"
Cohesion: 0.38
Nodes (7): preprocessForTTS(), processQueue(), speak(), speakInternal(), speakViaBrowser(), speakViaSarvam(), stopSpeaking()

### Community 6 - "Speech Recognition STT"
Cohesion: 0.38
Nodes (8): cleanupStream(), ensureStream(), isWebSpeechSupported(), runSarvamChunk(), startBrowserSTT(), startMediaRecorderSTT(), startSTT(), stopSTT()

### Community 7 - "Accessibility Actions"
Cohesion: 0.22
Nodes (0): 

### Community 8 - "Audio Manager"
Cohesion: 0.28
Nodes (3): getAudioContext(), startVisualiser(), unlockAudio()

### Community 9 - "Transcript Manager"
Cohesion: 0.39
Nodes (5): addAITranscript(), clearTranscript(), notify(), setFinalTranscript(), setInterimTranscript()

### Community 10 - "Wake Word Detection"
Cohesion: 0.25
Nodes (2): getSTTLangCode(), startWakeWordDetection()

### Community 11 - "Form Actions"
Cohesion: 0.38
Nodes (3): fillField(), fillMultipleFields(), findField()

### Community 12 - "Kiosk Actions"
Cohesion: 0.33
Nodes (0): 

### Community 13 - "UI Actions"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Intent Router"
Cohesion: 0.5
Nodes (2): handleScrollPage(), routeAction()

### Community 15 - "Navigation Actions"
Cohesion: 0.5
Nodes (0): 

### Community 16 - "System Prompt"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `System Prompt`** (1 nodes): `systemPrompt.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `processConversationTurn()` connect `AI Engine Core` to `Session and Context Memory`, `Multilingual Processor`, `NVIDIA AI API`, `Prompt Building`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `detectLanguage()` connect `Multilingual Processor` to `AI Engine Core`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Why does `getSTTLangCode()` connect `Wake Word Detection` to `Multilingual Processor`, `Speech Recognition STT`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `processConversationTurn()` (e.g. with `processUtterance()` and `detectLanguage()`) actually correct?**
  _`processConversationTurn()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `speakViaSarvam()` (e.g. with `getSarvamCode()` and `sarvamTTS()`) actually correct?**
  _`speakViaSarvam()` has 2 INFERRED edges - model-reasoned connections that need verification._