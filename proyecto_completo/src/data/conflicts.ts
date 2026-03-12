export type ConflictStatus = 'crítico' | 'escalada' | 'estable' | 'latente';

export const ESCALATION_TERMS = ['ruptura diplomática','expulsión','estado de emergencia','movilización militar','ataque','bombardeo','misil','invasión','represalia','sanción','ultimátum','guerra','operación militar','alto el fuego','crisis','dron','evacuación','emergencia'];
export const WHITELIST_DOMAINS = ['reuters.com','bbc.com','bbc.co.uk','apnews.com','aljazeera.com','france24.com','euronews.com','gob.pe','un.org','rree.gob.pe','state.gov','theguardian.com','dw.com','elpais.com','infobae.com'];

export interface Conflict {
  id: string; title: string; region: string; parties: string[];
  status: ConflictStatus; riskLevel: number; coordinates: [number, number];
  lastUpdate: string; summary: string;
}

export const conflicts: Conflict[] = [
  { id:'russia-ukraine', title:'Guerra Rusia–Ucrania', region:'Europa Oriental', parties:['Rusia','Ucrania','OTAN'], status:'crítico', riskLevel:95, coordinates:[49.5,32.0], lastUpdate:'Hace 1 hora', summary:'Conflicto bélico activo desde febrero 2022.' },
  { id:'israel-palestina', title:'Conflicto Israel–Gaza', region:'Medio Oriente', parties:['Israel','Hamas'], status:'crítico', riskLevel:93, coordinates:[31.4,34.4], lastUpdate:'Hace 30 min', summary:'Operaciones militares activas en Gaza desde oct. 2023.' },
  { id:'iran-israel', title:'Confrontación Irán–Israel', region:'Medio Oriente', parties:['Irán','Israel'], status:'crítico', riskLevel:88, coordinates:[33.0,44.0], lastUpdate:'Hace 2 h', summary:'Primera confrontación directa histórica con misiles y drones.' },
  { id:'usa-iran', title:'Tensión USA–Irán', region:'Golfo Pérsico', parties:['EEUU','Irán'], status:'escalada', riskLevel:75, coordinates:[26.0,54.0], lastUpdate:'Hace 3 h', summary:'Tensiones por programa nuclear iraní.' },
  { id:'houthis-red-sea', title:'Houthis – Mar Rojo', region:'Yemen', parties:['Houthis','EEUU'], status:'escalada', riskLevel:80, coordinates:[14.5,43.0], lastUpdate:'Hace 4 h', summary:'Ataques sistemáticos a buques comerciales en el Mar Rojo.' },
  { id:'china-taiwan', title:'Crisis Estrecho de Taiwán', region:'Indo-Pacífico', parties:['China','Taiwán'], status:'escalada', riskLevel:70, coordinates:[23.7,120.5], lastUpdate:'Hace 5 h', summary:'Maniobras militares chinas en el Estrecho de Taiwán.' },
  { id:'pakistan-afghanistan', title:'Pakistán–Afganistán', region:'Asia del Sur', parties:['Pakistán','Taliban'], status:'escalada', riskLevel:72, coordinates:[32.5,68.5], lastUpdate:'Hace 6 h', summary:'Ataques del TTP desde territorio afgano.' },
  { id:'iran-saudi', title:'Rivalidad Irán–Arabia Saudita', region:'Golfo Pérsico', parties:['Irán','Arabia Saudita'], status:'estable', riskLevel:40, coordinates:[24.5,47.0], lastUpdate:'Hace 1 día', summary:'Rivalidad histórica; acuerdo de normalización chino en 2023.' },
];
