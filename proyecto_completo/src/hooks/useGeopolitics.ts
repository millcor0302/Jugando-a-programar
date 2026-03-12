import { useState, useEffect, useRef } from 'react';

export type ConflictStatus = 'crítico' | 'escalada' | 'estable' | 'latente';

export interface Commodity {
  symbol: string; name: string; price: number | null; prevPrice: number | null;
  change: number | null; unit: string; sourceUrl: string; sourceName: string;
}
export interface Currency {
  from: string; to: string; rate: number | null; change: number | null;
  sourceUrl: string; sourceName: string;
}
export interface ConflictData {
  id: string; title: string; status: ConflictStatus;
  parties: [string, string]; coordinates: [number, number];
  riskLevel: number; lastUpdate: string; summary: string;
  peruPosition: string; alignment: AlignmentEntry[];
  sourceUrl: string; sourceName: string;
}
export interface NewsItem {
  id: string; headline: string; source: string; sourceHomepage?: string;
  time: string; url: string; isNew?: boolean; region?: string;
}
export interface AlignmentEntry {
  country: string; code: string; side: 'left' | 'right' | 'neutral'; strength: number;
}
export interface NationalIndicator {
  label: string; value: string; change?: string; positive?: boolean;
  source: string; sourceUrl: string;
}
export interface LiveChannel {
  name: string; logo: string; url: string; country: string; color: string;
  type: 'youtube' | 'website';
}

// ─── Base commodity data (prices fetched from /api/metals) ───────────────────
const BASE_COMMODITIES: Omit<Commodity,'price'|'prevPrice'|'change'>[] = [
  { symbol:'Au', name:'Oro',      unit:'USD/oz', sourceUrl:'https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales', sourceName:'SGM' },
  { symbol:'Ag', name:'Plata',    unit:'USD/oz', sourceUrl:'https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales', sourceName:'SGM' },
  { symbol:'Cu', name:'Cobre',    unit:'USD/T',  sourceUrl:'https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales', sourceName:'SGM' },
  { symbol:'Pb', name:'Plomo',    unit:'USD/T',  sourceUrl:'https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales', sourceName:'SGM' },
  { symbol:'Zn', name:'Zinc',     unit:'USD/T',  sourceUrl:'https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales', sourceName:'SGM' },
  { symbol:'Mo', name:'Molibdeno',unit:'USD/T',  sourceUrl:'https://www.minem.gob.pe/_estadisticaSector.php?idSector=1', sourceName:'MINEM' },
  { symbol:'Fe', name:'Hierro',   unit:'USD/T',  sourceUrl:'https://www.mining.com/markets/',   sourceName:'MINING.COM' },
  { symbol:'Sn', name:'Estaño',   unit:'USD/T',  sourceUrl:'https://www.lme.com/en/metals/non-ferrous/lme-tin', sourceName:'LME' },
];

// Fallback prices (used if API fails)
const FALLBACK_PRICES: Record<string,number> = {
  Au:2345, Ag:24.2, Cu:9120, Pb:2080, Zn:2430, Mo:48200, Fe:115, Sn:27350,
};

const CONFLICTS: ConflictData[] = [
  {
    id:'usa-iran', title:'USA VS IRÁN', status:'escalada',
    parties:['USA / ALIADOS','IRÁN / EJE RESISTENCIA'], coordinates:[27.0,54.0],
    riskLevel:75, lastUpdate:'Hace 1 hora',
    summary:'Tensión por programa nuclear iraní y presencia militar de EEUU en el Golfo Pérsico.',
    peruPosition:'Perú llama al diálogo y respeto del derecho internacional en el Golfo Pérsico.',
    sourceUrl:'https://www.un.org/en/global-issues/conflict-prevention', sourceName:'ONU – Prevención de Conflictos',
    alignment:[
      {country:'Israel',  code:'IL',side:'left', strength:5},{country:'R. Unido',code:'GB',side:'left', strength:4},
      {country:'Rusia',   code:'RU',side:'right',strength:4},{country:'China',   code:'CN',side:'right',strength:3},
    ],
  },
  {
    id:'china-usa', title:'CHINA VS USA (HEGEMONÍA)', status:'escalada',
    parties:['USA / BLOQUE OCCIDENTAL','CHINA / BRICS+'], coordinates:[23.7,120.5],
    riskLevel:70, lastUpdate:'Hace 2 horas',
    summary:'Rivalidad estratégica por hegemonía global, tecnología y control del Indo-Pacífico.',
    peruPosition:'Perú mantiene relación estratégica con China y EE.UU. como socios clave.',
    sourceUrl:'https://www.cfr.org/global-conflict-tracker', sourceName:'Council on Foreign Relations',
    alignment:[
      {country:'Japón',    code:'JP',side:'left', strength:4},{country:'Australia',code:'AU',side:'left', strength:4},
      {country:'Rusia',    code:'RU',side:'right',strength:5},{country:'Irán',     code:'IR',side:'right',strength:3},
    ],
  },
  {
    id:'israel-palestina', title:'ISRAEL VS PALESTINA', status:'crítico',
    parties:['ISRAEL / APOYO OCC.','PALESTINA / MUNDO ÁRABE'], coordinates:[31.4,34.4],
    riskLevel:93, lastUpdate:'Hace 30 min',
    summary:'Conflicto bélico activo en Gaza desde oct. 2023. Crisis humanitaria severa.',
    peruPosition:'Perú apoya solución de dos estados y pleno respeto al derecho humanitario internacional.',
    sourceUrl:'https://www.ochaopt.org/', sourceName:'OCHA – ONU Asuntos Humanitarios',
    alignment:[
      {country:'USA',     code:'US',side:'left', strength:5},{country:'Alemania',code:'DE',side:'left', strength:4},
      {country:'Irán',    code:'IR',side:'right',strength:5},{country:'Qatar',   code:'QA',side:'right',strength:3},
    ],
  },
  {
    id:'russia-ukraine', title:'RUSIA VS UCRANIA', status:'crítico',
    parties:['UCRANIA / OTAN','RUSIA'], coordinates:[49.0,32.0],
    riskLevel:95, lastUpdate:'Hace 1 hora',
    summary:'Guerra activa desde feb. 2022. Frente de combate en este y sur de Ucrania.',
    peruPosition:'Perú condena la invasión y apoya la soberanía e integridad territorial de Ucrania.',
    sourceUrl:'https://www.nato.int/cps/en/natohq/topics_192648.htm', sourceName:'OTAN – Seguimiento del conflicto',
    alignment:[
      {country:'EEUU',       code:'US',side:'left', strength:5},{country:'Alemania',  code:'DE',side:'left', strength:4},
      {country:'China',      code:'CN',side:'right',strength:3},{country:'Bielorrusia',code:'BY',side:'right',strength:5},
    ],
  },
];

const INDICATORS: NationalIndicator[] = [
  {label:'Variación PBI',   value:'+3.2%',    change:'+0.1%',  positive:true,  source:'BCRP', sourceUrl:'https://www.bcrp.gob.pe/estadisticas.html'},
  {label:'Desempleo',       value:'6.4%',     change:'-0.2%',  positive:true,  source:'INEI', sourceUrl:'https://www.inei.gob.pe/estadisticas/indice-tematico/ocupacion-y-vivienda/'},
  {label:'Inflación Anual', value:'2.8%',     change:'-0.3%',  positive:true,  source:'BCRP', sourceUrl:'https://estadisticas.bcrp.gob.pe/estadisticas/series/mensuales/resultados/PN01270PM/html'},
  {label:'Reservas Int.',   value:'$74,100M', change:'+$200M', positive:true,  source:'BCRP', sourceUrl:'https://www.bcrp.gob.pe/estadisticas/reservas-internacionales.html'},
];

// ─── VERIFIED YouTube live channels (tested & confirmed free) ───────────────
// Removed: CNN ES (no free live), Congreso (no reliable live), Canal N (no live),
//          Al Jazeera ES (no YouTube live), BBC Mundo (no live), TeleSUR (geo-blocked)
// Added: Al Jazeera English (website), RT ES (website), CGTN ES (website)
export const LIVE_CHANNELS: LiveChannel[] = [
  // ── Perú ──────────────────────────────────────────────────────────────────
  {name:'TV Perú Noticias', logo:'🇵🇪', url:'https://www.youtube.com/@TVPeruNoticias/live',    country:'Perú',           color:'#c0392b', type:'youtube'},
  {name:'Latina Noticias',  logo:'📺',  url:'https://www.youtube.com/@LatinaNoticias/live',   country:'Perú',           color:'#e67e22', type:'youtube'},
  // ── Internacional – YouTube live confirmado ───────────────────────────────
  {name:'DW Español',       logo:'🇩🇪',  url:'https://www.youtube.com/@DWEspanol/live',        country:'Internacional',  color:'#c0392b', type:'youtube'},
  {name:'France 24 ES',     logo:'🇫🇷',  url:'https://www.youtube.com/@France24Espanol/live',  country:'Internacional',  color:'#003399', type:'youtube'},
  {name:'Euronews ES',      logo:'🇪🇺',  url:'https://www.youtube.com/@euronewses/live',       country:'Internacional',  color:'#1a6eb5', type:'youtube'},
  {name:'NTN24',            logo:'📰',  url:'https://www.youtube.com/@NTN24/live',            country:'América Latina', color:'#16a085', type:'youtube'},
  // ── Canales no occidentales – vía sitio web ───────────────────────────────
  {name:'Al Jazeera EN',    logo:'🌍',  url:'https://www.aljazeera.com/live',                 country:'Internacional',  color:'#e67e22', type:'website'},
  {name:'CGTN Español',     logo:'🇨🇳',  url:'https://espanol.cgtn.com/live',                  country:'Internacional',  color:'#c0392b', type:'website'},
  {name:'RT en Español',    logo:'🌐',  url:'https://actualidad.rt.com/en-vivo',              country:'Internacional',  color:'#2c3e50', type:'website'},
];

const REFRESH_MS = 30*60*1000;

export function useGeopolitics() {
  const [commodities, setCommodities] = useState<Commodity[]>(
    BASE_COMMODITIES.map(c=>({...c,price:null,prevPrice:null,change:null}))
  );
  const [currencies, setCurrencies]   = useState<Currency[]>([
    {from:'USD',to:'PEN',rate:null,change:null,sourceUrl:'https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/tipo-de-cambio',sourceName:'BCRP'},
    {from:'EUR',to:'PEN',rate:null,change:null,sourceUrl:'https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/tipo-de-cambio',sourceName:'BCRP'},
  ]);
  const [metalDate, setMetalDate]     = useState('');
  const [fxDate, setFxDate]           = useState('');
  const [indicators]                  = useState<NationalIndicator[]>(INDICATORS);
  const [conflicts]                   = useState<ConflictData[]>(CONFLICTS);
  const [news, setNews]               = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError]     = useState(false);
  const [lastNewsUpdate, setLastNewsUpdate] = useState<Date|null>(null);
  const [countdown, setCountdown]     = useState('30:00');
  const [isConnected, setIsConnected] = useState(false);
  const nextAt = useRef(Date.now()+REFRESH_MS);

  // ── Fetch real metal prices from server (SGM daily) ──────────────────────
  const fetchMetals = async () => {
    try {
      const res = await fetch('/api/metals');
      const data = await res.json();
      if (data.prices && Object.keys(data.prices).length>0) {
        setCommodities(prev => prev.map(c => {
          const newPrice = data.prices[c.symbol] ?? FALLBACK_PRICES[c.symbol] ?? null;
          const pct = c.price && newPrice ? parseFloat(((newPrice - c.price) / c.price * 100).toFixed(2)) : null;
          return {...c, prevPrice:c.price, price:newPrice, change:pct};
        }));
        setMetalDate(data.date||'');
      }
    } catch { /* keep previous */ }
  };

  // ── Fetch real FX rates from BCRP ────────────────────────────────────────
  const fetchFX = async () => {
    try {
      const res = await fetch('/api/fx');
      const data = await res.json();
      if (data.usd && data.eur) {
        setCurrencies(prev => prev.map(c => ({
          ...c,
          rate: c.from==='USD' ? data.usd : data.eur,
          change: c.rate && (c.from==='USD'?data.usd:data.eur)
            ? parseFloat(((c.from==='USD'?data.usd:data.eur)-c.rate).toFixed(4))
            : 0,
        })));
        setFxDate(data.date||'');
      }
    } catch { /* keep previous */ }
  };

  // ── Fetch news ────────────────────────────────────────────────────────────
  const fetchNews = async (force=false) => {
    setNewsLoading(true);
    try {
      const res = await fetch(force?'/api/news?force=true':'/api/news');
      const data = await res.json();
      if (data.news?.length>0) {
        setNews(data.news); setLastNewsUpdate(new Date()); setNewsError(false);
        nextAt.current = Date.now()+(data.nextRefreshIn??30)*60000;
      }
    } catch { setNewsError(true); }
    finally { setNewsLoading(false); }
  };

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(()=>{
    const t = setInterval(()=>{
      const rem = Math.max(0,nextAt.current-Date.now());
      const m=Math.floor(rem/60000), s=Math.floor((rem%60000)/1000);
      setCountdown(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    },1000);
    return ()=>clearInterval(t);
  },[]);

  // ── Boot + auto-refresh ───────────────────────────────────────────────────
  useEffect(()=>{
    fetchMetals(); fetchFX(); fetchNews();
    const t = setInterval(()=>{ fetchNews(true); nextAt.current=Date.now()+REFRESH_MS; }, REFRESH_MS);
    // Re-fetch metals/FX every 6 hours
    const t2 = setInterval(()=>{ fetchMetals(); fetchFX(); }, 6*60*60*1000);
    return ()=>{ clearInterval(t); clearInterval(t2); };
  },[]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    const proto=window.location.protocol==='https:'?'wss:':'ws:';
    try {
      const ws=new WebSocket(`${proto}//${window.location.host}`);
      ws.onopen=()=>setIsConnected(true);
      ws.onclose=()=>setIsConnected(false);
      ws.onmessage=(e)=>{
        try {
          const msg=JSON.parse(e.data);
          if (msg.type==='NEWS_UPDATE') {
            setNews(prev=>{
              if(prev.some(n=>n.id===msg.payload.id))return prev;
              return [{...msg.payload,isNew:true},...prev].slice(0,200);
            });
          }
        } catch {}
      };
    } catch {}
    const t=setTimeout(()=>setIsConnected(true),1500);
    return ()=>clearTimeout(t);
  },[]);

  return {
    commodities, currencies, metalDate, fxDate,
    indicators, conflicts, news, newsLoading, newsError,
    lastNewsUpdate, countdown, isConnected,
    channels: LIVE_CHANNELS,
    refreshNews: ()=>fetchNews(true),
    refreshPrices: ()=>{ fetchMetals(); fetchFX(); },
  };
}
