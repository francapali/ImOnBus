/**
 * Gemini AI integration for SafeStep.
 * Provides AI-enhanced safety analysis, route recommendations,
 * and personalized messages for parents and children.
 */
import { GoogleGenAI } from '@google/genai';
import { ComputedRoute } from '../types';

// ── Initialize Gemini ──

const API_KEY = process.env.GEMINI_API_KEY || '';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const MODEL = 'gemini-2.0-flash';

// ── Types ──

export interface AIRouteAnalysis {
  adjustedScore: number;       // AI-refined safety score 0-100
  recommendation: string;      // Why this route is/isn't recommended
  risks: string[];             // Specific risk factors identified
  tips: string[];              // Safety tips for this route
  scoreExplanation: string;    // Brief (max 40 words) explanation of why the score is what it is
  warningExplanations: Record<string, string>; // Map warning name → brief explanation (max 40 words each)
}

export interface AIRouteRecommendation {
  recommendedRouteId: string;
  reasoning: string;           // Explanation for parent
  childBriefing: string;       // Simple instructions for the child
  overallAssessment: string;   // General safety assessment
}

// ── Cache to avoid duplicate calls ──

const analysisCache = new Map<string, AIRouteAnalysis>();
const recommendationCache = new Map<string, AIRouteRecommendation>();

// ── Helper: extract route summary for prompts ──

function routeToSummary(route: ComputedRoute): string {
  const streets = route.steps.map(s => s.name).filter(Boolean);
  const uniqueStreets = [...new Set(streets)].slice(0, 10);
  const busInfo = route.busSegments?.length
    ? `Include tratto in bus AMTAB Linea ${route.busSegments[0].line} (${route.busSegments[0].from.name} → ${route.busSegments[0].to.name}).`
    : 'Solo a piedi.';

  return `
Tipo: ${route.type === 'fast' ? 'Più veloce' : route.type === 'safe' ? 'Più sicuro' : 'Bus'}
Distanza: ${(route.totalDistance / 1000).toFixed(1)} km
Durata stimata: ${Math.round(route.totalDuration / 60)} minuti
Punteggio sicurezza (algoritmico): ${route.safetyScore}/100
Strade attraversate: ${uniqueStreets.join(', ') || 'N/A'}
${busInfo}
Avvisi zone a rischio: ${route.warnings.length > 0 ? route.warnings.join('; ') : 'Nessuno'}
Partenza: ${route.departure.displayName}
Arrivo: ${route.arrival.displayName}
`.trim();
}

// ── Analyze a single route's safety with AI ──

export async function analyzeRouteSafety(route: ComputedRoute): Promise<AIRouteAnalysis | null> {
  if (!ai) return null;

  const cacheKey = route.id;
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey)!;

  try {
    const prompt = `Sei un esperto di sicurezza urbana e mobilità pedonale a Bari, Italia. Il tuo compito è valutare la sicurezza di un percorso che un ragazzo di circa 13 anni farebbe da solo.

DATI DEL PERCORSO:
${routeToSummary(route)}

CONTESTO BARI:
- Le zone vicino alla Stazione Ferroviaria sono note per microcriminalità e scarsa illuminazione
- Bari Vecchia ha strade strette con scarsa visibilità, ma è più sicura di giorno
- Piazza Umberto I e Piazza Cesare Battisti hanno alto traffico veicolare
- Le zone periferiche (Japigia, San Paolo, San Girolamo) hanno strade più larghe ma meno passanti
- I dati sono basati su incidenti stradali 2017 e 2023 e un questionario sulla percezione di sicurezza

Rispondi SOLO con un JSON valido (senza markdown, senza backtick) con questa struttura:
{
  "adjustedScore": <numero 0-100, tua valutazione raffinata>,
  "recommendation": "<1-2 frasi: perché questo percorso è/non è adatto a un ragazzo>",
  "risks": ["<rischio specifico 1>", "<rischio specifico 2>"],
  "tips": ["<consiglio pratico 1>", "<consiglio pratico 2>"],
  "scoreExplanation": "<MASSIMO 40 PAROLE: spiega brevemente perché il punteggio è quello che è, citando i fattori principali (strade percorse, traffico, illuminazione, zone a rischio)>",
  "warningExplanations": {
    "<testo esatto avviso 1>": "<MASSIMO 40 PAROLE: perché questo punto specifico è pericoloso per un ragazzo, cerca informazioni reali sulla zona>",
    "<testo esatto avviso 2>": "<MASSIMO 40 PAROLE: idem>"
  }
}

IMPORTANTE: warningExplanations deve avere come chiavi esattamente i testi degli avvisi elencati sopra in "Avvisi zone a rischio". Se non ci sono avvisi, usa un oggetto vuoto {}. Ogni spiegazione deve essere MASSIMO 40 parole, concisa e informativa, basata su dati reali della città di Bari.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    // Parse JSON, remove potential markdown wrapping
    const jsonStr = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(jsonStr) as AIRouteAnalysis;

    // Validate
    parsed.adjustedScore = Math.max(0, Math.min(100, Math.round(parsed.adjustedScore)));
    parsed.risks = parsed.risks?.slice(0, 5) || [];
    parsed.tips = parsed.tips?.slice(0, 5) || [];
    parsed.scoreExplanation = parsed.scoreExplanation || '';
    parsed.warningExplanations = parsed.warningExplanations || {};

    analysisCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error('[Gemini] analyzeRouteSafety error:', err);
    return null;
  }
}

// ── Recommend the best route from multiple options ──

export async function recommendRoute(routes: ComputedRoute[]): Promise<AIRouteRecommendation | null> {
  if (!ai || routes.length === 0) return null;

  const cacheKey = routes.map(r => r.id).sort().join('|');
  if (recommendationCache.has(cacheKey)) return recommendationCache.get(cacheKey)!;

  try {
    const routeSummaries = routes.map((r, i) => `--- PERCORSO ${i + 1} (ID: ${r.id}) ---\n${routeToSummary(r)}`).join('\n\n');

    const now = new Date();
    const hour = now.getHours();
    const timeContext = hour < 8 ? 'prima mattina (poca luce)' :
                        hour < 12 ? 'mattina' :
                        hour < 14 ? 'ora di pranzo' :
                        hour < 17 ? 'pomeriggio' :
                        hour < 20 ? 'tardo pomeriggio (luce calante)' :
                        'sera (buio)';

    const prompt = `Sei SafeStep AI, assistente per la sicurezza dei ragazzi a Bari. Un genitore sta scegliendo un percorso per il figlio (circa 13 anni) che viaggerà da solo.

ORA ATTUALE: ${now.toLocaleTimeString('it-IT')} (${timeContext})

PERCORSI DISPONIBILI:
${routeSummaries}

CRITERI DI VALUTAZIONE (in ordine di priorità):
1. SICUREZZA: meno zone a rischio attraversate = meglio
2. BREVITÀ: meno tempo in strada = meno esposizione al rischio
3. SEMPLICITÀ: meno svolte e cambi = meno probabilità di perdersi
4. ILLUMINAZIONE/VISIBILITÀ: strade principali vs vicoli
5. SORVEGLIANZA SOCIALE: zone con più passanti = più sicure

Rispondi SOLO con un JSON valido (senza markdown, senza backtick):
{
  "recommendedRouteId": "<ID del percorso raccomandato>",
  "reasoning": "<2-3 frasi: spiegazione per il genitore del perché questo è il migliore>",
  "childBriefing": "<1-2 frasi semplici: cosa dire al ragazzo per rassicurarlo e dargli le dritte principali>",
  "overallAssessment": "<1 frase: valutazione generale della zona/orario>"
}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    const jsonStr = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(jsonStr) as AIRouteRecommendation;

    // Validate the recommended route ID exists
    if (!routes.find(r => r.id === parsed.recommendedRouteId)) {
      parsed.recommendedRouteId = routes[0].id;
    }

    recommendationCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error('[Gemini] recommendRoute error:', err);
    return null;
  }
}

// ── Generate personalized messages ──

export type TripEvent =
  | 'trip_assigned'
  | 'child_walking'
  | 'child_on_bus'
  | 'child_arrived_stop'
  | 'child_walking_final'
  | 'child_arrived'
  | 'speed_alert'
  | 'stopped_alert'
  | 'deviation_alert'
  | 'battery_low'
  | 'sos';

interface TripEventContext {
  event: TripEvent;
  departure: string;
  arrival: string;
  safetyScore: number;
  currentStreet?: string;
  childName?: string;
}

export async function generateTripMessage(ctx: TripEventContext): Promise<{ parentMsg: string; childMsg: string } | null> {
  if (!ai) return null;

  try {
    const childName = ctx.childName || 'tuo figlio';

    const prompt = `Sei SafeStep AI. Genera messaggi brevi e rassicuranti per un'app di monitoraggio ragazzi a Bari.

EVENTO: ${ctx.event}
VIAGGIO: ${ctx.departure} → ${ctx.arrival}
SICUREZZA PERCORSO: ${ctx.safetyScore}/100
${ctx.currentStreet ? `POSIZIONE ATTUALE: ${ctx.currentStreet}` : ''}

Genera due messaggi (1 frase ciascuno):
- parentMsg: per il GENITORE (informativo, rassicurante ma onesto)
- childMsg: per il RAGAZZO (semplice, incoraggiante, con emoji)

Contesto eventi:
- trip_assigned: viaggio appena assegnato
- child_walking: ragazzo sta camminando
- child_on_bus: ragazzo è salito sul bus
- child_arrived_stop: ragazzo sceso dal bus
- child_walking_final: ultimo tratto a piedi
- child_arrived: arrivato a destinazione
- speed_alert: velocità anomala rilevata
- stopped_alert: fermo da troppo tempo
- deviation_alert: fuori percorso
- battery_low: batteria scarica
- sos: emergenza

Rispondi SOLO con JSON valido (senza markdown):
{"parentMsg": "...", "childMsg": "..."}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) return null;

    const jsonStr = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(jsonStr) as { parentMsg: string; childMsg: string };
  } catch (err) {
    console.error('[Gemini] generateTripMessage error:', err);
    return null;
  }
}

// ── Check if Gemini is available ──

export function isGeminiAvailable(): boolean {
  return !!ai;
}
