import React, { useState, useCallback, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { GeoLocation, ComputedRoute, RouteOption } from '../types';
import {
  Clock, Shield, Bell, Send, Trash2, ChevronRight, Loader2,
  MapPinned, Flag, Bus, Footprints, AlertTriangle, Eye, EyeOff,
  Upload, FileCheck, X, Sparkles, Brain, Lightbulb, ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocationInput } from './LocationInput';
import { RouteMap } from './RouteMap';
import { computeRoutes, formatDuration, formatDistance } from '../services/routing';
import {
  analyzeRouteSafety, recommendRoute, generateTripMessage,
  isGeminiAvailable, type AIRouteRecommendation,
} from '../services/gemini';

const ROUTE_TYPE_INFO: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  fast: { label: 'Più Veloce', color: 'text-blue-700', icon: <Footprints className="w-4 h-4" />, bg: 'bg-blue-50 border-blue-200' },
  safe: { label: 'Più Sicuro', color: 'text-emerald-700', icon: <Shield className="w-4 h-4" />, bg: 'bg-emerald-50 border-emerald-200' },
  bus:  { label: 'Bus AMTAB', color: 'text-amber-700', icon: <Bus className="w-4 h-4" />, bg: 'bg-amber-50 border-amber-200' },
};

function getSafetyColor(score: number): string {
  if (score >= 80) return 'text-emerald-700 bg-emerald-100';
  if (score >= 60) return 'text-yellow-700 bg-yellow-100';
  if (score >= 40) return 'text-orange-700 bg-orange-100';
  return 'text-red-700 bg-red-100';
}

export const ParentView: React.FC = () => {
  const {
    assignTrip, notifications, clearNotifications, activeTrip,
    childGPSPosition, travelDocument, setTravelDocument, addNotification,
  } = useAppContext();
  const [departureLocation, setDepartureLocation] = useState<GeoLocation | null>(null);
  const [arrivalLocation, setArrivalLocation] = useState<GeoLocation | null>(null);
  const [time, setTime] = useState('');
  const [computedRoutes, setComputedRoutes] = useState<ComputedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBusStops, setShowBusStops] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIRouteRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureLocation || !arrivalLocation) {
      setError('Seleziona partenza e arrivo dai suggerimenti');
      return;
    }

    setIsComputing(true);
    setError(null);
    setComputedRoutes([]);
    setSelectedRouteId(null);
    setAiRecommendation(null);

    try {
      const routes = await computeRoutes(departureLocation, arrivalLocation);
      if (routes.length === 0) {
        setError('Nessun percorso trovato. Prova con indirizzi diversi.');
      } else {
        setComputedRoutes(routes);
        setSelectedRouteId(routes[0].id);

        // Launch AI analysis in background (non-blocking)
        if (isGeminiAvailable()) {
          setAiLoading(true);
          runAIAnalysis(routes);
        }
      }
    } catch (err) {
      console.error('Routing error:', err);
      setError('Errore nel calcolo del percorso. Riprova.');
    } finally {
      setIsComputing(false);
    }
  }, [departureLocation, arrivalLocation]);

  // ── AI analysis pipeline (runs in background) ──
  const runAIAnalysis = useCallback(async (routes: ComputedRoute[]) => {
    try {
      // 1. Analyze each route's safety in parallel
      const analysisPromises = routes.map(r => analyzeRouteSafety(r));
      const analyses = await Promise.all(analysisPromises);

      // Attach AI analysis to routes
      setComputedRoutes(prev => prev.map((r, i) => {
        const analysis = analyses[i];
        if (analysis) {
          return { ...r, aiAnalysis: analysis };
        }
        return r;
      }));

      // 2. Get overall recommendation
      const rec = await recommendRoute(routes);
      if (rec) {
        setAiRecommendation(rec);
        // Auto-select the AI-recommended route
        setSelectedRouteId(rec.recommendedRouteId);
      }
    } catch (err) {
      console.error('[AI] Analysis pipeline error:', err);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleAssignRoute = (route: ComputedRoute) => {
    if (!travelDocument) {
      setError('Devi prima caricare il documento di autorizzazione al viaggio autonomo.');
      return;
    }
    const routeOption: RouteOption = {
      id: route.id,
      estimatedTime: formatDuration(route.totalDuration),
      safetyScore: route.safetyScore,
      departure: route.departure.name,
      arrival: route.arrival.name,
      time: time || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      computedRoute: route,
    };
    assignTrip(routeOption);
    setComputedRoutes([]);
    setSelectedRouteId(null);
    setAiRecommendation(null);

    // Generate AI personalized message for trip start
    if (isGeminiAvailable()) {
      generateTripMessage({
        event: 'trip_assigned',
        departure: route.departure.name,
        arrival: route.arrival.name,
        safetyScore: route.aiAnalysis?.adjustedScore ?? route.safetyScore,
      }).then(msg => {
        if (msg) {
          addNotification(`🤖 AI: ${msg.parentMsg}`, 'INFO');
        }
      });
    }
  };

  const selectedRoute = computedRoutes.find(r => r.id === selectedRouteId);

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTravelDocument({
        name: file.name,
        dataUrl: reader.result as string,
        uploadedAt: new Date(),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Genitore</h1>
        <p className="text-slate-500 text-sm">Pianifica percorsi sicuri per tuo figlio a Bari</p>
      </header>

      <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Travel Authorization Document */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            Autorizzazione Viaggio Autonomo
          </h2>
          {travelDocument ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <FileCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800 truncate">{travelDocument.name}</p>
                <p className="text-xs text-emerald-600">
                  Caricato il {travelDocument.uploadedAt.toLocaleDateString('it-IT')} alle {travelDocument.uploadedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setTravelDocument(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500 mb-3">
                Carica il documento che attesta che tuo figlio può viaggiare da solo (PDF, JPG, PNG).
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleDocumentUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-indigo-300 rounded-xl p-6 flex flex-col items-center gap-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-semibold">Carica Documento</span>
                <span className="text-xs text-slate-400">PDF, JPG, PNG — max 10MB</span>
              </button>
            </div>
          )}
        </section>

        {/* Trip Planning Form */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            Pianifica Nuovo Viaggio
          </h2>
          <form onSubmit={handleSearch} className="space-y-3">
            <LocationInput
              placeholder="Partenza (es. Piazza Umberto, Via Sparano...)"
              value={departureLocation}
              onChange={setDepartureLocation}
              icon={<MapPinned className="w-5 h-5 text-emerald-600" />}
            />
            <LocationInput
              placeholder="Arrivo (es. Scuola Marconi, Parco 2 Giugno...)"
              value={arrivalLocation}
              onChange={setArrivalLocation}
              icon={<Flag className="w-5 h-5 text-red-500" />}
            />
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isComputing || !departureLocation || !arrivalLocation}
              className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isComputing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Calcolo percorsi sicuri...
                </>
              ) : (
                'Cerca Percorsi'
              )}
            </button>
          </form>
        </section>

        {/* Map */}
        {(departureLocation || arrivalLocation || computedRoutes.length > 0) && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">Mappa</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showHeatmap ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {showHeatmap ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  Rischio
                </button>
                <button
                  onClick={() => setShowBusStops(!showBusStops)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showBusStops ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Bus className="w-3 h-3" />
                  Fermate
                </button>
              </div>
            </div>
            <RouteMap
              routes={computedRoutes}
              selectedRouteId={selectedRouteId}
              departure={departureLocation}
              arrival={arrivalLocation}
              showHeatmap={showHeatmap}
              showBusStops={showBusStops}
              height="350px"
            />
          </section>
        )}

        {/* AI Recommendation Card */}
        {(aiLoading || aiRecommendation) && computedRoutes.length > 0 && (
          <section className="relative overflow-hidden">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-3xl p-5">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-violet-900">
                <Brain className="w-5 h-5 text-violet-600" />
                Analisi AI
                <span className="text-[10px] bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-bold uppercase">Gemini</span>
              </h2>

              {aiLoading && !aiRecommendation ? (
                <div className="flex items-center gap-3 text-sm text-violet-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisi in corso dei percorsi...</span>
                </div>
              ) : aiRecommendation ? (
                <div className="space-y-3">
                  <p className="text-sm text-violet-800 leading-relaxed">
                    <Sparkles className="w-3.5 h-3.5 inline mr-1 text-violet-500" />
                    {aiRecommendation.reasoning}
                  </p>
                  <div className="bg-white/60 rounded-xl p-3 border border-violet-100">
                    <p className="text-xs font-semibold text-violet-600 uppercase mb-1">Valutazione orario</p>
                    <p className="text-sm text-slate-700">{aiRecommendation.overallAssessment}</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3 border border-violet-100">
                    <p className="text-xs font-semibold text-violet-600 uppercase mb-1">Messaggio per il ragazzo</p>
                    <p className="text-sm text-slate-700">{aiRecommendation.childBriefing}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Route Cards */}
        <AnimatePresence>
          {computedRoutes.length > 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold px-1">Percorsi Trovati</h2>
              {computedRoutes.map((route) => {
                const typeInfo = ROUTE_TYPE_INFO[route.type] || ROUTE_TYPE_INFO.fast;
                const isSelected = route.id === selectedRouteId;

                return (
                  <motion.div
                    key={route.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`bg-white p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all ${
                      isSelected ? typeInfo.bg : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Route header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getSafetyColor(route.safetyScore)}`}>
                          <Shield className="w-3 h-3" />
                          {route.safetyScore}/100
                        </span>
                        {route.aiAnalysis && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getSafetyColor(route.aiAnalysis.adjustedScore)}`}>
                            <Brain className="w-3 h-3" />
                            AI: {route.aiAnalysis.adjustedScore}/100
                          </span>
                        )}
                        {aiRecommendation?.recommendedRouteId === route.id && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-violet-100 text-violet-700">
                            <Sparkles className="w-3 h-3" />
                            Consigliato
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-bold text-slate-800">{formatDuration(route.totalDuration)}</span>
                    </div>

                    {/* Route details */}
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-1">
                      <span>{formatDistance(route.totalDistance)}</span>
                      <span>•</span>
                      <span>{route.steps.length} passi</span>
                      {route.busSegments && route.busSegments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-700 font-medium">
                            <Bus className="w-3 h-3" />
                            Linea {route.busSegments[0].line}
                          </span>
                        </>
                      )}
                    </div>

                    {/* AI Score Explanation */}
                    {route.aiAnalysis?.scoreExplanation && (
                      <p className="text-[11px] text-slate-500 italic leading-snug mb-3 pl-0.5">
                        <Brain className="w-3 h-3 inline mr-1 text-violet-400" />
                        {route.aiAnalysis.scoreExplanation}
                      </p>
                    )}

                    {/* Warnings */}
                    {route.warnings.length > 0 && isSelected && (
                      <div className="mb-3 space-y-1">
                        {route.warnings.map((w, i) => {
                          const explanation = route.aiAnalysis?.warningExplanations?.[w];
                          return (
                            <div key={i}>
                              <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-lg">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {w}
                              </div>
                              {explanation && (
                                <p className="text-[10px] text-orange-600/70 italic leading-snug ml-5 mt-0.5 mb-1">
                                  {explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Analysis Details */}
                    {route.aiAnalysis && isSelected && (
                      <div className="mb-3 bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-violet-600 uppercase flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          Analisi AI
                        </p>
                        <p className="text-xs text-violet-800">{route.aiAnalysis.recommendation}</p>
                        {route.aiAnalysis.risks.length > 0 && (
                          <div className="space-y-1">
                            {route.aiAnalysis.risks.map((risk, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                                <ShieldAlert className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                {risk}
                              </div>
                            ))}
                          </div>
                        )}
                        {route.aiAnalysis.tips.length > 0 && (
                          <div className="space-y-1">
                            {route.aiAnalysis.tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-700">
                                <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                {tip}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Steps preview (when selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Indicazioni</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {route.steps.slice(0, 8).map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                step.type === 'bus' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {step.type === 'bus' ? <Bus className="w-3 h-3" /> : <span className="text-[9px] font-bold">{i + 1}</span>}
                              </div>
                              <div>
                                <p className="text-slate-700">{step.instruction}</p>
                                <p className="text-slate-400">{formatDistance(step.distance)}</p>
                              </div>
                            </div>
                          ))}
                          {route.steps.length > 8 && (
                            <p className="text-xs text-slate-400 pl-7">...e altri {route.steps.length - 8} passi</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Assign button */}
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignRoute(route);
                        }}
                        disabled={!!activeTrip}
                        className={`mt-3 w-full px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                          activeTrip
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                        }`}
                      >
                        {activeTrip ? 'Viaggio in corso' : 'Assegna al Figlio'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Active Trip Banner with Live GPS Tracking */}
        {activeTrip && activeTrip.route.computedRoute && (
          <section className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              Viaggio in Corso — Tracking Live
            </h2>
            <p className="text-sm text-indigo-700">
              {activeTrip.route.departure} → {activeTrip.route.arrival}
            </p>
            <p className="text-xs text-indigo-500 mt-1">
              Sicurezza: {activeTrip.route.safetyScore}/100 — {activeTrip.route.estimatedTime}
              {activeTrip.hasBus && ' — 🚌 Include bus'}
            </p>

            {childGPSPosition && (
              <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-lg w-fit">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                📍 GPS: {childGPSPosition[0].toFixed(5)}, {childGPSPosition[1].toFixed(5)}
              </div>
            )}

            <RouteMap
              routes={[activeTrip.route.computedRoute]}
              selectedRouteId={activeTrip.route.computedRoute.id}
              departure={activeTrip.route.computedRoute.departure}
              arrival={activeTrip.route.computedRoute.arrival}
              childPosition={childGPSPosition}
              height="300px"
            />
          </section>
        )}

        {/* Notification Center */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Centro Notifiche
            </h2>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p>Nessuna notifica recente</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 flex gap-4 ${notif.type === 'ALERT' ? 'bg-red-50' : ''}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      notif.type === 'ALERT' ? 'bg-red-500' :
                      notif.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm ${notif.type === 'ALERT' ? 'text-red-900 font-semibold' : 'text-slate-700'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {notif.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
