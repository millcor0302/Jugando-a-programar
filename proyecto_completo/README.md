# Monitor Perú — Inteligencia Geopolítica v2.0

## Instalación

1. Instala Node.js desde https://nodejs.org (botón LTS)
2. Abre esta carpeta en cmd: haz clic en la barra de direcciones → escribe `cmd` → Enter
3. Ejecuta:
   ```
   npm install
   npm run dev
   ```
4. Abre: **http://localhost:3000**

## Fuentes de datos reales

| Dato | Fuente | Actualización |
|------|--------|---------------|
| Oro, Plata, Cobre, Plomo, Zinc | SGM – sgm.gob.mx | Diaria |
| USD/PEN, EUR/PEN | BCRP – API oficial | Diaria |
| Noticias RSS | BBC, DW, France 24, Andina, RPP, Ojo Público, Al Jazeera, Infobae, Google News | Cada 30 min |

## Notas
- Molibdeno, Hierro, Estaño: valores de referencia (MINEM/LME)
- Indicadores macroeconómicos (PBI, desempleo, inflación): datos BCRP/INEI más recientes
- TV en vivo: canales con transmisión gratuita confirmada (YouTube y sitios web)
