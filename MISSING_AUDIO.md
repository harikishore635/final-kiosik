# Missing Audio — Generation Guide

10 files missing (5 keys × 2 languages). English via **ElevenLabs**, Assamese via **Sarvam Bulbul**.

| Key | English file | Assamese file |
|---|---|---|
| `login_page_intro` | `public/audio/en/login/login_page_intro.mp3` | `public/audio/as/login/login_page_intro.mp3` |
| `elec_menu_intro` | `public/audio/en/page/elec_menu_intro.mp3` | `public/audio/as/page/elec_menu_intro.mp3` |
| `gas_menu_intro` | `public/audio/en/page/gas_menu_intro.mp3` | `public/audio/as/page/gas_menu_intro.mp3` |
| `muni_menu_intro` | `public/audio/en/page/muni_menu_intro.mp3` | `public/audio/as/page/muni_menu_intro.mp3` |
| `aadhaar_form_filled` | `public/audio/en/aadhar/aadhaar_form_filled.mp3` | `public/audio/as/aadhar/aadhaar_form_filled.mp3` |

> File names must match exactly (see `src/utils/staticAudioMap.js`). Export **MP3**, drop into the listed path.

---

## ENGLISH — ElevenLabs

### Voice Design prompt
Paste into ElevenLabs → *Voice Design → "Describe a voice"*:

```
A calm, warm, clear adult Indian-English voice for a government service
kiosk. Neutral Indian accent, friendly and reassuring, unhurried pace,
slightly formal, articulate. Suitable for elderly and visually-impaired
users. Gender-neutral to soft-female tone. No emotion swings, steady and
trustworthy.
```

### Render settings (every clip)
| Setting | Value |
|---|---|
| Model | `eleven_multilingual_v2` (clarity) or `eleven_turbo_v2_5` (cheaper) |
| Stability | 0.55 |
| Similarity | 0.75 |
| Style | 0 |
| Speaker boost | On |
| Speed | 0.9 (slightly slow — kiosk clarity) |
| Export | MP3 44.1 kHz |

### Scripts (EN)

**login_page_intro**
```
Welcome to SUVIDHA. Please enter your 12-digit Aadhaar number to continue. Tap the number pad below to enter each digit.
```

**elec_menu_intro**
```
Electricity services. You can apply for new connection, report meter issues, pay bills, register complaints, or track your request. Tap any option to continue.
```

**gas_menu_intro**
```
Assam Gas services. You can apply for new connection, report meter issues, view bills, reconnect, or register a complaint. Tap any option to continue.
```

**muni_menu_intro**
```
Municipal services. You can apply for water connection, pay property tax, report road or garbage issues, or track your complaint.
```

**aadhaar_form_filled**
```
Aadhaar details filled. Please verify and continue.
```

---

## ASSAMESE — Sarvam Bulbul

> ⚠️ Do NOT use ElevenLabs for Assamese — no real Assamese support, it mangles the script.
> Use Sarvam Bulbul to match the existing 80 Assamese clips.

### API settings
| Field | Value |
|---|---|
| Endpoint | `https://api.sarvam.ai/text-to-speech` |
| Header | `api-subscription-key: <SARVAM_API_KEY>` |
| `model` | `bulbul:v2` |
| `speaker` | `anushka` |
| `target_language_code` | `as-IN` |
| `pace` | 0.9 |
| Output | base64 WAV → convert to MP3 |

### Scripts (AS)

**login_page_intro**
```
SUVIDHA-লৈ স্বাগতম। আগবাঢ়িবলৈ আপোনাৰ ১২ সংখ্যাৰ আধাৰ নম্বৰ দিয়ক।
```

**elec_menu_intro**
```
বিদ্যুৎ সেৱা। নতুন সংযোগ, মিটাৰ সমস্যা, বিল পৰিশোধ, অভিযোগ বা অনুসৰণ কৰিব পাৰে।
```

**gas_menu_intro**
```
অসম গেছ সেৱা। নতুন সংযোগ, মিটাৰ সমস্যা, বিল, পুনঃসংযোগ বা অভিযোগ কৰিব পাৰে।
```

**muni_menu_intro**
```
পৌৰ সেৱা। পানী সংযোগ, সম্পত্তি কৰ, ৰাস্তা বা আৱৰ্জনাৰ অভিযোগ কৰিব পাৰে।
```

**aadhaar_form_filled**
```
আধাৰৰ তথ্য পূৰণ হ'ল। অনুগ্ৰহ কৰি পৰীক্ষা কৰি আগবাঢ়ক।
```

---

### Sarvam Bulbul — ready-to-run script (all 5 AS files at once)

```bash
#!/usr/bin/env bash
# Requires: SARVAM_API_KEY env var, jq, ffmpeg
set -e
KEY="$SARVAM_API_KEY"
OUT="public/audio/as"

gen () {  # gen <text> <relative-out-path>
  curl -s https://api.sarvam.ai/text-to-speech \
    -H "api-subscription-key: $KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg t "$1" '{inputs:[$t],target_language_code:"as-IN",speaker:"anushka",model:"bulbul:v2",pace:0.9}')" \
  | jq -r '.audios[0]' | base64 -d > /tmp/s.wav
  ffmpeg -y -i /tmp/s.wav "$OUT/$2"
}

gen "SUVIDHA-লৈ স্বাগতম। আগবাঢ়িবলৈ আপোনাৰ ১২ সংখ্যাৰ আধাৰ নম্বৰ দিয়ক।" "login/login_page_intro.mp3"
gen "বিদ্যুৎ সেৱা। নতুন সংযোগ, মিটাৰ সমস্যা, বিল পৰিশোধ, অভিযোগ বা অনুসৰণ কৰিব পাৰে।" "page/elec_menu_intro.mp3"
gen "অসম গেছ সেৱা। নতুন সংযোগ, মিটাৰ সমস্যা, বিল, পুনঃসংযোগ বা অভিযোগ কৰিব পাৰে।" "page/gas_menu_intro.mp3"
gen "পৌৰ সেৱা। পানী সংযোগ, সম্পত্তি কৰ, ৰাস্তা বা আৱৰ্জনাৰ অভিযোগ কৰিব পাৰে।" "page/muni_menu_intro.mp3"
gen "আধাৰৰ তথ্য পূৰণ হ'ল। অনুগ্ৰহ কৰি পৰীক্ষা কৰি আগবাঢ়ক।" "aadhar/aadhaar_form_filled.mp3"
```

> Sarvam returns WAV (base64). `ffmpeg` converts to MP3 at the right path. Run from repo root.
> If `audios` key differs in your Sarvam response, adjust the `jq -r '.audios[0]'` selector.
