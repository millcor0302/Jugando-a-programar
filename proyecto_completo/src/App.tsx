import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeopolitics, ConflictData, ConflictStatus, NewsItem, LiveChannel } from './hooks/useGeopolitics';

const CITIES = [
  {name:'LIMA',     tz:'America/Lima'},
  {name:'D.C.',     tz:'America/New_York'},
  {name:'PEKÍN',    tz:'Asia/Shanghai'},
  {name:'BRUSELAS', tz:'Europe/Brussels'},
];

function useClock() {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  return now;
}

const STATUS_COLOR: Record<ConflictStatus,string>={
  'crítico':'#e53e3e','escalada':'#dd6b20','estable':'#38a169','latente':'#718096',
};

function SourceLink({url,label}:{url:string;label:string}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{fontSize:9,color:'#3b82f6',textDecoration:'none',border:'1px solid #bee3f8',padding:'1px 5px',borderRadius:3,background:'#ebf8ff',whiteSpace:'nowrap'}}
      onMouseEnter={e=>(e.currentTarget.style.background='#bee3f8')}
      onMouseLeave={e=>(e.currentTarget.style.background='#ebf8ff')}
    >↗ {label}</a>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({isConnected,countdown}:{isConnected:boolean;countdown:string}) {
  const now=useClock();
  return (
    <header style={{background:'#c0392b',color:'white',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🌐</div>
        <div>
          <div style={{fontWeight:'bold',fontSize:20,letterSpacing:1}}>Monitor Perú <span style={{fontSize:14,opacity:0.85}}>(VP)</span></div>
          <div style={{fontSize:10,opacity:0.8,letterSpacing:2}}>CANCILLERÍA · INTELIGENCIA GEOPOLÍTICA</div>
        </div>
      </div>
      <div style={{display:'flex',gap:24}}>
        {CITIES.map(c=>(
          <div key={c.name} style={{textAlign:'center'}}>
            <div style={{fontSize:10,opacity:0.75,letterSpacing:1}}>{c.name}</div>
            <div style={{fontWeight:'bold',fontSize:17,fontFamily:'monospace',letterSpacing:1}}>
              {now.toLocaleTimeString('es-PE',{timeZone:c.tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{textAlign:'center',background:'rgba(0,0,0,0.2)',padding:'4px 10px',borderRadius:6}}>
          <div style={{fontSize:8,opacity:0.7,letterSpacing:1}}>PRÓXIMA ACTUALIZACIÓN</div>
          <div style={{fontFamily:'monospace',fontWeight:'bold',fontSize:16,letterSpacing:2}}>{countdown}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:isConnected?'#68d391':'#fc8181',animation:'blink 2s infinite'}}/>
          <span style={{fontSize:11}}>{isConnected?'EN VIVO':'CONECTANDO...'}</span>
        </div>
      </div>
    </header>
  );
}

// ─── Commodities (real prices from SGM + BCRP) ────────────────────────────────
function CommodityPanel({commodities,currencies,metalDate,fxDate,onRefresh}:{
  commodities:any[];currencies:any[];metalDate:string;fxDate:string;onRefresh:()=>void;
}) {
  return (
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#c0392b',color:'white',padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:'bold',fontSize:11,letterSpacing:1}}>COMMODITIES · PRECIOS DIARIOS</span>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={onRefresh} title="Actualizar precios" style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontSize:11}}>🔄</button>
          <SourceLink url="https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales" label="SGM" />
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {commodities.map((c:any)=>(
          <div key={c.symbol} style={{display:'flex',alignItems:'center',padding:'5px 10px',borderBottom:'1px solid #f7fafc',gap:6}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'#fff5f5',border:'1px solid #fed7d7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:8,fontWeight:'bold',color:'#c0392b'}}>{c.symbol}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                {c.name} <SourceLink url={c.sourceUrl} label={c.sourceName}/>
              </div>
              <div style={{fontSize:9,color:'#718096'}}>{c.unit}</div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              {c.price!=null
                ? <div style={{fontSize:12,fontWeight:'bold',fontFamily:'monospace'}}>{c.price.toLocaleString('es-PE',{minimumFractionDigits:2})}</div>
                : <div style={{fontSize:11,color:'#a0aec0',fontStyle:'italic'}}>Cargando…</div>
              }
              {c.change!=null && (
                <div style={{fontSize:10,color:c.change>=0?'#38a169':'#e53e3e'}}>{c.change>=0?'▲':'▼'} {Math.abs(c.change).toFixed(2)}%</div>
              )}
            </div>
          </div>
        ))}
        {metalDate && <div style={{padding:'4px 10px',background:'#fffbeb',borderTop:'1px dashed #fbd38d',fontSize:9,color:'#975a16'}}>📅 Precios del día: {metalDate} · Fuente: SGM</div>}

        <div style={{padding:'8px 10px',background:'#f7fafc',borderTop:'2px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:'bold',color:'#4a5568',letterSpacing:1}}>TIPO DE CAMBIO OFICIAL · BCRP</span>
            <SourceLink url="https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/tipo-de-cambio" label="BCRP"/>
          </div>
          {currencies.map((cur:any)=>(
            <div key={`${cur.from}-${cur.to}`} style={{display:'flex',justifyContent:'space-between',marginBottom:4,alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:600}}>{cur.from} → {cur.to}</span>
              {cur.rate!=null
                ? <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:'bold',fontFamily:'monospace'}}>{cur.rate.toFixed(4)}</span>
                    {cur.change!=null && <span style={{fontSize:9,color:cur.change>=0?'#38a169':'#e53e3e'}}>{cur.change>=0?'+':''}{cur.change.toFixed(4)}</span>}
                  </div>
                : <span style={{fontSize:11,color:'#a0aec0',fontStyle:'italic'}}>Cargando…</span>
              }
            </div>
          ))}
          {fxDate && <div style={{fontSize:9,color:'#718096',marginTop:4}}>Datos del: {fxDate}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────
function MapPanel({conflicts,onSelect}:{conflicts:ConflictData[];onSelect:(id:string)=>void}) {
  return (
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'8px 14px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontWeight:'bold',fontSize:13}}>MONITOR GEOPOLÍTICO GLOBAL (VP)</div>
          <div style={{fontSize:10,color:'#718096'}}>Clic en un punto para ver detalle</div>
        </div>
        <div style={{display:'flex',gap:12}}>
          {([['#e53e3e','CRÍTICO'],['#dd6b20','MODERADO'],['#38a169','ESTABLE']] as [string,string][]).map(([c,l])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:c}}/>
              <span style={{fontSize:10,color:'#4a5568',fontWeight:600}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1}}>
        <MapContainer center={[20,30]} zoom={2} minZoom={1} maxZoom={8} style={{width:'100%',height:'100%'}} zoomControl attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {conflicts.map(c=>(
            <CircleMarker key={c.id} center={c.coordinates}
              radius={c.status==='crítico'?11:c.status==='escalada'?9:7}
              pathOptions={{color:STATUS_COLOR[c.status],fillColor:STATUS_COLOR[c.status],fillOpacity:0.8,weight:2}}
              eventHandlers={{click:()=>onSelect(c.id)}}>
              <Popup>
                <div style={{minWidth:210,padding:6}}>
                  <div style={{fontWeight:'bold',fontSize:13,marginBottom:3}}>{c.title}</div>
                  <div style={{fontSize:11,color:'#718096',marginBottom:6,lineHeight:1.4}}>{c.summary}</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:10,color:STATUS_COLOR[c.status],fontWeight:'bold',textTransform:'uppercase'}}>{c.status}</span>
                    <span style={{fontSize:10,color:'#718096'}}>Riesgo: {c.riskLevel}%</span>
                  </div>
                  <SourceLink url={c.sourceUrl} label={c.sourceName}/>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// ─── Indicators ───────────────────────────────────────────────────────────────
function IndicatorsPanel({indicators}:{indicators:any[]}) {
  return (
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#c0392b',color:'white',padding:'8px 12px'}}>
        <div style={{fontWeight:'bold',fontSize:11,letterSpacing:1}}>INDICADORES NACIONALES</div>
        <div style={{width:24,height:2,background:'#fc8181',marginTop:4}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:10,display:'flex',flexDirection:'column',gap:8}}>
        {indicators.map((ind:any,i:number)=>(
          <div key={i} style={{padding:10,background:'#f7fafc',borderRadius:6,borderLeft:`3px solid ${ind.positive?'#38a169':'#e53e3e'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <div style={{fontSize:9,color:'#718096',letterSpacing:1}}>{ind.label.toUpperCase()}</div>
              <div style={{fontSize:9,color:ind.positive?'#38a169':'#e53e3e',fontWeight:'bold'}}>{ind.change}</div>
            </div>
            <div style={{fontSize:20,fontWeight:'bold',color:ind.positive?'#276749':'#c53030',fontFamily:'monospace'}}>{ind.value}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
              <span style={{fontSize:9,color:'#a0aec0'}}>{ind.source}</span>
              <SourceLink url={ind.sourceUrl} label="Ver datos"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live TV ──────────────────────────────────────────────────────────────────
function LiveTVPanel({channels}:{channels:LiveChannel[]}) {
  const [filter,setFilter]=useState<string>('Todos');
  const filters=['Todos','Perú','Internacional','América Latina'];
  const filtered=filter==='Todos'?channels:channels.filter(c=>c.country===filter);
  return (
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#2d3748',color:'white',padding:'8px 12px'}}>
        <div style={{fontWeight:'bold',fontSize:11,letterSpacing:1}}>📺 NOTICIAS EN VIVO · {channels.length} CANALES</div>
        <div style={{fontSize:9,color:'#a0aec0',marginTop:2}}>🔴 YouTube · 🌐 Sitio web</div>
      </div>
      <div style={{display:'flex',gap:4,padding:'6px 10px',borderBottom:'1px solid #e2e8f0',flexWrap:'wrap'}}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'2px 8px',borderRadius:12,fontSize:9,fontWeight:600,cursor:'pointer',border:'none',background:filter===f?'#2d3748':'#f7fafc',color:filter===f?'white':'#4a5568'}}>{f}</button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,padding:8,overflowY:'auto',flex:1}}>
        {filtered.map(ch=>(
          <button key={ch.name} onClick={()=>window.open(ch.url,'_blank')}
            style={{display:'flex',alignItems:'center',gap:7,padding:'7px 8px',background:'#f7fafc',border:`1px solid #e2e8f0`,borderRadius:6,cursor:'pointer',textAlign:'left',borderLeft:`3px solid ${ch.color}`}}
            onMouseEnter={e=>(e.currentTarget.style.background='#edf2f7')}
            onMouseLeave={e=>(e.currentTarget.style.background='#f7fafc')}
          >
            <span style={{fontSize:16}}>{ch.logo}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:'#2d3748',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ch.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:3}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:ch.type==='youtube'?'#e53e3e':'#3b82f6',animation:'blink 1.5s infinite',flexShrink:0}}/>
                <span style={{fontSize:8,color:'#718096'}}>{ch.type==='youtube'?'YouTube':'Web'} · {ch.country}</span>
              </div>
            </div>
            <span style={{fontSize:11,color:ch.color}}>▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── News Feed ────────────────────────────────────────────────────────────────
const ALL_REGIONS=['Todos','Perú','América Latina','Internacional','Medio Oriente','Asia','Europa','Economía'];

function RegionalNews({news,loading,error,lastUpdate,countdown,onRefresh}:{
  news:NewsItem[];loading:boolean;error:boolean;lastUpdate:Date|null;countdown:string;onRefresh:()=>void;
}) {
  const [region,setRegion]=useState('Todos');
  const filtered=region==='Todos'?news:news.filter(n=>n.region===region);
  return (
    <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column',flex:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid #e2e8f0',flexWrap:'wrap',gap:6}}>
        <div>
          <span style={{fontWeight:'bold',fontSize:12,color:'#2d3748',letterSpacing:1}}>ÚLTIMAS NOTICIAS · RSS TIEMPO REAL</span>
          {lastUpdate&&<span style={{fontSize:9,color:'#a0aec0',marginLeft:8}}>Act: {lastUpdate.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:9,color:'#718096',background:'#f7fafc',padding:'2px 8px',borderRadius:10,border:'1px solid #e2e8f0'}}>
            ⏱ Próxima: <strong style={{fontFamily:'monospace'}}>{countdown}</strong>
          </span>
          <button onClick={onRefresh} style={{fontSize:10,color:'#c0392b',background:'none',border:'1px solid #fed7d7',borderRadius:4,padding:'3px 8px',cursor:'pointer'}}>🔄 Ahora</button>
        </div>
      </div>
      <div style={{display:'flex',gap:5,padding:'6px 14px',borderBottom:'1px solid #e2e8f0',flexWrap:'wrap'}}>
        {ALL_REGIONS.map(r=>(
          <button key={r} onClick={()=>setRegion(r)} style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:600,cursor:'pointer',border:'none',background:region===r?'#c0392b':'#f7fafc',color:region===r?'white':'#4a5568'}}>{r}</button>
        ))}
        <span style={{marginLeft:'auto',fontSize:9,color:'#718096',alignSelf:'center'}}>{filtered.length} artículos</span>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {loading&&<div style={{padding:30,textAlign:'center',color:'#718096'}}><div style={{fontSize:30,marginBottom:8}}>⏳</div>Cargando noticias…</div>}
        {error&&!loading&&<div style={{padding:20,textAlign:'center',color:'#e53e3e',fontSize:12}}>Error al cargar. <button onClick={onRefresh} style={{color:'#c0392b',cursor:'pointer',background:'none',border:'none',textDecoration:'underline'}}>Reintentar</button></div>}
        {!loading&&filtered.length===0&&<div style={{padding:20,textAlign:'center',color:'#a0aec0',fontSize:12}}>Sin noticias para "{region}"</div>}
        {!loading&&filtered.map(n=>(
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',color:'inherit',display:'block'}}>
            <div style={{padding:'9px 14px',borderBottom:'1px solid #f7fafc'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#f7fafc')}
              onMouseLeave={e=>(e.currentTarget.style.background='white')}
            >
              <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:3}}>
                <div style={{fontSize:12,fontWeight:600,color:'#2d3748',lineHeight:1.4}}>{n.headline}</div>
                {n.isNew&&<span style={{fontSize:8,padding:'2px 5px',background:'#c0392b',color:'white',borderRadius:3,fontWeight:'bold',flexShrink:0,alignSelf:'flex-start'}}>NUEVO</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontSize:9,color:'#c0392b',fontWeight:700}}>{n.source}</span>
                  {n.region&&<span style={{fontSize:9,color:'#a0aec0',background:'#f7fafc',padding:'1px 5px',borderRadius:3,border:'1px solid #e2e8f0'}}>{n.region}</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <span style={{fontSize:9,color:'#a0aec0'}}>{n.time}</span>
                  <span style={{fontSize:9,color:'#3b82f6'}}>↗</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Alignment Monitor ────────────────────────────────────────────────────────
function AlignmentDots({strength,side}:{strength:number;side:string}) {
  const color=side==='left'?'#3b82f6':'#e53e3e';
  return <div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:8,height:8,borderRadius:2,background:i<=strength?color:'#2d3748'}}/>)}</div>;
}

function AlignmentMonitor({conflicts}:{conflicts:ConflictData[]}) {
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <span style={{fontSize:22}}>⭐</span>
        <div>
          <div style={{fontWeight:'bold',fontSize:15,color:'#2d3748',letterSpacing:1}}>MONITOR DE ALINEAMIENTO GEOPOLÍTICO</div>
          <div style={{fontSize:10,color:'#718096',letterSpacing:2}}>POSICIONAMIENTO DE POTENCIAS Y BLOQUES</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <SourceLink url="https://www.cfr.org/global-conflict-tracker" label="CFR"/>
          <SourceLink url="https://acleddata.com/" label="ACLED"/>
          <SourceLink url="https://www.sipri.org/" label="SIPRI"/>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {conflicts.map(c=>(
          <div key={c.id} style={{background:'#1a202c',borderRadius:8,padding:12,color:'white'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:4,background:STATUS_COLOR[c.status],fontWeight:'bold'}}>{c.status.toUpperCase()}</span>
              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:'#63b3ed',textDecoration:'none'}}>↗ Fuente</a>
            </div>
            <div style={{fontWeight:'bold',fontSize:13,marginBottom:8,lineHeight:1.2}}>{c.title}</div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontSize:9,color:'#63b3ed',fontWeight:'bold',borderBottom:'1px solid #3b82f6',paddingBottom:1}}>{c.parties[0]}</span>
              <span style={{fontSize:9,color:'#fc8181',fontWeight:'bold',borderBottom:'1px solid #e53e3e',paddingBottom:1}}>{c.parties[1]}</span>
            </div>
            <div style={{fontSize:9,color:'#a0aec0',marginBottom:5,letterSpacing:1}}>ALINEAMIENTO</div>
            {c.alignment.map(a=>(
              <div key={a.code} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontSize:8,color:'#718096',width:18}}>{a.code}</span>
                  <span style={{fontSize:10,color:'#e2e8f0'}}>{a.country}</span>
                </div>
                <AlignmentDots strength={a.strength} side={a.side}/>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Conflict News Columns ────────────────────────────────────────────────────
function ConflictNewsColumns({conflicts,globalNews}:{conflicts:ConflictData[];globalNews:NewsItem[]}) {
  const kws:Record<string,string[]>={
    'usa-iran':        ['irán','iran','golfo','nuclear'],
    'china-usa':       ['china','taiwan','pacifico','brics'],
    'israel-palestina':['israel','palestina','gaza','hamas'],
    'russia-ukraine':  ['ucrania','rusia','otan','nato'],
  };
  const getNews=(c:ConflictData)=>{
    const words=kws[c.id]??[];
    const rel=globalNews.filter(n=>words.some(k=>n.headline.toLowerCase().includes(k))).slice(0,3);
    return rel.length>0?rel:globalNews.filter(n=>n.region==='Internacional').slice(0,2);
  };
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
      {conflicts.map(c=>(
        <div key={c.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
          <div style={{background:'#2d3748',color:'white',padding:'6px 12px',display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLOR[c.status],flexShrink:0}}/>
            <span style={{fontSize:10,fontWeight:'bold'}}>{c.title}</span>
          </div>
          <div>
            {getNews(c).map(n=>(
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',color:'inherit',display:'block'}}>
                <div style={{padding:'8px 12px',borderBottom:'1px solid #f7fafc'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f7fafc')}
                  onMouseLeave={e=>(e.currentTarget.style.background='white')}
                >
                  <div style={{display:'flex',gap:4,marginBottom:3}}>
                    <p style={{fontSize:11,color:'#2d3748',lineHeight:1.3,margin:0,flex:1}}>{n.headline.slice(0,90)}{n.headline.length>90?'…':''}</p>
                    {n.isNew&&<span style={{fontSize:8,padding:'1px 4px',background:'#c0392b',color:'white',borderRadius:2,flexShrink:0,alignSelf:'flex-start'}}>NUEVO</span>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:9,color:'#c0392b',fontWeight:600}}>{n.source}</span>
                    <span style={{fontSize:9,color:'#3b82f6'}}>{n.time} ↗</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div style={{background:'#f7fafc',padding:'8px 12px',borderTop:'2px solid #e2e8f0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:9,fontWeight:'bold',color:'#4a5568',letterSpacing:1}}>🌐 POSICIÓN PERÚ</span>
              <SourceLink url={c.sourceUrl} label={c.sourceName.split('–')[0].trim()}/>
            </div>
            <p style={{fontSize:10,color:'#718096',lineHeight:1.4,margin:0,fontStyle:'italic'}}>"{c.peruPosition}"</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const {commodities,currencies,metalDate,fxDate,indicators,conflicts,news,newsLoading,newsError,lastNewsUpdate,countdown,isConnected,channels,refreshNews,refreshPrices}=useGeopolitics();
  const [,setSelectedConflict]=useState<string|null>(null);
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#edf2f7',fontFamily:'system-ui,-apple-system,sans-serif',overflow:'hidden'}}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#f7fafc;}
        ::-webkit-scrollbar-thumb{background:#cbd5e0;border-radius:2px;}
        .leaflet-control-attribution{display:none!important;}
        a{color:inherit;}
      `}</style>
      <Header isConnected={isConnected} countdown={countdown}/>
      <div style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'240px 1fr 210px',gap:14,height:400}}>
          <CommodityPanel commodities={commodities} currencies={currencies} metalDate={metalDate} fxDate={fxDate} onRefresh={refreshPrices}/>
          <MapPanel conflicts={conflicts} onSelect={setSelectedConflict}/>
          <IndicatorsPanel indicators={indicators}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:14,minHeight:280}}>
          <LiveTVPanel channels={channels}/>
          <RegionalNews news={news} loading={newsLoading} error={newsError} lastUpdate={lastNewsUpdate} countdown={countdown} onRefresh={refreshNews}/>
        </div>
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:8,padding:14}}>
          <AlignmentMonitor conflicts={conflicts}/>
        </div>
        <ConflictNewsColumns conflicts={conflicts} globalNews={news}/>
        <div style={{textAlign:'center',padding:'6px 0',color:'#a0aec0',fontSize:9,letterSpacing:1}}>
          MONITOR PERÚ · CANCILLERÍA · USO INTERNO · PRECIOS: SGM · BCRP · MINEM · LME · NOTICIAS: BBC · DW · FRANCE 24 · ANDINA · RPP · OJO PÚBLICO · AL JAZEERA · INFOBAE · REUTERS · CNN (VÍA GOOGLE NEWS) · TV: YOUTUBE LIVE · CFR · SIPRI · ACLED
        </div>
      </div>
    </div>
  );
}
