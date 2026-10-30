import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Download,
  RotateCcw,
} from 'lucide-react';
import { EVALUATION_QUESTIONS } from '../data/senaContent';
import type { FichaRecord } from '../lib/inductionStore';
import type { InductionModuleId } from '../lib/validation';
import { SenaLogo } from './SenaLogo';

export interface EvaluationSummaryPayload {
  score: number;
  passed: boolean;
  dimIdentity: number;
  dimValues: number;
  dimRights: number;
  dimDuties: number;
  correctCount: number;
  durationSeconds: number;
}

interface InteractiveEvaluationProps {
  apprenticeName: string;
  documentCode: string;
  selectedFicha: FichaRecord | null;
  isSignedIn: boolean;
  isSaving: boolean;
  saveFeedback: string | null;
  latestSummary: EvaluationSummaryPayload | null;
  onCompleteEvaluation: (summary: EvaluationSummaryPayload) => Promise<void>;
  onDownloadTrajectoryPdf: (overrideSummary?: EvaluationSummaryPayload) => Promise<void>;
  onNavigateModule: (target: 'identidad' | 'derechos') => void;
  onRequestSignIn: () => void;
}

export function InteractiveEvaluation({
  selectedFicha,
  isSignedIn,
  isSaving,
  saveFeedback,
  latestSummary,
  onCompleteEvaluation,
  onDownloadTrajectoryPdf,
  onNavigateModule,
  onRequestSignIn,
}: InteractiveEvaluationProps) {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [confirmedQuestions, setConfirmedQuestions] = useState<Record<string, boolean>>({});
  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [submittedResult, setSubmittedResult] =
    useState<EvaluationSummaryPayload | null>(latestSummary);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  const isReviewingResult = submittedResult !== null;

  useEffect(() => {
    if (isReviewingResult) return;
    const timer = window.setInterval(() => {
      setElapsedSec(Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAtMs, isReviewingResult]);

  const currentQuestion = EVALUATION_QUESTIONS[currentIdx];
  const currentChoice = selectedAnswers[currentQuestion.id];
  const isConfirmed = Boolean(confirmedQuestions[currentQuestion.id]);
  const answeredCount = Object.keys(confirmedQuestions).length;

  function formatDuration(sec: number): string {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  function computeDimensionScore(dim: InductionModuleId): number {
    const questions = EVALUATION_QUESTIONS.filter((q) => q.dimension === dim);
    if (questions.length === 0) return 0;
    const hits = questions.filter(
      (q) => selectedAnswers[q.id] === q.correctOptionId
    ).length;
    return Math.round((hits / questions.length) * 100);
  }

  async function handleFinishEvaluation() {
    const correctCount = EVALUATION_QUESTIONS.filter(
      (q) => selectedAnswers[q.id] === q.correctOptionId
    ).length;
    const score = Math.round((correctCount / EVALUATION_QUESTIONS.length) * 100);
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000));

    const payload: EvaluationSummaryPayload = {
      score,
      passed: score >= 70,
      dimIdentity: computeDimensionScore('identidad'),
      dimValues: computeDimensionScore('valores'),
      dimRights: computeDimensionScore('derechos'),
      dimDuties: computeDimensionScore('deberes'),
      correctCount,
      durationSeconds,
    };

    setSubmittedResult(payload);
    await onCompleteEvaluation(payload);
  }

  function handleResetAttempt() {
    setSelectedAnswers({});
    setConfirmedQuestions({});
    setCurrentIdx(0);
    setStartedAtMs(Date.now());
    setElapsedSec(0);
    setSubmittedResult(null);
  }

  async function handleDownloadConstancia() {
    if (!submittedResult || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await onDownloadTrajectoryPdf(submittedResult);
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (isReviewingResult && submittedResult) {
    const dimensions = [
      {
        id: 'identidad' as const,
        label: 'Identidad e Imagen Institucional',
        score: submittedResult.dimIdentity,
        moduleTarget: 'identidad' as const,
      },
      {
        id: 'valores' as const,
        label: 'Código de Integridad y Valores',
        score: submittedResult.dimValues,
        moduleTarget: 'identidad' as const,
      },
      {
        id: 'derechos' as const,
        label: 'Derechos y Ruta Formativa',
        score: submittedResult.dimRights,
        moduleTarget: 'derechos' as const,
      },
      {
        id: 'deberes' as const,
        label: 'Deberes, Convivencia y SST',
        score: submittedResult.dimDuties,
        moduleTarget: 'derechos' as const,
      },
    ];

    const weakDimensions = dimensions.filter((d) => d.score < 70);

    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <SenaLogo className="w-6 h-6" />
                <span>Resultado Diagnóstico SENA</span>
                <span aria-hidden="true">·</span>
                <span>Umbral mínimo de apropiación: 70%</span>
                {selectedFicha && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Ficha {selectedFicha.fichaCode}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                {submittedResult.passed ? (
                  <Award className="w-7 h-7 text-[#15803d] dark:text-[#4ade80] shrink-0" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {submittedResult.passed
                    ? 'Juicio Evaluativo: APROBADO (A) — Proceso Apropiado'
                    : 'Juicio Evaluativo: POR REFORZAR (D) — Plan de Mejoramiento'}
                </h1>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {submittedResult.passed
                  ? 'El aprendiz demuestra apropiación sólida de la identidad institucional, el Código de Integridad y el Reglamento del Aprendiz SENA (Acuerdo 009 de 2024, actualizado por el Acuerdo 002 de 2026 y el Decreto 0223 de 2026).'
                  : 'Se identificaron brechas conceptuales en dimensiones clave de la inducción. Revisa las recomendaciones bajo el marco vigente 2026 (Acuerdo 009/2024 y Acuerdo 002/2026) y vuelve a presentar la prueba.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 text-right shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">Puntaje de apropiación</p>
              <p className="font-mono text-4xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                {submittedResult.score}%
              </p>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums mt-1">
                {submittedResult.correctCount} / 10 aciertos ·{' '}
                {formatDuration(submittedResult.durationSeconds)}
              </p>
            </div>
          </div>

          {/* 4-Dimension Mastery Matrix */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Nivel de apropiación por dimensión formativa
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dimensions.map((dim) => {
                const nominal = dim.score >= 70;
                return (
                  <div
                    key={dim.id}
                    className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {dim.label}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {dim.score}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-transform duration-200 origin-left ${
                          nominal ? 'bg-[#15803d] dark:bg-[#22c55e]' : 'bg-amber-600 dark:bg-amber-500'
                        }`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-medium ${
                          nominal
                            ? 'text-emerald-800 dark:text-emerald-400'
                            : 'text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {nominal ? '● Competencia apropiada' : '▲ Requiere refuerzo'}
                      </span>
                      {!nominal && (
                        <button
                          type="button"
                          onClick={() => onNavigateModule(dim.moduleTarget)}
                          className="font-semibold text-slate-900 dark:text-slate-100 underline hover:text-emerald-800 dark:hover:text-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Repasar módulo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Persistence Feedback Banner */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {isSaving ? (
                <span>Guardando resultado en el expediente de la ficha...</span>
              ) : saveFeedback ? (
                <span className="text-emerald-800 dark:text-emerald-400 font-medium">
                  ✓ {saveFeedback}
                </span>
              ) : selectedFicha ? (
                <span className="text-emerald-800 dark:text-emerald-400 font-medium">
                  ✓ Resultado vinculado a tu expediente académico en la Ficha {selectedFicha.fichaCode}.
                </span>
              ) : (
                <span>
                  Resultado registrado en tu perfil actual. Vincula tu Ficha en Inicio o en Mi Perfil para consolidar tu expediente.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isSignedIn && (
                <button
                  type="button"
                  onClick={onRequestSignIn}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Respaldo nube opcional
                </button>
              )}

              <button
                type="button"
                disabled={downloadingPdf}
                onClick={() => void handleDownloadConstancia()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#15803d] dark:text-[#4ade80]" />
                {downloadingPdf ? 'Generando PDF...' : 'Descargar resumen PDF'}
              </button>

              <button
                type="button"
                onClick={handleResetAttempt}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Presentar nuevo intento
              </button>
            </div>
          </div>

          {weakDimensions.length > 0 && (
            <div className="bg-amber-50/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-lg p-4 text-xs text-amber-950 dark:text-amber-100 space-y-1">
              <p className="font-semibold">
                Plan de mejoramiento sugerido automáticamente:
              </p>
              <p>
                Refuerza especialmente:{' '}
                {weakDimensions.map((d) => d.label).join(' · ')}. Una vez revises los casos interactivos, presenta un nuevo intento hasta alcanzar mínimo 70%.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Evaluation Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <SenaLogo className="w-5 h-5" />
            <span>Evaluación Interactiva de Conocimientos</span>
            <span aria-hidden="true">·</span>
            <span>Acuerdo 009/2024 y Acuerdo 002/2026</span>
            <span aria-hidden="true">·</span>
            <span>Aprobación ≥ 70%</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
            Verificación de Apropiación de Inducción
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {formatDuration(elapsedSec)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Confirmadas: {answeredCount} / {EVALUATION_QUESTIONS.length}
          </span>
        </div>
      </div>

      {/* Question Stepper Strip */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {EVALUATION_QUESTIONS.map((q, idx) => {
          const active = idx === currentIdx;
          const confirmed = Boolean(confirmedQuestions[q.id]);
          const right = confirmed && selectedAnswers[q.id] === q.correctOptionId;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={`py-2 text-xs font-mono font-semibold rounded-lg border transition-colors tabular-nums cursor-pointer ${
                active
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : confirmed
                  ? right
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {String(q.number).padStart(2, '0')}
            </button>
          );
        })}
      </div>

      {/* Active Question Stage */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
              Pregunta {String(currentQuestion.number).padStart(2, '0')} de 10 ·{' '}
              {currentQuestion.dimensionLabel}
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg p-4 leading-relaxed">
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Contexto: </strong>
            {currentQuestion.scenario}
          </p>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 pt-1">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((opt, idx) => {
            const selected = currentChoice === opt.id;
            const isCorrectOption = opt.id === currentQuestion.correctOptionId;

            let borderStyle =
              'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800';
            if (isConfirmed) {
              if (isCorrectOption) {
                borderStyle =
                  'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 font-medium';
              } else if (selected && !isCorrectOption) {
                borderStyle =
                  'bg-amber-50 dark:bg-amber-950/60 border-amber-600 dark:border-amber-500 text-amber-950 dark:text-amber-100 font-medium';
              } else {
                borderStyle =
                  'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500';
              }
            } else if (selected) {
              borderStyle =
                'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 font-medium';
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isConfirmed}
                onClick={() =>
                  setSelectedAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: opt.id,
                  }))
                }
                className={`w-full text-left px-4 py-3.5 rounded-lg border text-sm transition-colors flex items-start gap-3 ${
                  isConfirmed ? 'cursor-default' : 'cursor-pointer'
                } ${borderStyle}`}
              >
                <span className="font-mono text-xs opacity-75 pt-0.5 shrink-0">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="leading-relaxed">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Immediate Pedagogical Rationale on Confirmation */}
        {isConfirmed && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <p
              className={`text-sm font-semibold ${
                currentChoice === currentQuestion.correctOptionId
                  ? 'text-emerald-800 dark:text-emerald-400'
                  : 'text-amber-800 dark:text-amber-300'
              }`}
            >
              {currentChoice === currentQuestion.correctOptionId
                ? '✓ Respuesta acertada — Concepto apropiado'
                : '▲ Respuesta por reforzar — Retroalimentación formativa'}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Controls Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            {!isConfirmed ? (
              <button
                type="button"
                disabled={!currentChoice}
                onClick={() =>
                  setConfirmedQuestions((prev) => ({
                    ...prev,
                    [currentQuestion.id]: true,
                  }))
                }
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verificar respuesta
              </button>
            ) : currentIdx < EVALUATION_QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentIdx((i) => Math.min(EVALUATION_QUESTIONS.length - 1, i + 1))
                }
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Siguiente escenario
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}

            {answeredCount === EVALUATION_QUESTIONS.length && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleFinishEvaluation()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                {isSaving ? 'Calculando...' : 'Generar diagnóstico de apropiación'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
