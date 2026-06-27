import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { VK } from '../components/kiosk';
import RealtimeNavigationMap from '../components/RealtimeNavigationMap';
import { MapLocatingOverlay } from '../components/loading';
import { mockDelayRange } from '../utils/mockDelay';
import { STATES, DISTRICTS, ALL_OFFICES } from '../data/officeData';

const getCategories = (t) => [
  { id: 'all',         label: t('officeLocator.catAll'),          icon: '' },
  { id: 'hospital',    label: t('officeLocator.catHospitals'),    icon: '' },
  { id: 'municipal',   label: t('officeLocator.catMunicipal'),    icon: '' },
  { id: 'police',      label: t('officeLocator.catPolice'),       icon: '' },
  { id: 'electricity', label: t('officeLocator.catElectricity'),  icon: '' },
  { id: 'water',       label: t('officeLocator.catWaterBoard'),   icon: '' },
  { id: 'revenue',     label: t('officeLocator.catRevenue'),      icon: '' },
  { id: 'transport',   label: t('officeLocator.catTransport'),    icon: '' },
  { id: 'aadhaar',     label: t('officeLocator.catAadhaar'),      icon: '' },
  { id: 'welfare',     label: t('officeLocator.catWelfare'),      icon: '' },
  { id: 'fire',        label: t('officeLocator.catFireStation'),  icon: '' },
];

// Haversine distance in km
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function etaMin(km) { return Math.round((km / 30) * 60); }
function formatDist(km) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }

export default function OfficeLocator() {
  const { t } = useTranslation();
  const CATEGORIES = getCategories(t);
  const [selectedState,    setSelectedState]    = useState('AS');
  const [selectedDistrict, setSelectedDistrict] = useState('Guwahati');
  const [activeCategory,   setActiveCategory]   = useState('all');
  const [searchQuery,      setSearchQuery]       = useState('');
  const [activeOfficeId,   setActiveOfficeId]    = useState(null);
  const [sidebarOpen,      setSidebarOpen]       = useState(true);
  const [isMobile,         setIsMobile]          = useState(false);
  const [nearbyMode,       setNearbyMode]        = useState(false);
  const [userCoords,       setUserCoords]        = useState(null);
  const [locating,         setLocating]          = useState(true);
  const mapCommandRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let cancelled = false;
    mockDelayRange(2200, 2800).then(() => { if (!cancelled) setLocating(false); });
    return () => { cancelled = true; };
  }, []);

  const kioskOrigin = STATES.find(s => s.code === selectedState) || STATES[0];
  const origin = userCoords || { lat: kioskOrigin.lat, lng: kioskOrigin.lng };

  /* Nearby: use all offices across all states sorted by distance, limit 10 */
  const nearbyOffices = nearbyMode
    ? ALL_OFFICES
        .map(o => ({ ...o, _distKm: distKm(origin.lat, origin.lng, o.lat, o.lng) }))
        .sort((a, b) => a._distKm - b._distKm)
        .slice(0, 12)
    : null;

  const filteredOffices = nearbyMode ? nearbyOffices : ALL_OFFICES
    .filter(o => o.state === selectedState)
    .filter(o => !selectedDistrict || o.district === selectedDistrict)
    .filter(o => activeCategory === 'all' || o.category === activeCategory)
    .filter(o => !searchQuery ||
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.address.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(o => ({ ...o, _distKm: distKm(origin.lat, origin.lng, o.lat, o.lng) }))
    .sort((a, b) => a._distKm - b._distKm);

  const handleNearby = useCallback(() => {
    setNearbyMode(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords({ lat: kioskOrigin.lat, lng: kioskOrigin.lng })
      );
    } else {
      setUserCoords({ lat: kioskOrigin.lat, lng: kioskOrigin.lng });
    }
  }, [kioskOrigin]);

  const handleStateChange = useCallback((code) => {
    setSelectedState(code);
    setSelectedDistrict('');
    setActiveCategory('all');
    setActiveOfficeId(null);
    setNearbyMode(false);
    const st = STATES.find(s => s.code === code);
    if (st && mapCommandRef.current?.flyTo) {
      mapCommandRef.current.flyTo({ center: [st.lng, st.lat], zoom: 10, speed: 1 });
    }
  }, []);

  const handleNavigate = useCallback((office) => {
    setActiveOfficeId(office.id);
    if (mapCommandRef.current?.navigate) mapCommandRef.current.navigate(office);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <VK bg="var(--surface-1)">
    <div className="office-locator-layout">
      {/* ══ SIDEBAR ══ */}
      <aside className={`office-sidebar${sidebarOpen ? '' : ' collapsed'}`}>

        {/* Header */}
        <div style={{ padding: '14px 14px 0', flexShrink: 0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--slate-900)' }}> {t('officeLocator.title')}</h2>
              <p style={{ margin:0, fontSize:11, color:'var(--slate-500)', marginTop:1 }}>{t('officeLocator.subtitle')}</p>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)}
                style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--slate-500)' }}></button>
            )}
          </div>

          {/* Nearby button */}
          <button
            onClick={handleNearby}
            style={{
              width:'100%', marginBottom:10, padding:'8px 12px',
              background: nearbyMode ? 'var(--accent-blue)' : 'var(--accent-blue-50)',
              color: nearbyMode ? '#fff' : 'var(--accent-blue)',
              border:`1.5px solid ${nearbyMode ? 'var(--accent-blue)' : 'var(--accent-blue-200)'}`,
              borderRadius:10, fontWeight:600, fontSize:13,
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', gap:6,
              transition:'all 0.15s'
            }}
          >
             {nearbyMode ? t('officeLocator.showingNearbyOffices') : t('officeLocator.showNearbyOffices')}
          </button>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:8 }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, pointerEvents:'none' }}></span>
            <input type="text" className="sidebar-search"
              placeholder={t('officeLocator.searchPlaceholder')}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setNearbyMode(false); }}
            />
          </div>

          {!nearbyMode && (
            <>
              {/* State */}
              <div style={{ marginBottom:6 }}>
                <label style={{ fontSize:10, fontWeight:600, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:3 }}>{t('officeLocator.state')}</label>
                <select className="sidebar-select" value={selectedState} onChange={e => handleStateChange(e.target.value)}>
                  {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              {/* District */}
              <div style={{ marginBottom:8 }}>
                <label style={{ fontSize:10, fontWeight:600, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:3 }}>{t('officeLocator.district')}</label>
                <select className="sidebar-select" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
                  <option value="">{t('officeLocator.allDistricts')}</option>
                  {(DISTRICTS[selectedState] || []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Categories */}
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:600, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:5 }}>{t('officeLocator.category')}</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id}
                      className={`cat-pill${activeCategory === cat.id ? ' active' : ''}`}
                      onClick={() => setActiveCategory(cat.id)}>
                      <span>{cat.icon}</span>{cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Count row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:8, borderBottom:'1px solid var(--slate-100)' }}>
            <span style={{ fontSize:12, color:'var(--slate-500)' }}>
              {t('officeLocator.officesFound', { count: filteredOffices?.length ?? 0 })}
            </span>
            <span style={{ fontSize:11, color:'var(--slate-400)' }}>
              {nearbyMode ? t('officeLocator.nearYou') : t('officeLocator.nearState', { state: STATES.find(s => s.code === selectedState)?.name })}
            </span>
          </div>
        </div>

        {/* Cards list — extra bottom padding so last card is never hidden */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'8px 10px 80px' }}>
          {!filteredOffices || filteredOffices.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 16px', color:'var(--slate-400)' }}>
              <div style={{ fontSize:28, marginBottom:6 }}></div>
              <p style={{ fontSize:13, margin:0 }}>{t('officeLocator.noOfficesFound')}</p>
              <button onClick={() => { setActiveCategory('all'); setSearchQuery(''); setNearbyMode(false); }}
                style={{ marginTop:8, fontSize:12, color:'var(--accent-blue-400)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                {t('officeLocator.clearFilters')}
              </button>
            </div>
          ) : (
            filteredOffices.map(office => (
              <OfficeCard key={office.id} office={office}
                isActive={activeOfficeId === office.id}
                onNavigate={handleNavigate} />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 14px', borderTop:'1px solid var(--slate-100)', flexShrink:0, background:'var(--gray-50)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span className="status-dot-open" />
            <span style={{ fontSize:11, color:'var(--slate-500)' }}>
              {nearbyMode ? t('officeLocator.showingNearest') : t('officeLocator.kioskState', { state: STATES.find(s => s.code === selectedState)?.name })}
            </span>
          </div>
          <p style={{ margin:'3px 0 0', fontSize:10, color:'var(--slate-400)' }}>{t('officeLocator.voiceAutoOn')}</p>
        </div>
      </aside>

      {/* ══ MAP ══ */}
      <main className="office-map-area">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="sidebar-toggle" aria-label={t('officeLocator.openSidebar')}>
            <span style={{ fontSize:11 }}>▶</span>
          </button>
        )}
        {sidebarOpen && isMobile && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position:'absolute', inset:0, zIndex:30, background:'rgba(0,0,0,0.35)' }} />
        )}
        <RealtimeNavigationMap externalCommandRef={mapCommandRef} />
        {locating && <MapLocatingOverlay />}
        {sidebarOpen && !isMobile && (
          <button onClick={() => setSidebarOpen(false)}
            style={{
              position:'absolute', top:14, left:14, zIndex:20,
              background:'rgba(255,255,255,0.92)', border:'1px solid var(--gray-200)',
              borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:600,
              color:'var(--gray-700)', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.10)',
              display:'flex', alignItems:'center', gap:4,
            }}>◀ {t('officeLocator.hide')}</button>
        )}
      </main>
        </div>
    </VK>
  );
}

function OfficeCard({ office, isActive, onNavigate }) {
  const { t } = useTranslation();
  const categories = getCategories(t);
  const cat = categories.find(c => c.id === office.category) || categories[0];
  return (
    <div className={`office-card${isActive ? ' active' : ''}`} style={{ marginBottom:7 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
            <span style={{ fontSize:13 }}>{cat.icon}</span>
            <span style={{
              fontSize:9, fontWeight:600, padding:'2px 6px', borderRadius:999,
              background: isActive ? 'var(--accent-blue-100)' : 'var(--slate-100)',
              color: isActive ? 'var(--accent-blue)' : 'var(--slate-600)',
              textTransform:'uppercase', letterSpacing:'0.04em',
            }}>{cat.label}</span>
          </div>
          <h4 style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--slate-900)', lineHeight:1.3 }}>{office.name}</h4>
          <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--slate-500)', lineHeight:1.4 }}>{office.address}</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
            <span className={office.open ? 'status-dot-open' : 'status-dot-closed'} />
            <span style={{ fontSize:10, fontWeight:600, color: office.open ? 'var(--status-open)' : 'var(--status-closed)' }}>
              {office.open ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, margin:'7px 0 0', padding:'5px 8px', background:'var(--slate-50)', borderRadius:7 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--accent-blue)' }}>{formatDist(office._distKm)}</div>
          <div style={{ fontSize:9, color:'var(--slate-400)' }}>Distance</div>
        </div>
        <div style={{ width:1, height:20, background:'var(--gray-200)' }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--slate-900)' }}>{etaMin(office._distKm)} min</div>
          <div style={{ fontSize:9, color:'var(--slate-400)' }}>ETA</div>
        </div>
        <div style={{ flex:1 }} />
        <button className="nav-btn" onClick={() => onNavigate(office)}>
          <span></span> Navigate
        </button>
      </div>
    </div>
  );
}
