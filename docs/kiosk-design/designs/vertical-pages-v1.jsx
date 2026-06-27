// ────────────────────────────────────────────────────────────────────
// SUVIDHA — 55″ Vertical Kiosk (1080 × 1920)
// All pages reformatted for portrait reach zone:
//   • Top 0–600px:    branding + status (peripheral)
//   • 600–1500px:     primary content (eye-line)
//   • 1500–1920px:    bottom action bar (reachable while standing)
// ────────────────────────────────────────────────────────────────────

// ───── Logo + Icons (shared) ─────
function Logo({ size = 44, primary = 'var(--cream)', accent = 'var(--saffron-500)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <path d="M30 78 A30 30 0 0 1 90 78" stroke={primary} strokeWidth="6" strokeLinecap="round" fill="none"/>
      <path d="M40 78 A20 20 0 0 1 80 78" stroke={primary} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85"/>
      <path d="M48 78 A12 12 0 0 1 72 78" stroke={primary} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6"/>
      <rect x="28" y="80" width="64" height="4" rx="2" fill={primary} opacity="0.9"/>
      <circle cx="60" cy="40" r="4" fill={accent}/>
    </svg>
  );
}
function I({ d, size = 28, sw = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
}
const ic = {
  bolt: <path d="M13 3 L5 13 H11 L10 21 L18 11 H12 Z"/>,
  flame: <path d="M12 3 C 14 7 18 9 18 14 A6 6 0 1 1 6 14 C 6 11 8 9 9 7 C 10 9 11 11 12 12 C 12 9 12 6 12 3 Z"/>,
  drop: <path d="M12 3 C 8 9 5 13 5 16 A7 7 0 0 0 19 16 C 19 13 16 9 12 3 Z"/>,
  trash: <g><path d="M5 7 H19"/><path d="M9 7 V5 H15 V7"/><path d="M7 7 L8 21 H16 L17 7"/></g>,
  globe: <g><circle cx="12" cy="12" r="9"/><path d="M3 12 H21"/><path d="M12 3 C 9 7 9 17 12 21"/><path d="M12 3 C 15 7 15 17 12 21"/></g>,
  help: <g><circle cx="12" cy="12" r="9"/><path d="M9.5 9 A2.5 2.5 0 1 1 12 13 V14"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/></g>,
  user: <g><circle cx="12" cy="8" r="4"/><path d="M4 20 C 4 16 8 14 12 14 C 16 14 20 16 20 20"/></g>,
  shield: <g><path d="M12 3 L20 6 V12 C20 16 16 19 12 21 C8 19 4 16 4 12 V6 Z"/><path d="M9 12 L11 14 L15 10"/></g>,
  arrow: <g><path d="M5 12 H19"/><path d="M14 7 L19 12 L14 17"/></g>,
  back: <g><path d="M19 12 H5"/><path d="M10 7 L5 12 L10 17"/></g>,
  check: <path d="M5 12 L10 17 L19 7"/>,
  sos: <g><circle cx="12" cy="12" r="9"/><path d="M12 7 V13"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/></g>,
  bell: <g><path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18 H4 Z"/><path d="M10 21 A2 2 0 0 0 14 21"/></g>,
  receipt: <g><path d="M6 3 H18 V21 L15 19 L12 21 L9 19 L6 21 Z"/><path d="M9 8 H15"/><path d="M9 12 H15"/><path d="M9 16 H13"/></g>,
  track: <g><circle cx="12" cy="12" r="9"/><path d="M12 7 V12 L15 14"/></g>,
  pin: <g><path d="M12 2 C 8 2 5 5 5 9 C 5 14 12 22 12 22 C 12 22 19 14 19 9 C 19 5 16 2 12 2 Z"/><circle cx="12" cy="9" r="2.5"/></g>,
  qr: <g><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14 H17 M20 14 V17 M14 17 H17 V20 H14 Z M20 20 H21"/></g>,
  finger: <g><path d="M8 21 C 6 18 6 14 6 11 A6 6 0 0 1 18 11 C 18 13 17 15 16 17"/><path d="M9 21 C 9 18 9 14 12 14 C 14 14 14 17 14 19"/></g>,
  voice: <g><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11 A7 7 0 0 0 19 11"/><path d="M12 18 V21"/></g>,
  plus: <g><path d="M12 5 V19"/><path d="M5 12 H19"/></g>,
  print: <g><path d="M7 9 V4 H17 V9"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14 H17 V21 H7 Z"/></g>,
  phone: <path d="M5 4 H9 L11 9 L8.5 11 C 10 14 11 15 13 16.5 L15 14 L20 16 V20 C 12 20 4 12 4 5 Z"/>,
  type: <g><path d="M5 7 V5 H19 V7"/><path d="M12 5 V20"/><path d="M9 20 H15"/></g>,
  family: <g><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20 C 3 16 6 14 9 14 C 12 14 15 16 15 20"/><path d="M14 20 C 14 17 16 16 17 16 C 18 16 21 17 21 20"/></g>,
  heart: <path d="M12 21 C 4 14 4 7 8 6 C 10 5 12 7 12 9 C 12 7 14 5 16 6 C 20 7 20 14 12 21 Z"/>,
  bus: <g><rect x="4" y="6" width="16" height="11" rx="2"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/><path d="M4 12 H20"/></g>,
  building: <g><rect x="4" y="6" width="16" height="15"/><path d="M8 11 H10 M14 11 H16 M8 15 H10 M14 15 H16"/><path d="M8 6 V3 H16 V6"/></g>,
  search: <g><circle cx="11" cy="11" r="6"/><path d="M16 16 L20 20"/></g>,
  cog: <g><circle cx="12" cy="12" r="3"/><path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M5.6 18.4 L7.7 16.3 M16.3 7.7 L18.4 5.6"/></g>,
};

// ───── Vertical Kiosk Shell ─────
// Common chrome: tricolor strip + brand bar + body + bottom action bar
function VK({ children, lang = 'English', name = null, showBottom = true, bg = 'white' }) {
  return (
    <div className="vk" style={{ background: bg }}>
      <div className="vk-strip"/>
      <div className="vk-top">
        <div className="vk-brand">
          <div className="mk"><Logo size={36}/></div>
          <div>
            <div className="nm">SUVIDHA</div>
            <div className="sub">Smart Urban Helpdesk</div>
          </div>
        </div>
        <div style={{ display:'flex', gap: 12 }}>
          <span className="chip"><I d={ic.globe} size={22}/> {lang}</span>
          <span className="chip"><I d={ic.help} size={22}/> Help</span>
          {name && <span className="chip"><I d={ic.user} size={22}/> {name}</span>}
        </div>
      </div>
      <div className="vk-body">{children}</div>
      {showBottom && (
        <div className="vk-bottom">
          <button className="btn btn-quiet"><I d={ic.type} size={22}/> A+ Larger text</button>
          <button className="btn btn-quiet"><I d={ic.voice} size={22}/> Voice mode</button>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-err"><I d={ic.sos} size={24}/> EMERGENCY</button>
        </div>
      )}
    </div>
  );
}

// Department dot
function DD({ color, glyph, size = 96, isz = 48 }) {
  return (
    <div style={{ width:size, height:size, borderRadius: 26, background:`color-mix(in oklab, ${color} 22%, white)`, color, display:'grid', placeItems:'center', flexShrink:0 }}>
      <I d={glyph} size={isz}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 01. LANDING
// ═══════════════════════════════════════════════════════════════════
function VLanding() {
  const langs = ['English','हिन्दी','অসমীয়া','বাংলা','தமிழ்','తెలుగు','ગુજરાતી','ਪੰਜਾਬੀ','ಕನ್ನಡ','മലയാളം','ଓଡ଼ିଆ','ꯃꯩꯇꯩ'];
  return (
    <div className="vk kiosk-bg">
      <div className="vk-strip"/>
      <div className="vk-top">
        <div className="vk-brand">
          <div className="mk"><Logo size={36}/></div>
          <div>
            <div className="nm">SUVIDHA</div>
            <div className="sub">Smart Urban Helpdesk</div>
          </div>
        </div>
        <span className="chip" style={{ fontFamily:'var(--font-mono)' }}>29 Apr · 14:32</span>
      </div>

      <div className="vk-body" style={{ paddingTop: 60, gap: 0 }}>
        {/* Hero — eye line */}
        <div style={{ marginTop: 100 }}>
          <div className="label-tag" style={{ color:'var(--saffron-700)' }}>WELCOME · স্বাগতম · स्वागत है</div>
          <div className="h1" style={{ marginTop: 22, fontSize: 96 }}>How may we<br/>help you<br/>today?</div>
          <div style={{ fontFamily:'Noto Sans Devanagari', fontWeight:600, fontSize: 36, color:'var(--ink-700)', marginTop: 28 }}>
            आज हम आपकी क्या<br/>सहायता कर सकते हैं?
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 60 }}/>

        {/* Two action cards — reach zone */}
        <div style={{ display:'flex', flexDirection:'column', gap: 24, marginBottom: 32 }}>
          <button className="card" style={{ display:'flex', alignItems:'center', gap: 28, padding: 36, cursor:'pointer', borderColor: 'var(--saffron-500)', borderWidth: 2, background: `color-mix(in oklab, var(--saffron-500) 7%, white)`, boxShadow: 'var(--shadow-2)' }}>
            <div style={{ width: 96, height: 96, borderRadius: 26, background:'var(--saffron-500)', color: 'var(--indigo-900)', display:'grid', placeItems:'center', flexShrink:0 }}><I d={ic.shield} size={48}/></div>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ fontWeight: 800, fontSize: 36, color:'var(--indigo-900)', display:'flex', alignItems:'center', gap: 14 }}>
                Citizen Login <span className="badge b-ok" style={{ fontSize: 11 }}>AADHAAR</span>
              </div>
              <div className="body" style={{ marginTop: 8 }}>Full access · Personal dashboard · Schemes</div>
            </div>
            <I d={ic.arrow} size={44}/>
          </button>
          <button className="card" style={{ display:'flex', alignItems:'center', gap: 28, padding: 36, cursor:'pointer' }}>
            <div style={{ width: 96, height: 96, borderRadius: 26, background:'var(--surface-2)', color:'var(--ink-700)', display:'grid', placeItems:'center', flexShrink:0 }}><I d={ic.user} size={48}/></div>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ fontWeight: 700, fontSize: 36, color:'var(--indigo-900)' }}>Continue as Guest</div>
              <div className="body" style={{ marginTop: 8 }}>Browse services · Track by reference number</div>
            </div>
            <I d={ic.arrow} size={44}/>
          </button>
        </div>

        {/* Language strip */}
        <div>
          <div className="label-tag" style={{ marginBottom: 14 }}>AVAILABLE IN 24 LANGUAGES · TAP TO CHANGE</div>
          <div style={{ display:'flex', gap: 10, flexWrap: 'wrap' }}>
            {langs.map((l, i) => (
              <span key={l} className={`chip ${i === 0 ? 'act' : ''}`} style={{ fontFamily: l === 'English' ? 'var(--font-ui)' : 'var(--font-multi)' }}>{l}</span>
            ))}
            <span className="chip" style={{ background:'var(--surface-2)', borderColor:'transparent' }}>+12 more</span>
          </div>
        </div>
      </div>

      <div className="vk-bottom">
        <button className="btn btn-quiet"><I d={ic.type} size={22}/> A+ Larger</button>
        <button className="btn btn-quiet"><I d={ic.voice} size={22}/> Voice mode</button>
        <div style={{ flex:1 }}/>
        <button className="btn btn-err"><I d={ic.sos} size={24}/> EMERGENCY</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 02. AADHAAR ENTRY (numeric keypad)
// ═══════════════════════════════════════════════════════════════════
function VAadhaar() {
  const digits = '999988887777';
  return (
    <VK>
      <div style={{ textAlign:'center', marginBottom: 32 }}>
        <div style={{ width: 120, height: 120, borderRadius:'50%', background:'var(--indigo-700)', color:'white', display:'inline-grid', placeItems:'center', marginBottom: 24 }}><I d={ic.shield} size={64}/></div>
        <h1 className="h2">Aadhaar Verification</h1>
        <p className="body-l" style={{ marginTop: 12 }}>Enter your 12-digit Aadhaar number</p>
      </div>

      {/* Display */}
      <div style={{ display:'flex', justifyContent:'center', gap: 10, marginBottom: 32, flexWrap:'wrap' }}>
        {Array.from({length: 12}).map((_, i) => (
          <div key={i} className="otp-cell" style={{ width: 64, height: 88, fontSize: 36 }}>{digits[i] || ''}</div>
        ))}
      </div>

      {/* Keypad — reach zone */}
      <div className="keypad" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
        {[1,2,3,4,5,6,7,8,9,'⌫',0,''].map((k,i)=>(
          <button key={i} style={{
            background: k === '' ? 'var(--ok)' : (k === '⌫' ? 'var(--surface-2)' : 'white'),
            color: k === '' ? 'white' : 'var(--indigo-900)',
            border: k === '' ? 'none' : '2px solid var(--line)',
          }}>{k}</button>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: 22, background:'var(--saffron-100)', borderRadius: 18, border:'1.5px solid var(--saffron-300)', maxWidth: 720, margin: '32px auto 0' }}>
        <div style={{ fontSize: 18, color:'var(--saffron-700)', fontWeight: 600 }}> Encrypted UIDAI lookup</div>
        <div className="meta" style={{ marginTop: 4 }}>Your data is used only for verification · DPDP Act 2023 compliant</div>
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 03. AUTH (OTP / QR / Biometric)
// ═══════════════════════════════════════════════════════════════════
function VAuth() {
  return (
    <VK>
      {/* User confirmed */}
      <div className="card" style={{ background:'color-mix(in oklab, var(--ok) 8%, white)', borderColor:'var(--ok)', display:'flex', alignItems:'center', gap: 24, marginBottom: 28, padding: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius:'50%', background:'var(--ok)', color:'white', display:'grid', placeItems:'center', flexShrink:0 }}><I d={ic.check} size={36}/></div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color:'var(--ok)' }}>Aruna Devi</div>
          <div className="body" style={{ marginTop: 4 }}>XXXX-XXXX-7777 · Age 34 · Guwahati, Assam</div>
        </div>
      </div>

      <div style={{ textAlign:'center', marginBottom: 28 }}>
        <h2 className="h3">Choose verification method</h2>
      </div>

      {/* Tab segmented control */}
      <div style={{ display:'flex', gap: 12, padding: 8, background:'var(--surface-2)', borderRadius: 24, marginBottom: 28 }}>
        <button className="btn btn-pri" style={{ flex: 1, minHeight: 76, fontSize: 22 }}><I d={ic.phone} size={26}/> OTP</button>
        <button className="btn btn-quiet" style={{ flex: 1, minHeight: 76, fontSize: 22 }}><I d={ic.qr} size={26}/> QR</button>
        <button className="btn btn-quiet" style={{ flex: 1, minHeight: 76, fontSize: 22 }}><I d={ic.finger} size={26}/> Biometric</button>
      </div>

      <div className="card" style={{ padding: 36 }}>
        <div style={{ textAlign:'center', marginBottom: 24 }}>
          <div className="body">OTP sent to</div>
          <div style={{ fontSize: 38, fontWeight: 700, color:'var(--indigo-900)', fontFamily:'var(--font-mono)', marginTop: 4 }}>+91 98****1234</div>
        </div>
        {/* OTP cells */}
        <div style={{ display:'flex', justifyContent:'center', gap: 14, marginBottom: 28 }}>
          {['4','8','2','9','·','·'].map((d, i) => (
            <div key={i} className={`otp-cell ${i < 4 ? 'act' : ''}`}>{d}</div>
          ))}
        </div>
        {/* Keypad */}
        <div className="keypad" style={{ maxWidth: 480, margin: '0 auto' }}>
          {[1,2,3,4,5,6,7,8,9,'⌫',0,''].map((k,i)=>(
            <button key={i} style={{
              background: k === '' ? 'var(--ok)' : (k === '⌫' ? 'var(--surface-2)' : 'white'),
              color: k === '' ? 'white' : 'var(--indigo-900)',
              border: k === '' ? 'none' : '2px solid var(--line)',
            }}>{k}</button>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop: 22, color:'var(--ink-500)', fontSize: 18 }}>Resend in 24s</div>
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 04. MODE SELECTION
// ═══════════════════════════════════════════════════════════════════
function VMode() {
  const modes = [
    { id:'blind', name:'Blind / Visually Impaired', desc:'Voice-first navigation · Screen reader · Wake word', color:'var(--indigo-700)', glyph: ic.voice },
    { id:'normal', name:'Normal', desc:'Standard interface with all features and touch navigation', color:'var(--saffron-700)', glyph: ic.user, selected: true },
    { id:'elderly', name:'Elderly / Senior', desc:'Extra-large text · High contrast · Simpler layout', color:'var(--dept-gas)', glyph: ic.heart },
  ];
  return (
    <VK name="Aruna">
      <div style={{ textAlign:'center', marginBottom: 32 }}>
        <h1 className="h2">Choose Your Experience</h1>
        <p className="body-l" style={{ marginTop: 12 }}>Select a mode that works best for you</p>
        <span className="badge b-info" style={{ marginTop: 16, fontSize: 14, padding: '10px 18px' }}> AUTO-DETECTED FROM AADHAAR: NORMAL</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 24, marginBottom: 32 }}>
        {modes.map(m => (
          <button key={m.id} className="card" style={{
            display:'flex', alignItems:'center', gap: 28, padding: 32, cursor:'pointer',
            border: m.selected ? `3px solid ${m.color}` : '1.5px solid var(--line)',
            background: m.selected ? `color-mix(in oklab, ${m.color} 8%, white)` : 'white',
            boxShadow: m.selected ? 'var(--shadow-2)' : 'var(--shadow-1)',
            position:'relative',
          }}>
            <div style={{ width: 104, height: 104, borderRadius: 28, background: `color-mix(in oklab, ${m.color} 22%, white)`, color: m.color, display:'grid', placeItems:'center', flexShrink:0 }}>
              <I d={m.glyph} size={56}/>
            </div>
            <div style={{ flex: 1, textAlign:'left' }}>
              <div style={{ fontSize: 32, fontWeight:700, color:'var(--indigo-900)' }}>{m.name}</div>
              <div className="body" style={{ marginTop: 6 }}>{m.desc}</div>
            </div>
            {m.selected && (
              <div style={{ width: 56, height: 56, borderRadius:'50%', background:'var(--ok)', color:'white', display:'grid', placeItems:'center', flexShrink:0 }}><I d={ic.check} size={32}/></div>
            )}
          </button>
        ))}
      </div>

      <button className="btn btn-pri btn-xl" style={{ width:'100%' }}>Continue with Normal <I d={ic.arrow} size={28}/></button>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 05. HOME — service hub
// ═══════════════════════════════════════════════════════════════════
function VHome() {
  const orgs = [
    { id:'elec', name:'Electricity', sub:'Connection · Bills · Complaints', color:'var(--dept-elec)', glyph: ic.bolt },
    { id:'gas',  name:'Assam Gas',   sub:'Cylinder · Bills · Safety',       color:'var(--dept-gas)',  glyph: ic.flame },
    { id:'mun',  name:'Municipal',   sub:'Water · Tax · Grievances',         color:'var(--dept-water)',glyph: ic.drop },
  ];
  const extras = [
    { name:'Health',    color:'var(--dept-health)', glyph: ic.heart },
    { name:'Transport', color:'var(--dept-trans)',  glyph: ic.bus },
    { name:'Sanitation',color:'var(--dept-waste)',  glyph: ic.trash },
    { name:'Schemes',   color:'var(--indigo-500)',  glyph: ic.shield },
    { name:'Family',    color:'var(--saffron-700)', glyph: ic.family },
    { name:'Track',     color:'var(--ink-700)',     glyph: ic.track },
  ];
  return (
    <VK name="Aruna" bg="var(--cream)">
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <div className="label-tag" style={{ color: 'var(--saffron-700)' }}>স্বাগতম · WELCOME BACK</div>
        <h1 className="h2" style={{ marginTop: 8 }}>Hello, Aruna </h1>
        <p className="body-l" style={{ marginTop: 6 }}>How may we help you today?</p>
      </div>

      {/* Org tiles — primary */}
      <div className="label-tag" style={{ marginBottom: 14 }}>SELECT AN ORGANIZATION</div>
      <div style={{ display:'flex', flexDirection:'column', gap: 20, marginBottom: 36 }}>
        {orgs.map(o => (
          <button key={o.id} className="tile" style={{ borderLeft: `8px solid ${o.color}`, display:'flex', flexDirection:'row', alignItems:'center', gap: 28, minHeight: 180, padding: 32 }}>
            <DD color={o.color} glyph={o.glyph} size={120} isz={56}/>
            <div style={{ flex: 1, textAlign:'left' }}>
              <div className="nm" style={{ fontSize: 36 }}>{o.name}</div>
              <div className="sub" style={{ fontSize: 22, marginTop: 6 }}>{o.sub}</div>
            </div>
            <I d={ic.arrow} size={48}/>
          </button>
        ))}
      </div>

      {/* Extras */}
      <div className="label-tag" style={{ marginBottom: 14 }}>EXPLORE OTHER SERVICES</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 16 }}>
        {extras.map(e => (
          <button key={e.name} className="tile" style={{ minHeight: 200, padding: 24, alignItems:'center', textAlign:'center', justifyContent:'center', gap: 16 }}>
            <DD color={e.color} glyph={e.glyph} size={84} isz={42}/>
            <div className="nm" style={{ fontSize: 24 }}>{e.name}</div>
          </button>
        ))}
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 06. DEPARTMENT MENU (Electricity example)
// ═══════════════════════════════════════════════════════════════════
function VElecMenu() {
  const services = [
    { name:'New Connection', desc:'Apply for a new electricity connection or load extension', glyph: ic.plus },
    { name:'Pay Bill', desc:'Pay current or past bills · Auto-pay setup', glyph: ic.receipt },
    { name:'Meter Service', desc:'Replacement, shifting, malfunction reports', glyph: ic.cog },
    { name:'File Complaint', desc:'Outage, voltage, billing dispute, others', glyph: ic.bell },
    { name:'Track Request', desc:'Status of your applications and complaints', glyph: ic.track },
    { name:'Receipts', desc:'Past payments and acknowledgements', glyph: ic.receipt },
  ];
  return (
    <VK name="Aruna">
      <div style={{ textAlign:'center', marginBottom: 28 }}>
        <DD color="var(--dept-elec)" glyph={ic.bolt} size={140} isz={72}/>
        <h1 className="h2" style={{ marginTop: 20 }}>Electricity Dept</h1>
        <p className="body-l" style={{ marginTop: 10 }}>Connections, meter services, bills & complaints</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 18 }}>
        {services.map(s => (
          <button key={s.name} className="tile" style={{ minHeight: 260 }}>
            <DD color="var(--dept-elec)" glyph={s.glyph} size={80} isz={40}/>
            <div>
              <div className="nm" style={{ fontSize: 26 }}>{s.name}</div>
              <div className="sub" style={{ marginTop: 8 }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 07. SERVICE FORM
// ═══════════════════════════════════════════════════════════════════
function VForm() {
  return (
    <VK name="Aruna">
      <div style={{ marginBottom: 18 }}>
        <div className="label-tag">ELECTRICITY · NEW CONNECTION</div>
        <h2 className="h3" style={{ marginTop: 8 }}>Application Details</h2>
      </div>

      {/* Steps */}
      <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 28 }}>
        {[1,2,3].map((n, i) => (
          <React.Fragment key={n}>
            <div style={{ width: 48, height: 48, borderRadius:'50%', background: n <= 2 ? 'var(--indigo-700)':'var(--surface-2)', color: n <= 2 ? 'white':'var(--ink-500)', display:'grid', placeItems:'center', fontWeight: 700, fontSize: 20 }}>{n < 2 ? '' : n}</div>
            {i < 2 && <div style={{ flex: 1, height: 4, background: n < 2 ? 'var(--indigo-700)':'var(--surface-2)', borderRadius: 2 }}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{ padding: 32 }}>
        <div style={{ display:'flex', flexDirection:'column', gap: 22 }}>
          <div>
            <label style={{ fontSize: 18, fontWeight: 600, color:'var(--ink-700)' }}>Full Name</label>
            <div className="field" style={{ marginTop: 8 }}>Aruna Devi</div>
          </div>
          <div>
            <label style={{ fontSize: 18, fontWeight: 600, color:'var(--ink-700)' }}>Mobile Number</label>
            <div className="field" style={{ marginTop: 8, fontFamily:'var(--font-mono)' }}>+91 98765 41234</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 18, fontWeight: 600, color:'var(--ink-700)' }}>State</label>
              <div className="field" style={{ marginTop: 8 }}>Assam ▾</div>
            </div>
            <div>
              <label style={{ fontSize: 18, fontWeight: 600, color:'var(--ink-700)' }}>City</label>
              <div className="field" style={{ marginTop: 8 }}>Guwahati ▾</div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 18, fontWeight: 600, color:'var(--ink-700)' }}>Property Address</label>
            <div className="field" style={{ marginTop: 8, minHeight: 110, padding: 22 }}>House 24, GS Road, Bhangagarh, Guwahati - 781005</div>
          </div>
        </div>
      </div>

      {/* QR upload */}
      <div className="card" style={{ marginTop: 20, padding: 26, border: '2.5px dashed var(--indigo-300)', background: 'var(--indigo-100)', display: 'flex', alignItems:'center', gap: 22 }}>
        <div style={{ width: 88, height: 88, borderRadius: 22, background:'var(--indigo-700)', color:'white', display:'grid', placeItems:'center', flexShrink: 0 }}><I d={ic.qr} size={48}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color:'var(--indigo-900)' }}>Upload documents from phone</div>
          <div className="meta" style={{ marginTop: 4 }}>Scan QR · Property doc · ID proof · 3 of 5 uploaded</div>
        </div>
        <span className="badge b-ok">3/5</span>
      </div>

      <div style={{ display:'flex', gap: 14, marginTop: 24 }}>
        <button className="btn btn-quiet" style={{ flex: 1 }}><I d={ic.back} size={22}/> Back</button>
        <button className="btn btn-pri" style={{ flex: 2 }}>Submit Application <I d={ic.arrow} size={22}/></button>
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 08. COMPLAINTS (photo + GPS + AI)
// ═══════════════════════════════════════════════════════════════════
function VComplaint() {
  return (
    <VK name="Aruna">
      <h2 className="h3" style={{ marginBottom: 8 }}>File a Complaint</h2>
      <p className="body" style={{ marginBottom: 24 }}>Photo evidence · GPS auto-tagged · AI categorized</p>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display:'flex', flexDirection:'column', gap: 22 }}>
          <div>
            <label style={{ fontSize: 18, fontWeight: 600 }}>Category</label>
            <div className="field" style={{ marginTop: 8 }}>Street Light Outage ▾</div>
            <div style={{ display:'flex', gap: 10, marginTop: 10 }}>
              <span className="badge b-info"> AI · 92% MATCH</span>
              <span className="badge b-warn">3 NEARBY DUPLICATES</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 18, fontWeight: 600 }}>Photo Evidence</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12, marginTop: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ aspectRatio: 1, borderRadius: 18, background:`repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 10px, white 10px, white 20px)`, border:'1px solid var(--line)', display:'grid', placeItems:'center', fontFamily:'var(--font-mono)', fontSize: 14, color:'var(--ink-500)' }}>PHOTO {i}</div>
              ))}
              <div style={{ aspectRatio: 1, borderRadius: 18, border:'2.5px dashed var(--indigo-300)', display:'flex', flexDirection:'column', gap: 6, alignItems:'center', justifyContent:'center', color:'var(--indigo-700)', cursor:'pointer' }}>
                <I d={ic.plus} size={36}/>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Add</span>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 18, fontWeight: 600 }}>Description</label>
            <div className="field" style={{ marginTop: 8, minHeight: 120, padding: 22 }}>Streetlight near GS Road junction not working for past 4 days. Area becomes very dark at night, posing safety risk.</div>
          </div>

          <div style={{ background:'var(--indigo-100)', borderRadius: 20, padding: 22, display:'flex', alignItems:'center', gap: 18, border: '1.5px solid var(--indigo-300)' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background:'var(--indigo-700)', color:'white', display:'grid', placeItems:'center', flexShrink:0 }}><I d={ic.pin} size={36}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>GPS Auto-tagged</div>
              <div className="meta" style={{ marginTop: 4, fontFamily:'var(--font-mono)' }}>26.1445° N · 91.7362° E · Bhangagarh</div>
            </div>
            <span className="badge b-ok"><I d={ic.check} size={14}/> LOCKED</span>
          </div>
        </div>
      </div>

      <button className="btn btn-pri btn-xl" style={{ width:'100%', marginTop: 24 }}>Submit Complaint <I d={ic.arrow} size={28}/></button>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 09. TRACKER
// ═══════════════════════════════════════════════════════════════════
function VTracker() {
  const steps = [
    { d:'done', t:'Submitted', s:'Mar 12 · 10:42 AM', n:'Application received and assigned a reference number' },
    { d:'done', t:'Verified',  s:'Mar 13 · 2:15 PM',  n:'Documents verified by JE — all in order' },
    { d:'now',  t:'Site Inspection', s:'Mar 16 · scheduled', n:'Officer Suresh K. will visit between 10am — 1pm' },
    { d:'',     t:'Approval',  s:'Pending', n:'Awaits AEE approval after inspection' },
    { d:'',     t:'Connection',s:'Pending', n:'Meter installation and energization' },
  ];
  return (
    <VK name="Aruna">
      <div style={{ marginBottom: 20 }}>
        <h2 className="h3">Track Your Request</h2>
        <p className="body" style={{ marginTop: 8 }}>Real-time status</p>
      </div>

      <div className="card" style={{ marginBottom: 22, padding: 28, display:'flex', justifyContent:'space-between', alignItems:'center', gap: 16 }}>
        <div>
          <div className="label-tag">REFERENCE</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize: 30, fontWeight: 700, color:'var(--indigo-700)', marginTop: 6 }}>SUV-EL-2026-018472</div>
          <div className="meta" style={{ marginTop: 6 }}>New Connection · Electricity · Filed Mar 12</div>
        </div>
        <span className="badge b-warn" style={{ fontSize: 18, padding: '12px 22px' }}>IN PROGRESS · 60%</span>
      </div>

      <div className="card" style={{ padding: 32 }}>
        <div className="tl">
          {steps.map((s, i) => (
            <div key={i} className="tl-item">
              <div className={`tl-dot ${s.d}`}>{s.d === 'done' ? '' : i + 1}</div>
              <div style={{ flex: 1, paddingTop: 8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap: 14 }}>
                  <div style={{ fontWeight: s.d === 'now' ? 800 : 700, fontSize: 24, color: s.d === '' ? 'var(--ink-500)' : 'var(--ink-900)' }}>{s.t}</div>
                  <div style={{ fontSize: 16, color:'var(--ink-500)', fontFamily:'var(--font-mono)' }}>{s.s}</div>
                </div>
                <div className="body" style={{ marginTop: 4, fontSize: 18 }}>{s.n}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap: 14, marginTop: 24 }}>
        <button className="btn btn-quiet" style={{ flex: 1 }}><I d={ic.print} size={22}/> Print</button>
        <button className="btn btn-pri" style={{ flex: 1 }}><I d={ic.bell} size={22}/> SMS Updates</button>
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 10. RECEIPT
// ═══════════════════════════════════════════════════════════════════
function VReceipt() {
  return (
    <VK name="Aruna">
      <div style={{ textAlign:'center', marginBottom: 24 }}>
        <div style={{ width: 120, height: 120, borderRadius:'50%', background:'color-mix(in oklab, var(--ok) 18%, white)', color:'var(--ok)', display:'inline-grid', placeItems:'center' }}><I d={ic.check} size={60}/></div>
        <h2 className="h3" style={{ marginTop: 20 }}>Request Submitted</h2>
        <p className="body-l" style={{ marginTop: 8 }}>Your acknowledgement is ready</p>
      </div>

      <div className="card" style={{ padding: 36 }}>
        <div style={{ textAlign:'center', borderBottom:'3px solid var(--indigo-900)', paddingBottom: 22, marginBottom: 22 }}>
          <Logo size={56} primary="var(--indigo-900)" accent="var(--saffron-500)"/>
          <div style={{ fontWeight: 800, color:'var(--indigo-900)', marginTop: 10, fontSize: 22 }}>SUVIDHA · Govt of Assam</div>
          <div className="label-tag" style={{ marginTop: 6 }}>SMART URBAN HELPDESK</div>
        </div>

        <div style={{ textAlign:'center', marginBottom: 24 }}>
          <div className="label-tag">REFERENCE NUMBER</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize: 38, fontWeight: 800, color:'var(--indigo-700)', marginTop: 8 }}>SUV-EL-2026-018472</div>
        </div>

        <div className="receipt-row"><span className="k">Service</span><span className="v">New Electricity Connection</span></div>
        <div className="receipt-row"><span className="k">Applicant</span><span className="v">Aruna Devi</span></div>
        <div className="receipt-row"><span className="k">Submitted</span><span className="v" style={{ fontFamily:'var(--font-mono)' }}>2026-03-12 · 10:42 IST</span></div>
        <div className="receipt-row"><span className="k">SLA</span><span className="v" style={{ color:'var(--ok)' }}>14 working days</span></div>
        <div className="receipt-row"><span className="k">Officer</span><span className="v">JE — Suresh Kumar</span></div>
        <div className="receipt-row"><span className="k">Application Fee</span><span className="v">₹ 250.00</span></div>

        {/* QR */}
        <div style={{ display:'flex', alignItems:'center', gap: 20, marginTop: 24, padding: 22, background:'var(--surface-1)', borderRadius: 18 }}>
          <div style={{ width: 120, height: 120, borderRadius: 14, background:`repeating-linear-gradient(0deg, var(--indigo-900) 0 5px, white 5px 10px), repeating-linear-gradient(90deg, var(--indigo-900) 0 5px, transparent 5px 10px)` }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Scan to track on phone</div>
            <div className="meta" style={{ marginTop: 4, fontFamily:'var(--font-mono)', fontSize: 14 }}>suvidha.assam.gov.in/track/SUV-EL-2026-018472</div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap: 14, marginTop: 24 }}>
        <button className="btn btn-quiet" style={{ flex: 1 }}><I d={ic.print} size={22}/> Print Receipt</button>
        <button className="btn btn-pri" style={{ flex: 1 }}><I d={ic.phone} size={22}/> SMS to Mobile</button>
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 11. SCHEMES
// ═══════════════════════════════════════════════════════════════════
function VSchemes() {
  const schemes = [
    { name:'PM Awas Yojana (Urban)', dept:'Housing & Urban Affairs', match:96, c:'var(--saffron-700)', glyph: ic.building, tag:'Eligible', desc:'Affordable housing for urban poor — up to ₹2.67 lakh subsidy' },
    { name:'Ayushman Bharat — PMJAY', dept:'Health & Family Welfare', match:88, c:'var(--dept-health)', glyph: ic.heart, tag:'Eligible · Renewal due', desc:'Free health cover up to ₹5 lakh per family per year' },
    { name:'Orunodoi 2.0', dept:'Govt of Assam', match:82, c:'var(--dept-water)', glyph: ic.family, tag:'Eligible', desc:'₹1,250 monthly to women head of household' },
    { name:'PM-KISAN', dept:'Agriculture & Farmers Welfare', match:34, c:'var(--dept-waste)', glyph: ic.shield, tag:'Not eligible', desc:'₹6,000/year direct income support to farmers' },
  ];
  return (
    <VK name="Aruna">
      <div style={{ marginBottom: 22 }}>
        <h2 className="h3">Government Schemes</h2>
        <p className="body" style={{ marginTop: 8 }}>AI-matched to your profile · Apply directly</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap: 10, marginBottom: 20, flexWrap:'wrap' }}>
        {['All', 'Housing', 'Healthcare', 'Women', 'Pension'].map((c, i) => (
          <span key={c} className={`chip ${i === 0 ? 'act' : ''}`}>{c}</span>
        ))}
        <span className="chip"><I d={ic.search} size={20}/> Search 2,400+</span>
      </div>

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
        {schemes.map(s => (
          <div key={s.name} className="card" style={{ padding: 28 }}>
            <div style={{ display:'flex', gap: 22, alignItems:'flex-start' }}>
              <DD color={s.c} glyph={s.glyph} size={88} isz={44}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 26, color:'var(--indigo-900)', lineHeight: 1.2 }}>{s.name}</div>
                <div className="meta" style={{ marginTop: 6, fontSize: 16 }}>{s.dept}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontWeight: 800, fontSize: 36, color: s.match > 70 ? 'var(--ok)' : 'var(--ink-500)', letterSpacing:'-0.02em' }}>{s.match}%</div>
                <div className="label-tag" style={{ fontSize: 11 }}>MATCH</div>
              </div>
            </div>
            <div className="body" style={{ marginTop: 14 }}>{s.desc}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 16 }}>
              <span className={`badge ${s.match >= 70 ? 'b-ok' : 'b-err'}`} style={{ fontSize: 14, padding: '8px 16px' }}>{s.tag}</span>
              <button className="btn btn-pri" style={{ minHeight: 64, fontSize: 18, padding: '14px 28px' }}>Apply <I d={ic.arrow} size={22}/></button>
            </div>
          </div>
        ))}
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 12. OFFICE LOCATOR
// ═══════════════════════════════════════════════════════════════════
function VLocator() {
  const offs = [
    { n:'APDCL Bhangagarh', d:'1.2 km', cat:'Electricity', col:'var(--dept-elec)', glyph: ic.bolt, hrs:'10am — 5pm', sel:true },
    { n:'CSC — Paltan Bazar', d:'0.8 km', cat:'Common Service', col:'var(--indigo-700)', glyph: ic.cog, hrs:'24/7 kiosk' },
    { n:'Guwahati Municipal', d:'2.4 km', cat:'Municipal', col:'var(--dept-water)', glyph: ic.building, hrs:'10am — 5pm' },
    { n:'Assam Gas Office', d:'3.1 km', cat:'Gas', col:'var(--dept-gas)', glyph: ic.flame, hrs:'9am — 6pm' },
  ];
  return (
    <VK name="Aruna">
      <div style={{ marginBottom: 20 }}>
        <h2 className="h3">Nearest Offices</h2>
        <p className="body" style={{ marginTop: 8 }}>Bhangagarh · Filter by department</p>
      </div>

      {/* Map */}
      <div style={{ height: 560, borderRadius: 28, overflow:'hidden', position:'relative', background: `radial-gradient(circle at 30% 40%, oklch(0.92 0.05 200) 0%, oklch(0.94 0.03 70) 60%)`, marginBottom: 22, border:'1px solid var(--line)' }}>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <path d="M 50 100 Q 300 80 600 240 T 1000 500" stroke="white" strokeWidth="28" fill="none" opacity="0.8"/>
          <path d="M 120 320 L 540 320 L 540 480" stroke="white" strokeWidth="18" fill="none" opacity="0.7"/>
          <path d="M 100 450 L 800 480" stroke="white" strokeWidth="14" fill="none" opacity="0.6"/>
          <g transform="translate(420, 280)">
            <circle r="36" fill="var(--indigo-700)" stroke="white" strokeWidth="4"/>
            <text textAnchor="middle" y="8" fill="white" fontSize="20" fontWeight="800" fontFamily="Plus Jakarta Sans">YOU</text>
          </g>
          <g transform="translate(620, 180)"><circle r="22" fill="var(--dept-elec)" stroke="white" strokeWidth="3"/><text textAnchor="middle" y="7" fill="white" fontSize="20"></text></g>
          <g transform="translate(220, 420)"><circle r="22" fill="var(--dept-water)" stroke="white" strokeWidth="3"/><text textAnchor="middle" y="7" fill="white" fontSize="20"></text></g>
          <g transform="translate(720, 440)"><circle r="22" fill="var(--dept-gas)" stroke="white" strokeWidth="3"/><text textAnchor="middle" y="7" fill="white" fontSize="20"></text></g>
          <g transform="translate(340, 380)"><circle r="22" fill="var(--indigo-500)" stroke="white" strokeWidth="3"/><text textAnchor="middle" y="7" fill="white" fontSize="20"></text></g>
        </svg>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
        {offs.map(o => (
          <button key={o.n} className="card" style={{ padding: 24, display:'flex', alignItems:'center', gap: 22, cursor:'pointer', border: o.sel ? '2.5px solid var(--indigo-700)' : '1.5px solid var(--line)', background: o.sel ? `color-mix(in oklab, var(--indigo-700) 5%, white)` : 'white' }}>
            <DD color={o.col} glyph={o.glyph} size={72} isz={36}/>
            <div style={{ flex: 1, textAlign:'left' }}>
              <div style={{ fontWeight: 700, fontSize: 24, color:'var(--indigo-900)' }}>{o.n}</div>
              <div className="meta" style={{ marginTop: 4 }}>{o.cat} · {o.hrs}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontWeight: 800, fontSize: 24, color:'var(--indigo-700)' }}>{o.d}</div>
              <div className="label-tag" style={{ fontSize: 11 }}>AWAY</div>
            </div>
          </button>
        ))}
      </div>
    </VK>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSER
// ═══════════════════════════════════════════════════════════════════
const { DesignCanvas, DCSection, DCArtboard } = window;

function App() {
  const W = 1080, H = 1920;
  return (
    <DesignCanvas
      title="SUVIDHA — 55″ Vertical Kiosk"
      subtitle="1080×1920 portrait · designed for standing-height reach zone · 12 page archetypes"
    >
      <DCSection id="auth" title="01. Authentication">
        <DCArtboard id="landing"  label="Landing · Welcome" width={W} height={H}><VLanding/></DCArtboard>
        <DCArtboard id="aadhaar"  label="Aadhaar entry · On-screen keypad" width={W} height={H}><VAadhaar/></DCArtboard>
        <DCArtboard id="auth"     label="Authenticate · OTP / QR / Biometric" width={W} height={H}><VAuth/></DCArtboard>
        <DCArtboard id="mode"     label="Mode selection" width={W} height={H}><VMode/></DCArtboard>
      </DCSection>

      <DCSection id="services" title="02. Service Flows">
        <DCArtboard id="home"     label="Home · Service hub" width={W} height={H}><VHome/></DCArtboard>
        <DCArtboard id="elec"     label="Electricity menu" width={W} height={H}><VElecMenu/></DCArtboard>
        <DCArtboard id="form"     label="Service application form" width={W} height={H}><VForm/></DCArtboard>
        <DCArtboard id="complaint" label="Complaint · Photo + GPS + AI" width={W} height={H}><VComplaint/></DCArtboard>
      </DCSection>

      <DCSection id="utility" title="03. Utility">
        <DCArtboard id="track"    label="Track request" width={W} height={H}><VTracker/></DCArtboard>
        <DCArtboard id="receipt"  label="Receipt · Print / SMS" width={W} height={H}><VReceipt/></DCArtboard>
        <DCArtboard id="schemes"  label="Schemes · AI matched" width={W} height={H}><VSchemes/></DCArtboard>
        <DCArtboard id="locator"  label="Office locator · Map" width={W} height={H}><VLocator/></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
