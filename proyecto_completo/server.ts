import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { conflicts } from "./src/data/conflicts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };

// ─────────────────────────────────────────────────────────────────────────────
// 1. METAL PRICES — SGM Mexico (updates daily, free, no auth)
//    Source: https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales
// ─────────────────────────────────────────────────────────────────────────────
let metalCache: Record<string, number> = {};
let metalCacheDate = '';

function parseSGMPrice(html: string, metalName: string): number | null {
  // SGM page embeds prices in table cells with pattern like: 5 182.40
  // We search for the metal section and grab the first numeric value after it
  const idx = html.indexOf(metalName.toUpperCase());
  if (idx === -1) return null;
  const slice = html.slice(idx, idx + 400);
  // Match numbers like: 5 182.40 or 2 430.00 or 0.855 (remove spaces inside number)
  const match = slice.match(/(\d[\d\s]*[\.,]\d{2,3})/);
  if (!match) return null;
  const clean = match[1].replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

async function fetchMetalPrices(): Promise<Record<string, number>> {
  const today = new Date().toISOString().slice(0, 10);
  if (metalCacheDate === today && Object.keys(metalCache).length > 0) {
    return metalCache;
  }
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch('https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales', {
      signal: ctrl.signal,
      headers: HEADERS,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // SGM provides: Oro (USD/oz), Plata (USD/oz), Cobre (USD/lb), Plomo (USD/lb), Zinc (USD/lb)
    const prices: Record<string, number> = {};

    const auMatch = html.match(/ORO[\s\S]{0,300}?(\d[\d\s]*[.,]\d{2,3})/);
    const agMatch = html.match(/PLATA[\s\S]{0,300}?(\d[\d\s]*[.,]\d{2,3})/);
    const cuMatch = html.match(/COBRE[\s\S]{0,300}?(\d[\d\s]*[.,]\d{2,3})/);
    const pbMatch = html.match(/PLOMO[\s\S]{0,300}?(\d[\d\s]*[.,]\d{2,3})/);
    const znMatch = html.match(/ZINC[\s\S]{0,300}?(\d[\d\s]*[.,]\d{2,3})/);

    const parse = (m: RegExpMatchArray | null) =>
      m ? parseFloat(m[1].replace(/\s/g, '').replace(',', '.')) : null;

    // Convert lb → metric ton for copper, lead, zinc (×2204.62)
    const cuLb  = parse(cuMatch);
    const pbLb  = parse(pbMatch);
    const znLb  = parse(znMatch);

    if (parse(auMatch)) prices['Au'] = parse(auMatch)!;
    if (parse(agMatch)) prices['Ag'] = parse(agMatch)!;
    if (cuLb)           prices['Cu'] = parseFloat((cuLb * 2204.62).toFixed(2));   // USD/T
    if (pbLb)           prices['Pb'] = parseFloat((pbLb * 2204.62).toFixed(2));
    if (znLb)           prices['Zn'] = parseFloat((znLb * 2204.62).toFixed(2));

    if (Object.keys(prices).length > 0) {
      metalCache = prices;
      metalCacheDate = today;
      console.log('[SGM] ✅ Metal prices updated:', prices);
    } else {
      console.warn('[SGM] ⚠️  Could not parse any prices from HTML');
    }
    return prices;
  } catch (e) {
    console.error('[SGM] Fetch error:', e);
    return metalCache; // return last known good
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXCHANGE RATES — BCRP Official JSON API (free, no auth)
//    Docs: https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api
//    USD/PEN venta: PD04638PD | EUR/PEN venta: PD04648PD
// ─────────────────────────────────────────────────────────────────────────────
let fxCache: { usd: number; eur: number; date: string } | null = null;
let fxCacheDate = '';

async function fetchBCRPRates(): Promise<{ usd: number; eur: number; date: string }> {
  const today = new Date().toISOString().slice(0, 10);
  if (fxCacheDate === today && fxCache) return fxCache;

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    // BCRP API: last 5 periods, JSON format
    const res = await fetch(
      'https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04638PD-PD04648PD/json/ultimos%205/esp',
      { signal: ctrl.signal, headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      periods: Array<{ name: string; values: (string | null)[] }>;
    };

    // Get most recent non-null period
    const periods = (data.periods ?? []).filter(
      p => p.values[0] !== null && p.values[1] !== null
    );
    if (periods.length === 0) throw new Error('No valid periods');
    const latest = periods[periods.length - 1];
    const usd = parseFloat(latest.values[0]!);
    const eur = parseFloat(latest.values[1]!);

    fxCache = { usd, eur, date: latest.name };
    fxCacheDate = today;
    console.log('[BCRP] ✅ FX rates updated:', fxCache);
    return fxCache;
  } catch (e) {
    console.error('[BCRP] Fetch error:', e);
    return fxCache ?? { usd: 3.72, eur: 4.01, date: 'N/D' };
  }
}

// Boot fetches
fetchMetalPrices().catch(console.error);
fetchBCRPRates().catch(console.error);

// Refresh metals+FX once per day at midnight
setInterval(() => {
  const h = new Date().getHours();
  if (h === 0) {
    fetchMetalPrices().catch(console.error);
    fetchBCRPRates().catch(console.error);
  }
}, 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// 3. RSS NEWS FEEDS — 24 sources, refreshed every 30 min
// ─────────────────────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  // ── Perú ──────────────────────────────────────────────────────────────────
  { url: 'https://andina.pe/rss/ultimas-noticias.xml',                                                              name: 'ANDINA',          region: 'Perú',           homepage: 'https://andina.pe' },
  { url: 'https://rpp.pe/rss',                                                                                      name: 'RPP',             region: 'Perú',           homepage: 'https://rpp.pe' },
  { url: 'https://ojo-publico.com/feed',                                                                            name: 'OJO PÚBLICO',     region: 'Perú',           homepage: 'https://ojo-publico.com' },
  { url: 'https://news.google.com/rss/search?q=Peru+politica+economia&hl=es-419&gl=PE&ceid=PE:es-419',             name: 'GESTIÓN/COMERCIO',region: 'Perú',           homepage: 'https://news.google.com' },
  // ── Internacional – Occidente ─────────────────────────────────────────────
  { url: 'https://feeds.bbci.co.uk/mundo/rss.xml',                                                                 name: 'BBC MUNDO',       region: 'Internacional',  homepage: 'https://www.bbc.com/mundo' },
  { url: 'https://rss.dw.com/xml/rss-es-all',                                                                      name: 'DW ESPAÑOL',      region: 'Internacional',  homepage: 'https://www.dw.com/es' },
  { url: 'https://www.france24.com/es/rss',                                                                        name: 'FRANCE 24',       region: 'Internacional',  homepage: 'https://www.france24.com/es' },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',                                       name: 'EL PAÍS',         region: 'Internacional',  homepage: 'https://elpais.com' },
  { url: 'https://feeds.euronews.com/news/es',                                                                     name: 'EURONEWS ES',     region: 'Internacional',  homepage: 'https://es.euronews.com' },
  // ── Internacional – No occidental ─────────────────────────────────────────
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',                                                              name: 'AL JAZEERA EN',   region: 'Internacional',  homepage: 'https://www.aljazeera.com' },
  { url: 'https://news.google.com/rss/search?q=Middle+East+geopolitics+war&hl=es-419&gl=PE&ceid=PE:es-419',        name: 'MIDDLE EAST EYE', region: 'Medio Oriente',  homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=China+Asia+Pacific+geopolitics&hl=es-419&gl=PE&ceid=PE:es-419',     name: 'ASIA TIMES',      region: 'Asia',           homepage: 'https://news.google.com' },
  // ── América Latina ─────────────────────────────────────────────────────────
  { url: 'https://www.infobae.com/feeds/rss/america-latina/',                                                      name: 'INFOBAE',         region: 'América Latina', homepage: 'https://www.infobae.com' },
  { url: 'https://news.google.com/rss/search?q=Colombia+Venezuela+Ecuador+Bolivia&hl=es-419&gl=PE&ceid=PE:es-419', name: 'EL TIEMPO CO',    region: 'América Latina', homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=Brasil+Argentina+Chile+Mercosur&hl=es-419&gl=PE&ceid=PE:es-419',    name: 'CLARÍN/FOLHA',    region: 'América Latina', homepage: 'https://news.google.com' },
  // ── Conflictos específicos ─────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=Iran+Israel+Gaza+Medio+Oriente&hl=es-419&gl=PE&ceid=PE:es-419',     name: 'AP/REUTERS',      region: 'Medio Oriente',  homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=Ucrania+Rusia+OTAN+guerra&hl=es-419&gl=PE&ceid=PE:es-419',          name: 'BBC/CNN',         region: 'Europa',         homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=China+Taiwan+Indo+Pacifico&hl=es-419&gl=PE&ceid=PE:es-419',          name: 'REUTERS',         region: 'Asia',           homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=Houthis+Yemen+Mar+Rojo&hl=es-419&gl=PE&ceid=PE:es-419',             name: 'AL JAZEERA',      region: 'Medio Oriente',  homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=Pakistan+Afganistan+Taliban&hl=es-419&gl=PE&ceid=PE:es-419',        name: 'AL JAZEERA',      region: 'Asia del Sur',   homepage: 'https://news.google.com' },
  // ── Economía / Minerales ───────────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=cobre+zinc+oro+precios+LME+minerales&hl=es-419&gl=PE&ceid=PE:es-419', name: 'MINING.COM',    region: 'Economía',       homepage: 'https://news.google.com' },
  { url: 'https://news.google.com/rss/search?q=tipo+cambio+sol+dolar+BCRP+inflacion&hl=es-419&gl=PE&ceid=PE:es-419', name: 'GESTIÓN',       region: 'Economía',       homepage: 'https://news.google.com' },
  // ── Cancillería / Diplomacia ───────────────────────────────────────────────
  { url: 'https://news.google.com/rss/search?q=Peru+cancilleria+relaciones+exteriores+diplomacia&hl=es-419&gl=PE&ceid=PE:es-419', name: 'CANCILLERÍA PE', region: 'Perú', homepage: 'https://www.gob.pe/rree' },
  { url: 'https://news.google.com/rss/search?q=ONU+OEA+CELAC+UNASUR+diplomacia&hl=es-419&gl=PE&ceid=PE:es-419',   name: 'ONU/OEA',         region: 'Internacional',  homepage: 'https://news.google.com' },
];

// ── RSS parser ─────────────────────────────────────────────────────────────────
function extractTag(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`),
    new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`),
  ];
  for (const re of patterns) { const m = xml.match(re); if (m?.[1]?.trim()) return m[1].trim(); }
  return '';
}
function extractAllItems(xml: string): string[] {
  const items: string[] = []; const re = /<item[\s>]([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(xml)) !== null) items.push(m[1]);
  return items;
}
function cleanText(t: string): string {
  return t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
}
function formatTimeAgo(d: Date): string {
  const m = Math.floor((Date.now()-d.getTime())/60000);
  if (isNaN(m)||m<0) return 'Reciente';
  if (m<1) return 'Ahora mismo'; if (m<60) return `Hace ${m} min`;
  const h=Math.floor(m/60); if (h<24) return `Hace ${h} h`;
  return `Hace ${Math.floor(h/24)} días`;
}
function parseRSS(xml: string, name: string, region: string, homepage: string) {
  return extractAllItems(xml).slice(0,8).map((item,i)=>({
    id:`${name.replace(/\s/g,'-')}-${i}-${Date.now()}`,
    headline: cleanText(extractTag(item,'title')).slice(0,200)||'Sin título',
    source: name, sourceHomepage: homepage, region, isNew: i<2,
    time: formatTimeAgo(new Date(extractTag(item,'pubDate')||extractTag(item,'dc:date'))),
    url: (extractTag(item,'link')||extractTag(item,'guid')||homepage).replace(/^(?!http)/,'https://'),
  }));
}

// ── Cache ──────────────────────────────────────────────────────────────────────
let newsCache: any[] = [];
let lastNewsFetch = 0;
const NEWS_TTL = 30*60*1000;

async function fetchOneSource(src: typeof RSS_SOURCES[0]) {
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(),8000);
  try {
    const res = await fetch(src.url,{signal:ctrl.signal,headers:HEADERS});
    if (!res.ok) return [];
    return parseRSS(await res.text(), src.name, src.region, src.homepage);
  } catch { return []; } finally { clearTimeout(t); }
}

async function fetchAllNews(force=false) {
  const now = Date.now();
  if (!force && now-lastNewsFetch<NEWS_TTL && newsCache.length>0) {
    return {news:newsCache,cached:true,nextRefreshIn:Math.round((NEWS_TTL-(now-lastNewsFetch))/60000),lastFetch:new Date(lastNewsFetch).toISOString()};
  }
  console.log('[NEWS] Fetching from',RSS_SOURCES.length,'sources...');
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchOneSource));
  const all: any[] = []; results.forEach(r=>{if(r.status==='fulfilled')all.push(...r.value);});
  const seen = new Set<string>();
  newsCache = all.filter(n=>{const k=n.headline.slice(0,55).toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
  lastNewsFetch = now;
  console.log(`[NEWS] ✅ ${newsCache.length} articles cached`);
  return {news:newsCache,cached:false,nextRefreshIn:30,lastFetch:new Date(now).toISOString()};
}

fetchAllNews(true).catch(console.error);
setInterval(()=>fetchAllNews(true).catch(console.error), NEWS_TTL);

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPRESS + VITE + WEBSOCKET SERVER
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;
  app.use(express.json());

  // ── API endpoints ───────────────────────────────────────────────────────────
  app.get('/api/conflicts', (req, res) => res.json(conflicts));

  app.get('/api/news', async (req, res) => {
    try {
      const result = await fetchAllNews(req.query.force==='true');
      res.json({...result, sources: RSS_SOURCES.map(s=>({name:s.name,region:s.region,homepage:s.homepage}))});
    } catch { res.status(500).json({news:[],error:'Error'}); }
  });

  // Metal prices endpoint (SGM daily)
  app.get('/api/metals', async (req, res) => {
    try {
      const prices = await fetchMetalPrices();
      res.json({prices, date: metalCacheDate, source: 'SGM – Servicio Geológico Mexicano', sourceUrl: 'https://www.sgm.gob.mx/EconomiaMinera/PreciosMinerales'});
    } catch { res.status(500).json({prices:{}}); }
  });

  // BCRP exchange rates endpoint (daily)
  app.get('/api/fx', async (req, res) => {
    try {
      const rates = await fetchBCRPRates();
      res.json({...rates, source: 'BCRP – Banco Central de Reserva del Perú', sourceUrl: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/tipo-de-cambio'});
    } catch { res.status(500).json({usd:3.72,eur:4.01,date:'N/D'}); }
  });

  app.get('/api/status', (req, res) => {
    const now = Date.now();
    res.json({newsCount:newsCache.length, lastFetch:new Date(lastNewsFetch).toISOString(), nextRefreshIn:Math.max(0,Math.round((NEWS_TTL-(now-lastNewsFetch))/60000)), sources:RSS_SOURCES.length});
  });

  // ── WebSocket broadcast ─────────────────────────────────────────────────────
  const broadcast = (data: any) =>
    wss.clients.forEach(c=>{if(c.readyState===WebSocket.OPEN) c.send(JSON.stringify(data));});

  setInterval(async ()=>{
    try {
      if (newsCache.length>0) broadcast({type:'NEWS_UPDATE',payload:newsCache[Math.floor(Math.random()*Math.min(10,newsCache.length))]});
    } catch {}
  }, 20000);

  // ── Vite middleware ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({server:{middlewareMode:true},appType:'spa'});
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname,'dist')));
    app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'dist','index.html')));
  }

  server.listen(PORT,'0.0.0.0',()=>console.log(`✅ Monitor Perú → http://localhost:${PORT}`));
}

startServer();
