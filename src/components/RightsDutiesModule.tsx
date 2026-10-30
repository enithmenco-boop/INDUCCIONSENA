import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Scale,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  REGULATION_CASES,
  REGULATION_ITEMS,
  RIGHTS_IMAGE_PATH,
  WORKSHOP_IMAGE_PATH,
  type RegulationAxis,
} from '../data/senaContent';
import type { GfpiF165Record } from '../lib/inductionStore';
import type { InductionModuleId } from '../lib/validation';
import { ResilientImage } from './ResilientImage';
import { SenaLogo } from './SenaLogo';

interface RightsDutiesModuleProps {
  completedModules: InductionModuleId[];
  gfpiSubmission: GfpiF165Record | null;
  onToggleComplete: (moduleId: InductionModuleId) => void;
  onOpenFormato165: () => void;
  onStartEvaluation: () => void;
}

type RegulationTab = 'derechos' | 'deberes' | 'etapa_productiva' | 'casos';

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function RightsDutiesModule({
  completedModules,
  gfpiSubmission,
  onToggleComplete,
  onOpenFormato165,
  onStartEvaluation,
}: RightsDutiesModuleProps) {
  const [activeTab, setActiveTab] = useState<RegulationTab>('derechos');
  const [selectedAxis, setSelectedAxis] = useState<'todos' | RegulationAxis>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [caseResponses, setCaseResponses] = useState<Record<string, string>>({});

  const rightsCount = useMemo(
    () => REGULATION_ITEMS.filter((item) => item.category === 'derechos').length,
    []
  );
  const dutiesCount = useMemo(
    () => REGULATION_ITEMS.filter((item) => item.category === 'deberes').length,
    []
  );
  const productiveCount = useMemo(
    () => REGULATION_ITEMS.filter((item) => item.category === 'etapa_productiva').length,
    []
  );

  const handleTabChange = (nextTab: RegulationTab) => {
    setActiveTab(nextTab);
    setSelectedAxis('todos');
    setSearchQuery('');
  };

  const categoryItems = useMemo(
    () =>
      activeTab === 'casos'
        ? []
        : REGULATION_ITEMS.filter((item) => item.category === activeTab),
    [activeTab]
  );

  const availableAxes = useMemo(() => {
    const map = new Map<RegulationAxis, { axis: RegulationAxis; label: string; count: number }>();
    for (const item of categoryItems) {
      const existing = map.get(item.axis);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.axis, { axis: item.axis, label: item.axisLabel, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [categoryItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery.trim());
    return categoryItems.filter((item) => {
      if (selectedAxis !== 'todos' && item.axis !== selectedAxis) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const paddedNumeral =
        item.numeral !== undefined ? String(item.numeral).padStart(2, '0') : '';
      const rawNumeral = item.numeral !== undefined ? String(item.numeral) : '';
      const searchable = normalizeSearchText(
        `${rawNumeral} ${paddedNumeral} ${item.code} ${item.axisLabel} ${item.title} ${item.description} ${item.practicalApplication} ${item.institutionalRoute}`
      );
      return searchable.includes(normalizedQuery);
    });
  }, [categoryItems, selectedAxis, searchQuery]);

  const currentCase = REGULATION_CASES[selectedCaseIdx];
  const chosenOptionId = caseResponses[currentCase.id];
  const chosenOption = currentCase.options.find((o) => o.id === chosenOptionId);

  const isRightsDone = completedModules.includes('derechos');
  const isDutiesDone = completedModules.includes('deberes');

  const resolvedCasesCount = REGULATION_CASES.filter((c) => {
    const pick = caseResponses[c.id];
    return c.options.find((o) => o.id === pick)?.isCorrect === true;
  }).length;

  const isFilterActive = selectedAxis !== 'todos' || searchQuery.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      {/* Header & Interactive Segmented Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <SenaLogo className="w-5 h-5" />
            <span>Módulo 02</span>
            <span aria-hidden="true">·</span>
            <span>Reglamento del Aprendiz SENA</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">
              Acuerdo 009 de 2024 · Mod. Acuerdo 002 de 2026
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight balance-text">
            Derechos, Deberes y Etapa Productiva
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Consulta la totalidad de los <strong className="font-semibold text-slate-800 dark:text-slate-100">24 Derechos (Capítulo II)</strong> y los <strong className="font-semibold text-slate-800 dark:text-slate-100">25 Deberes (Capítulo III)</strong> del Acuerdo 009 de 2024, armonizados con las actualizaciones vigentes de 2026: el Acuerdo 002 de 2026 sobre debido proceso (Art. 48) y el Decreto 0223 de 2026 sobre contrato de aprendizaje laboral especial.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Categorías del Reglamento del Aprendiz"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'derechos'}
            onClick={() => handleTabChange('derechos')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              activeTab === 'derechos'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Derechos ({rightsCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'deberes'}
            onClick={() => handleTabChange('deberes')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              activeTab === 'deberes'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Deberes y SST ({dutiesCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'etapa_productiva'}
            onClick={() => handleTabChange('etapa_productiva')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              activeTab === 'etapa_productiva'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Etapa Productiva ({productiveCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'casos'}
            onClick={() => handleTabChange('casos')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              activeTab === 'casos'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Laboratorio de Casos ({resolvedCasesCount}/4)
          </button>
        </div>
      </div>

      {/* NORMATIVE VIEWS: DERECHOS / DEBERES / ETAPA PRODUCTIVA */}
      {activeTab !== 'casos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Cards Grid (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Search & Thematic Axis Filter Toolbar for Full Rights (24) & Duties (25) Catalog */}
            {(activeTab === 'derechos' || activeTab === 'deberes') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === 'derechos'
                        ? 'Buscar entre los 24 derechos por numeral, tema, palabra clave o ruta...'
                        : 'Buscar entre los 25 deberes por numeral, tema, palabra clave o ruta...'
                    }
                    aria-label={
                      activeTab === 'derechos'
                        ? 'Buscar en los derechos del aprendiz'
                        : 'Buscar en los deberes del aprendiz'
                    }
                    className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 dark:focus:border-emerald-500"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div
                  role="group"
                  aria-label="Filtrar por eje temático reglamentario"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedAxis('todos')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                      selectedAxis === 'todos'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Todos ({categoryItems.length})
                  </button>
                  {availableAxes.map((group) => (
                    <button
                      key={group.axis}
                      type="button"
                      onClick={() => setSelectedAxis(group.axis)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        selectedAxis === group.axis
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {group.label} ({group.count})
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="tabular-nums">
                    Mostrando {filteredItems.length} de {categoryItems.length}{' '}
                    {activeTab === 'derechos'
                      ? 'numerales · Capítulo II (Art. 5, 6 y 7)'
                      : 'numerales · Capítulo III (Art. 8 y concordantes)'}
                  </span>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAxis('todos');
                        setSearchQuery('');
                      }}
                      className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Official Formato GFPI-F-165 Action Callout inside Etapa Productiva Tab */}
            {activeTab === 'etapa_productiva' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      Código GFPI-F-165 · V04
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {gfpiSubmission
                        ? gfpiSubmission.status === 'radicado' ||
                          gfpiSubmission.status === 'validado_coordinacion'
                          ? `✓ Radicado (${gfpiSubmission.filingCode})`
                          : '◐ Borrador guardado'
                        : '○ Pendiente de diligenciar en inducción'}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Diligencia tu Formato GFPI-F-165 de Selección de Alternativa
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {gfpiSubmission
                      ? `Alternativa registrada actualmente: ${gfpiSubmission.selectedAlternative}. Puedes revisarla, actualizar fechas o descargar el documento oficial.`
                      : 'Registra desde la inducción cuál de las 6 alternativas reglamentarias proyectas elegir para tus prácticas formativas.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenFormato165}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {gfpiSubmission ? 'Ver / Modificar GFPI-F-165' : 'Diligenciar GFPI-F-165'}
                </button>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No se encontraron numerales con ese criterio de búsqueda
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Prueba con otra palabra clave (por ejemplo: carné, excusas, bienestar, ARL, bitácoras o debido proceso) o restablece el filtro temático.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAxis('todos');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Mostrar los {categoryItems.length} numerales
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <article
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-medium text-emerald-800 dark:text-emerald-400 tabular-nums">
                          {item.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.axisLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>Ruta: {item.institutionalRoute}</span>
                      </div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {item.numeral !== undefined && (
                          <span className="font-mono tabular-nums text-emerald-800 dark:text-emerald-400 mr-2">
                            {String(item.numeral).padStart(2, '0')}.
                          </span>
                        )}
                        {item.title}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                      {activeTab === 'derechos' ? (
                        <Scale className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : activeTab === 'deberes' ? (
                        <ShieldAlert className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                      ) : (
                        <Briefcase className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong className="font-semibold text-slate-900 dark:text-slate-100">
                          Aplicación práctica:{' '}
                        </strong>
                        {item.practicalApplication}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Right Contextual Documentary Panel (4 cols) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="h-52 w-full overflow-hidden">
              <ResilientImage
                src={activeTab === 'deberes' ? WORKSHOP_IMAGE_PATH : RIGHTS_IMAGE_PATH}
                alt={
                  activeTab === 'deberes'
                    ? 'Aprendices aplicando protocolos de seguridad y elementos de protección personal en taller técnico'
                    : 'Aprendices colaborando en biblioteca y revisando su ruta formativa'
                }
                fallbackTitle={
                  activeTab === 'deberes'
                    ? 'Seguridad y Salud en el Trabajo (SST)'
                    : 'Bienestar al Aprendiz y Conducto Regular'
                }
              />
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conducto regular y debido proceso · Act. 2026
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  ¿A quién acudir en tu Centro de Formación?
                </h3>
                <ol className="space-y-2.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      01.
                    </span>
                    <span>
                      <strong className="text-slate-900 dark:text-slate-100">Instructor Técnico o Gestor de Ficha:</strong>{' '}
                      primera instancia para retroalimentación de evidencias, excusas justificadas e inquietudes pedagógicas.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      02.
                    </span>
                    <span>
                      <strong className="text-slate-900 dark:text-slate-100">Voceros, Representantes y Bienestar:</strong>{' '}
                      acompañamiento psicosocial, enfoque diferencial, prevención de acoso (Ley 2365/2024) y apoyos.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      03.
                    </span>
                    <span>
                      <strong className="text-slate-900 dark:text-slate-100">Coordinación Académica:</strong>{' '}
                      segunda instancia formal para revisión de evaluaciones, novedades, aplazamientos o etapa productiva.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      04.
                    </span>
                    <span>
                      <strong className="text-slate-900 dark:text-slate-100">Equipo Ejecutor y Comité (Art. 48 mod. Acuerdo 002 de 2026):</strong>{' '}
                      equipos con funciones delimitadas para analizar casos, garantizar descargos (5 días hábiles) y debido proceso.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={onOpenFormato165}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {gfpiSubmission
                    ? 'Abrir mi Formato GFPI-F-165'
                    : 'Diligenciar Formato GFPI-F-165'}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('casos')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Practicar en el Laboratorio de Casos
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* INTERACTIVE CASE LABORATORY */}
      {activeTab === 'casos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Case Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Casos prácticos reglamentarios
              </span>
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                {resolvedCasesCount} / {REGULATION_CASES.length} resueltos
              </span>
            </div>

            {REGULATION_CASES.map((item, idx) => {
              const active = idx === selectedCaseIdx;
              const pickedId = caseResponses[item.id];
              const isSolved =
                item.options.find((o) => o.id === pickedId)?.isCorrect === true;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCaseIdx(idx)}
                  className={`w-full text-left px-3.5 py-3 rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs opacity-75 tabular-nums">
                      Caso 0{idx + 1}
                    </span>
                    {isSolved && (
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#39A900] dark:text-[#15803d]' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-1 leading-snug">{item.title}</p>
                </button>
              );
            })}
          </div>

          {/* Interactive Case Stage */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-2 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold tabular-nums">
                  Caso 0{selectedCaseIdx + 1}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentCase.categoryLabel}</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                {currentCase.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentCase.context}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Selecciona la actuación ajustada al Reglamento vigente (Acuerdo 009 de 2024 y Acuerdo 002 de 2026):
              </p>
              {currentCase.options.map((option) => {
                const isSelected = chosenOptionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setCaseResponses((prev) => ({
                        ...prev,
                        [currentCase.id]: option.id,
                      }))
                    }
                    className={`w-full text-left px-4 py-3.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? option.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 font-medium'
                          : 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-950 dark:text-amber-100 font-medium'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>

            {chosenOption && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <p
                  className={`text-sm font-semibold ${
                    chosenOption.isCorrect
                      ? 'text-emerald-800 dark:text-emerald-400'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {chosenOption.isCorrect
                    ? '✓ Actuación reglamentaria apropiada'
                    : '▲ Actuación no recomendada'}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {chosenOption.rationale}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  Ruta institucional aplicable: {currentCase.institutionalRoute}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Mastery Completion Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Registro de apropiación normativa · Vigencia 2026
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Confirma tu estudio del Acuerdo 009 de 2024 y sus actualizaciones 2026 antes de presentar la evaluación interactiva.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleComplete('derechos')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isRightsDone
                ? 'bg-emerald-700 dark:bg-[#16a34a] text-white border-emerald-700 dark:border-[#16a34a]'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isRightsDone ? 'Derechos completados' : 'Marcar Derechos'}
          </button>

          <button
            type="button"
            onClick={() => onToggleComplete('deberes')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDutiesDone
                ? 'bg-emerald-700 dark:bg-[#16a34a] text-white border-emerald-700 dark:border-[#16a34a]'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isDutiesDone ? 'Deberes completados' : 'Marcar Deberes'}
          </button>

          <button
            type="button"
            onClick={onOpenFormato165}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#15803d] dark:text-[#4ade80]" />
            Formato GFPI-F-165
          </button>

          <button
            type="button"
            onClick={onStartEvaluation}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            Presentar evaluación interactiva
          </button>
        </div>
      </div>
    </div>
  );
}
