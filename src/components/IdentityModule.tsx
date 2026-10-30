import { useState } from 'react';
import { Check, CheckCircle2, ChevronRight, Compass, Music, ShieldCheck } from 'lucide-react';
import {
  HYMN_STANZAS,
  IDENTITY_IMAGE_PATH,
  INSTITUTIONAL_VALUES,
  SYMBOL_HOTSPOTS,
  SymbolHotspot,
} from '../data/senaContent';
import type { InductionModuleId } from '../lib/validation';
import { ResilientImage } from './ResilientImage';
import { SenaEscudo, SenaLogo } from './SenaLogo';

interface IdentityModuleProps {
  completedModules: InductionModuleId[];
  onToggleComplete: (moduleId: InductionModuleId) => void;
  onGoToNext: () => void;
}

type ActiveSubStage = 'simbolos' | 'himno' | 'valores';

export function IdentityModule({
  completedModules,
  onToggleComplete,
  onGoToNext,
}: IdentityModuleProps) {
  const [subStage, setSubStage] = useState<ActiveSubStage>('simbolos');
  const [selectedSymbolId, setSelectedSymbolId] =
    useState<SymbolHotspot['id']>('logosimbolo');
  const [symbolAnswers, setSymbolAnswers] = useState<Record<string, number>>({});
  const [selectedStanzaId, setSelectedStanzaId] = useState<string>(HYMN_STANZAS[0].id);
  const [selectedValueIndex, setSelectedValueIndex] = useState<number>(0);
  const [valueChoices, setValueChoices] = useState<Record<string, number>>({});

  const activeSymbol =
    SYMBOL_HOTSPOTS.find((s) => s.id === selectedSymbolId) ?? SYMBOL_HOTSPOTS[0];
  const activeStanza =
    HYMN_STANZAS.find((h) => h.id === selectedStanzaId) ?? HYMN_STANZAS[0];
  const activeValue = INSTITUTIONAL_VALUES[selectedValueIndex];

  const isIdentityDone = completedModules.includes('identidad');
  const isValuesDone = completedModules.includes('valores');

  const selectedAnswerIdx = symbolAnswers[activeSymbol.id];
  const isSymbolVerified = selectedAnswerIdx === activeSymbol.verificationQuestion.correctIndex;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      {/* Editorial Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <SenaLogo className="w-5 h-5" />
            <span>Módulo 01</span>
            <span aria-hidden="true">·</span>
            <span>Identidad, Símbolos y Código de Integridad</span>
            <span aria-hidden="true">·</span>
            <span>Decreto-Ley 118 de 1957</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight balance-text">
            Valor e Imagen Institucional del SENA
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Explora interactivamente los emblemas que representan a los sectores productivos de Colombia, el sentido humano de la Formación Profesional Integral y los valores éticos que guían tu paso por el Centro de Formación.
          </p>
        </div>

        {/* Interactive Stage Selector (Functional Segmented Buttons) */}
        <div
          role="tablist"
          aria-label="Secciones de Identidad y Valores"
          className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subStage === 'simbolos'}
            onClick={() => setSubStage('simbolos')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subStage === 'simbolos'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            01. Símbolos y Escudo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subStage === 'himno'}
            onClick={() => setSubStage('himno')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subStage === 'himno'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            02. Himno Institucional
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subStage === 'valores'}
            onClick={() => setSubStage('valores')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subStage === 'valores'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            03. Valores de Integridad
          </button>
        </div>
      </div>

      {/* SUB-STAGE 1: TWO-ZONE INTERACTIVE SYMBOLS SANDBOX */}
      {subStage === 'simbolos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Interactive Visual Stage (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Inspector de Símbolos Institucionales
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Selecciona cada elemento sobre el lienzo o en los controles para inspeccionar su significado productivo.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Elemento {SYMBOL_HOTSPOTS.findIndex((s) => s.id === selectedSymbolId) + 1} / 4
              </span>
            </div>

            {/* Interactive Dual-Emblem Stage: Official Escudo + Official Logosímbolo */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Left Emblem: Official Escudo del SENA with Interactive Anatomical Pins */}
                <div
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-5 flex flex-col justify-between transition-colors ${
                    selectedSymbolId !== 'logosimbolo'
                      ? 'border-[#15803d] dark:border-[#39A900] ring-1 ring-[#15803d]/20 dark:ring-[#39A900]/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Escudo y Bandera Oficial
                    </span>
                    <span>3 Sectores Económicos</span>
                  </div>

                  <div className="relative py-5 flex items-center justify-center min-h-[230px]">
                    <div className="dark:bg-slate-100 dark:rounded-xl dark:px-4 dark:py-2 transition-colors">
                      <SenaEscudo
                        alt="Escudo oficial del SENA con Caduceo, Piñón y Rama de Cafeto"
                        className="w-44 h-48 sm:w-48 sm:h-52 object-contain select-none"
                      />
                    </div>

                    {/* Hotspot 1: Caduceo (Top Wings & Central Staff) */}
                    <button
                      type="button"
                      onClick={() => setSelectedSymbolId('caduceo')}
                      aria-label="Inspeccionar Caduceo - Sector Comercio y Servicios"
                      className={`absolute top-3 right-2 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedSymbolId === 'caduceo'
                          ? 'bg-[#15803d] dark:bg-[#16a34a] text-white border-[#15803d] dark:border-[#16a34a] shadow-xs'
                          : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400'
                      }`}
                    >
                      01. Caduceo
                    </button>

                    {/* Hotspot 2: Piñón (Red Cogwheel Ring) */}
                    <button
                      type="button"
                      onClick={() => setSelectedSymbolId('piñon')}
                      aria-label="Inspeccionar Piñón - Sector Industria y Construcción"
                      className={`absolute top-1/2 -translate-y-1/2 left-1 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedSymbolId === 'piñon'
                          ? 'bg-[#15803d] dark:bg-[#16a34a] text-white border-[#15803d] dark:border-[#16a34a] shadow-xs'
                          : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400'
                      }`}
                    >
                      02. Piñón
                    </button>

                    {/* Hotspot 3: Rama de Cafeto (Bottom Coffee Branches) */}
                    <button
                      type="button"
                      onClick={() => setSelectedSymbolId('cafeto')}
                      aria-label="Inspeccionar Rama de Cafeto - Sector Primario y Extractivo"
                      className={`absolute bottom-2 right-2 px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedSymbolId === 'cafeto'
                          ? 'bg-[#15803d] dark:bg-[#16a34a] text-white border-[#15803d] dark:border-[#16a34a] shadow-xs'
                          : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400'
                      }`}
                    >
                      03. Cafeto
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Haz clic en cada parte del Escudo para analizar su sector
                  </p>
                </div>

                {/* Right Emblem: Official Logosímbolo del SENA */}
                <button
                  type="button"
                  onClick={() => setSelectedSymbolId('logosimbolo')}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-5 flex flex-col justify-between text-left transition-colors cursor-pointer ${
                    selectedSymbolId === 'logosimbolo'
                      ? 'border-[#15803d] dark:border-[#39A900] ring-1 ring-[#15803d]/20 dark:ring-[#39A900]/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      04. Logosímbolo Oficial
                    </span>
                    <span>Identidad Visual</span>
                  </div>

                  <div className="py-6 flex items-center justify-center min-h-[230px] w-full">
                    <SenaLogo
                      alt="Logosímbolo oficial del SENA"
                      className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
                    />
                  </div>

                  <p className="w-full text-[11px] text-center text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Síntesis del aprendiz y los senderos hacia el horizonte
                  </p>
                </button>
              </div>
            </div>

            {/* Direct Symbol Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SYMBOL_HOTSPOTS.map((item) => {
                const active = item.id === selectedSymbolId;
                const answeredCorrect =
                  symbolAnswers[item.id] === item.verificationQuestion.correctIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSymbolId(item.id)}
                    className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{item.title.replace('El ', '').replace('La ', '')}</span>
                      {answeredCorrect && (
                        <Check className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#39A900] dark:text-[#15803d]' : 'text-emerald-700 dark:text-emerald-400'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Control & Concept Deck (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>{activeSymbol.sector}</span>
                </div>
                {activeSymbol.id === 'logosimbolo' ? (
                  <SenaLogo className="w-10 h-10" />
                ) : (
                  <div className="dark:bg-slate-100 dark:p-1 dark:rounded-md shrink-0">
                    <SenaEscudo className="w-10 h-10 object-contain" />
                  </div>
                )}
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activeSymbol.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{activeSymbol.summary}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Sentido en la Formación Profesional Integral
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeSymbol.pedagogicalMeaning}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Memoria histórica</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeSymbol.historicalContext}
                </p>
              </div>
            </div>

            {/* Micro-Verification Interactive Prompt */}
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Comprobación rápida · {activeSymbol.verificationQuestion.prompt}
              </p>
              <div className="space-y-2">
                {activeSymbol.verificationQuestion.options.map((opt, idx) => {
                  const chosen = selectedAnswerIdx === idx;
                  const correct = idx === activeSymbol.verificationQuestion.correctIndex;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setSymbolAnswers((prev) => ({ ...prev, [activeSymbol.id]: idx }))
                      }
                      className={`w-full text-left px-3.5 py-2.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                        chosen
                          ? correct
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 font-medium'
                            : 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-950 dark:text-amber-100 font-medium'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedAnswerIdx !== undefined && (
                <p
                  className={`text-xs leading-relaxed ${
                    isSymbolVerified
                      ? 'text-emerald-800 dark:text-emerald-400'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {isSymbolVerified ? '✓ Correcto: ' : '▲ Revisa: '}
                  {activeSymbol.verificationQuestion.explanation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-STAGE 2: HIMNO Y CULTURA INSTITUCIONAL */}
      {subStage === 'himno' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Music className="w-4 h-4 text-[#15803d] dark:text-[#4ade80]" />
                  <h2 className="font-display text-xl font-bold">
                    Himno Oficial del SENA
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Letra: Luis Alfredo Sarmiento · Música: Daniel Marlés
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {HYMN_STANZAS.map((stanza) => (
                  <button
                    key={stanza.id}
                    type="button"
                    onClick={() => setSelectedStanzaId(stanza.id)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      stanza.id === selectedStanzaId
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {stanza.label}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg p-6 space-y-3">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  {activeStanza.label} · {activeStanza.title}
                </p>
                <div className="space-y-1.5 font-display text-lg sm:text-xl text-slate-900 dark:text-slate-100 leading-relaxed">
                  {activeStanza.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Reflexión pedagógica para el aprendiz
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                {activeStanza.meaning}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="h-44 w-full overflow-hidden">
              <ResilientImage
                src={IDENTITY_IMAGE_PATH}
                alt="Centro de Formación Profesional Integral del SENA rodeado de naturaleza colombiana"
                fallbackTitle="Presencia Regional en los 32 Departamentos"
              />
            </div>
            <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 flex items-center gap-4">
                <div className="bg-white dark:bg-slate-100 border border-slate-200 dark:border-slate-300 rounded-md px-4 py-2.5 shrink-0">
                  <SenaEscudo className="w-12 h-12 object-contain" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    La Bandera y el Escudo del SENA
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Su fondo blanco simboliza la paz, la tranquilidad y la transparencia, llevando en el centro el Escudo oficial de los tres sectores productivos.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>33 Regionales</span>
                  <span aria-hidden="true">·</span>
                  <span>118 Centros de Formación</span>
                  <span aria-hidden="true">·</span>
                  <span>Público y Gratuito</span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Misión Institucional
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  El SENA está encargado de cumplir la función que corresponde al Estado de invertir en el desarrollo social y técnico de los trabajadores colombianos, ofreciendo y ejecutando la Formación Profesional Integral para la incorporación y el desarrollo de las personas en actividades productivas que contribuyan al desarrollo social, económico y tecnológico del país.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-STAGE 3: CÓDIGO DE INTEGRIDAD Y VALORES */}
      {subStage === 'valores' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Value Navigator */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 pb-2">
              Código de Integridad SENA
            </p>
            {INSTITUTIONAL_VALUES.map((val, idx) => {
              const active = idx === selectedValueIndex;
              const resolved = valueChoices[val.id] !== undefined;
              const aligned =
                resolved && val.options[valueChoices[val.id]]?.isAligned === true;
              return (
                <button
                  key={val.id}
                  type="button"
                  onClick={() => setSelectedValueIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm font-semibold">
                    0{idx + 1}. {val.name}
                  </span>
                  {aligned && (
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#39A900] dark:text-[#15803d]' : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Value Detail & Dilemma Stage */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Valor Institucional 0{selectedValueIndex + 1} de 05</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activeValue.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeValue.essence}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 space-y-1.5">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  ✓ Lo que hago como aprendiz SENA
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {activeValue.doAction}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 space-y-1.5">
                <p className="text-xs font-semibold text-red-800 dark:text-rose-400">
                  ✕ Conducta contraria a la integridad
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {activeValue.avoidAction}
                </p>
              </div>
            </div>

            {/* Interactive Dilemma */}
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Situación cotidiana en el Centro de Formación
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeValue.scenarioQuestion}
              </p>

              <div className="space-y-2.5 pt-1">
                {activeValue.options.map((opt, idx) => {
                  const picked = valueChoices[activeValue.id] === idx;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setValueChoices((prev) => ({ ...prev, [activeValue.id]: idx }))
                      }
                      className={`w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors cursor-pointer ${
                        picked
                          ? opt.isAligned
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 font-medium'
                            : 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-950 dark:text-amber-100 font-medium'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {valueChoices[activeValue.id] !== undefined && (
                <p
                  className={`text-xs font-medium pt-1 ${
                    activeValue.options[valueChoices[activeValue.id]].isAligned
                      ? 'text-emerald-800 dark:text-emerald-400'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {activeValue.options[valueChoices[activeValue.id]].isAligned
                    ? '✓ Decisión íntegra: '
                    : '▲ Reflexiona: '}
                  {activeValue.options[valueChoices[activeValue.id]].feedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Module Mastery Completion Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Registro de apropiación de este módulo
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Marca las dimensiones revisadas antes de avanzar a Derechos y Deberes del Aprendiz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleComplete('identidad')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isIdentityDone
                ? 'bg-emerald-700 dark:bg-[#16a34a] text-white border-emerald-700 dark:border-[#16a34a]'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isIdentityDone ? 'Identidad completada' : 'Marcar Identidad'}
          </button>

          <button
            type="button"
            onClick={() => onToggleComplete('valores')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isValuesDone
                ? 'bg-emerald-700 dark:bg-[#16a34a] text-white border-emerald-700 dark:border-[#16a34a]'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isValuesDone ? 'Valores completados' : 'Marcar Valores'}
          </button>

          <button
            type="button"
            onClick={onGoToNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Continuar a Derechos y Deberes
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
