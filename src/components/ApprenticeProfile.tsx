import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import type { EvaluationSummaryPayload } from './InteractiveEvaluation';
import {
  SENA_OFFICIAL_ESCUDO_URL,
  SENA_OFFICIAL_LOGO_DATA_URI,
  SenaEscudo,
  SenaLogo,
} from './SenaLogo';
import type {
  ApprenticeProfileData,
  EnrollmentRecord,
  EvaluationAttemptRecord,
  FichaRecord,
  GfpiF165Record,
} from '../lib/inductionStore';
import {
  AppropriationState,
  BloodType,
  DifferentialFocusType,
  InductionModuleId,
  ModalityType,
  ProductiveAltType,
  RepresentationRoleType,
  SCHEMA_LIMITS,
  TrainingLevelType,
  validateApprenticeProfileInput,
} from '../lib/validation';

interface ApprenticeProfileProps {
  user: User | null;
  profile: ApprenticeProfileData;
  activeFichas: FichaRecord[];
  selectedFicha: FichaRecord | null;
  currentEnrollment: EnrollmentRecord | null;
  gfpiSubmission: GfpiF165Record | null;
  completedModules: InductionModuleId[];
  latestSummary: EvaluationSummaryPayload | null;
  evaluationHistory: EvaluationAttemptRecord[];
  isSyncing: boolean;
  syncFeedback: string | null;
  onSaveProfile: (updated: ApprenticeProfileData) => Promise<void>;
  onToggleCommitment: (accepted: boolean) => Promise<void>;
  onSyncWithFicha: (fichaId: string) => Promise<void>;
  onNavigate: (view: 'identidad' | 'derechos' | 'evaluacion' | 'formato165') => void;
  onRequestSignIn: () => void;
}

type ProfileTab = 'credencial' | 'editar' | 'historial';

function computeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'AP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildVerificationHash(seed: string): { code: string; bits: boolean[] } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unsigned = h >>> 0;
  const code = `SENA-2026-${unsigned.toString(16).toUpperCase().padStart(8, '0')}`;

  const bits: boolean[] = [];
  let state = unsigned || 0x9e3779b9;
  for (let i = 0; i < 49; i += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bits.push(((state >>> 0) & 1) === 1);
  }
  return { code, bits };
}

function formatDateEs(ms: number): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    return '2026';
  }
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function getAppropriationDisplay(state: AppropriationState): {
  label: string;
  toneClass: string;
} {
  switch (state) {
    case 'certificado':
      return {
        label: '★ Certificado en Inducción',
        toneClass: 'text-emerald-800 dark:text-emerald-400 font-semibold',
      };
    case 'apropiado':
      return {
        label: '✓ Apropiado · Juicio A (≥ 70%)',
        toneClass: 'text-emerald-800 dark:text-emerald-400 font-semibold',
      };
    case 'plan_mejoramiento':
      return {
        label: '▲ Plan de Mejoramiento · Juicio D',
        toneClass: 'text-amber-800 dark:text-amber-300 font-semibold',
      };
    default:
      return {
        label: '○ En proceso formativo',
        toneClass: 'text-slate-700 dark:text-slate-300 font-medium',
      };
  }
}

export function ApprenticeProfile({
  user,
  profile,
  activeFichas,
  selectedFicha,
  currentEnrollment,
  gfpiSubmission,
  completedModules,
  latestSummary,
  evaluationHistory,
  isSyncing,
  syncFeedback,
  onSaveProfile,
  onToggleCommitment,
  onSyncWithFicha,
  onNavigate,
  onRequestSignIn,
}: ApprenticeProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('credencial');
  const [formState, setFormState] = useState<ApprenticeProfileData>(profile);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSavedMsg, setFormSavedMsg] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  useEffect(() => {
    setFormState(profile);
  }, [profile]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.photoURL]);

  const effectiveName =
    profile.apprenticeName.trim() || user?.displayName || 'Aprendiz en Inducción';
  const effectiveCode = profile.documentCode.trim() || 'APR-102400';
  const effectiveProgram = selectedFicha
    ? selectedFicha.programName
    : `${profile.trainingLevel} · Formación Profesional Integral`;
  const effectiveCenter = selectedFicha
    ? selectedFicha.centerName
    : profile.regionalCenter;
  const effectiveJornada = selectedFicha ? selectedFicha.jornada : profile.modality;

  const derivedState: AppropriationState = currentEnrollment
    ? currentEnrollment.appropriationState
    : latestSummary
    ? latestSummary.passed
      ? 'apropiado'
      : 'plan_mejoramiento'
    : 'en_proceso';

  const statusMeta = getAppropriationDisplay(derivedState);

  const verification = useMemo(
    () =>
      buildVerificationHash(
        `${effectiveCode}|${selectedFicha?.fichaCode ?? 'LIBRE'}|${derivedState}`
      ),
    [effectiveCode, selectedFicha?.fichaCode, derivedState]
  );

  const dimensionRows = useMemo(
    () => [
      {
        id: 'identidad' as InductionModuleId,
        index: '01',
        title: 'Identidad e Imagen Institucional',
        targetView: 'identidad' as const,
        done: completedModules.includes('identidad'),
        score: currentEnrollment?.dimIdentity ?? latestSummary?.dimIdentity ?? null,
      },
      {
        id: 'valores' as InductionModuleId,
        index: '02',
        title: 'Valores y Código de Integridad',
        targetView: 'identidad' as const,
        done: completedModules.includes('valores'),
        score: currentEnrollment?.dimValues ?? latestSummary?.dimValues ?? null,
      },
      {
        id: 'derechos' as InductionModuleId,
        index: '03',
        title: 'Derechos del Aprendiz (24 numerales · Cap. II)',
        targetView: 'derechos' as const,
        done: completedModules.includes('derechos'),
        score: currentEnrollment?.dimRights ?? latestSummary?.dimRights ?? null,
      },
      {
        id: 'deberes' as InductionModuleId,
        index: '04',
        title: 'Deberes y SST (25 numerales · Cap. III)',
        targetView: 'derechos' as const,
        done: completedModules.includes('deberes'),
        score: currentEnrollment?.dimDuties ?? latestSummary?.dimDuties ?? null,
      },
    ],
    [completedModules, currentEnrollment, latestSummary]
  );

  // Merge cloud evaluation history or fallback to local latest summary if offline
  const historyRows = useMemo(() => {
    if (evaluationHistory.length > 0) {
      return evaluationHistory;
    }
    if (latestSummary) {
      return [
        {
          id: 'local_latest',
          authorId: user?.uid ?? 'local',
          fichaId: selectedFicha?.id ?? '',
          instructorId: '',
          fichaCode: selectedFicha?.fichaCode ?? 'Local',
          apprenticeName: effectiveName,
          score: latestSummary.score,
          passed: latestSummary.passed,
          dimIdentity: latestSummary.dimIdentity,
          dimValues: latestSummary.dimValues,
          dimRights: latestSummary.dimRights,
          dimDuties: latestSummary.dimDuties,
          correctCount: latestSummary.correctCount,
          totalQuestions: 10,
          durationSeconds: latestSummary.durationSeconds,
          createdAtMs: Date.now(),
        },
      ];
    }
    return [];
  }, [evaluationHistory, latestSummary, user?.uid, selectedFicha, effectiveName]);

  const bestScore = useMemo(() => {
    if (historyRows.length === 0) return null;
    return Math.max(...historyRows.map((r) => r.score));
  }, [historyRows]);

  const dimensionsToReinforce = useMemo(
    () => dimensionRows.filter((d) => d.score !== null && d.score < 70),
    [dimensionRows]
  );

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSavedMsg(null);

    const validation = validateApprenticeProfileInput(formState);
    if (!validation.valid) {
      setFormError(validation.error ?? 'Revisa los datos ingresados.');
      return;
    }

    try {
      await onSaveProfile(formState);
      setFormSavedMsg(
        user
          ? 'Perfil institucional guardado y sincronizado con tu cuenta y Ficha.'
          : 'Perfil guardado y sincronizado con tu Ficha activa en este dispositivo.'
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No fue posible guardar el perfil.'
      );
    }
  }

  function handleDownloadCarneHtml() {
    const fichaLine = selectedFicha
      ? `Ficha ${selectedFicha.fichaCode} · ${selectedFicha.jornada}`
      : `Modalidad ${profile.modality} · Exploración`;

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Carné Institucional Digital SENA - ${effectiveCode}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #0f172a; padding: 36px; margin: 0; }
    .card { max-width: 460px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; }
    .banner { background: #15803d; color: #ffffff; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
    .banner-left { display: flex; align-items: center; gap: 12px; }
    .logo-box { background: #ffffff; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .body { padding: 24px; }
    .role { font-size: 12px; color: #15803d; font-weight: 700; margin: 0 0 4px 0; }
    h1 { font-size: 22px; margin: 0 0 16px 0; line-height: 1.2; }
    .row { display: flex; justify-content: space-between; padding: 9px 0; border-top: 1px solid #e2e8f0; font-size: 13px; gap: 12px; }
    .label { color: #64748b; }
    .val { font-weight: 600; text-align: right; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 11px; color: #475569; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="banner">
      <div class="banner-left">
        <div class="logo-box">
          <img src="${SENA_OFFICIAL_LOGO_DATA_URI}" alt="SENA" width="32" height="32" />
        </div>
        <div>
          <div style="font-weight:700;font-size:14px;">SERVICIO NACIONAL DE APRENDIZAJE</div>
          <div style="font-size:11px;opacity:0.9;">Acreditación Institucional · Cap. II Numeral 03</div>
        </div>
      </div>
      <img src="${SENA_OFFICIAL_ESCUDO_URL}" alt="Escudo SENA" width="40" height="40" style="object-fit:contain;background:#fff;border-radius:8px;padding:3px;" />
    </div>
    <div class="body">
      <p class="role">${profile.representationRole} · ${profile.trainingLevel}</p>
      <h1>${effectiveName}</h1>
      <div class="row"><span class="label">Código Carné</span><span class="val mono">${effectiveCode}</span></div>
      <div class="row"><span class="label">Grupo Sanguíneo / RH</span><span class="val mono">${profile.bloodType}</span></div>
      <div class="row"><span class="label">Ficha / Modalidad</span><span class="val">${fichaLine}</span></div>
      <div class="row"><span class="label">Programa</span><span class="val">${effectiveProgram}</span></div>
      <div class="row"><span class="label">Centro y Regional</span><span class="val">${effectiveCenter}</span></div>
      <div class="row"><span class="label">Estado Inducción</span><span class="val">${statusMeta.label}</span></div>
      <div class="row"><span class="label">Etapa Productiva Proyectada</span><span class="val">${
        gfpiSubmission ? gfpiSubmission.selectedAlternative : profile.preferredProductiveAlt
      }</span></div>
      <div class="row"><span class="label">Formato GFPI-F-165</span><span class="val mono">${
        gfpiSubmission
          ? gfpiSubmission.status === 'radicado' ||
            gfpiSubmission.status === 'validado_coordinacion'
            ? `Radicado · ${gfpiSubmission.filingCode}`
            : `Borrador · ${gfpiSubmission.filingCode}`
          : 'Pendiente en inducción'
      }</span></div>
    </div>
    <div class="footer">
      <span class="mono">${verification.code}</span>
      <span>Acuerdo 009/2024 · Act. 2026</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `carne-aprendiz-sena-${effectiveCode.toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header & Segmented Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <SenaLogo className="w-5 h-5" />
            <span>Expediente del Aprendiz</span>
            <span aria-hidden="true">·</span>
            <span>Carné Institucional y Caracterización</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-400">
              Acuerdo 009 de 2024 · Act. 2026
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight balance-text">
            Perfil Integral del Aprendiz SENA
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Gestiona tu acreditación institucional (Cap. II Numeral 03), actualiza tus datos de caracterización y Etapa Productiva proyectada (Cap. III Numeral 04), suscribe el acta de compromiso y verifica tu avance de apropiación.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Secciones del perfil del aprendiz"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/90 rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'credencial'}
            onClick={() => setActiveTab('credencial')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'credencial'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Credencial y Estado
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'editar'}
            onClick={() => setActiveTab('editar')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'editar'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Editar Perfil y Caracterización
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'historial'}
            onClick={() => setActiveTab('historial')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              activeTab === 'historial'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Historial y Refuerzo ({historyRows.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CREDENCIAL INSTITUCIONAL DIGITAL Y ESTADO DE INDUCCIÓN */}
      {activeTab === 'credencial' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Cols: Official SENA Digital Credential */}
          <section
            aria-label="Carné Institucional Digital del Aprendiz"
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            {/* Institutional Green Header Band */}
            <div className="bg-[#15803d] dark:bg-emerald-900 px-6 py-5 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <SenaLogo className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold tracking-tight leading-tight">
                    SERVICIO NACIONAL DE APRENDIZAJE
                  </p>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Carné Institucional · Acreditación Aprendiz
                  </p>
                </div>
              </div>
              <div className="w-11 h-11 rounded-lg bg-white/95 p-1 flex items-center justify-center shrink-0">
                <SenaEscudo className="w-9 h-9 object-contain" />
              </div>
            </div>

            {/* Credential Identity Body */}
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                {user?.photoURL && !avatarError ? (
                  <img
                    src={user.photoURL}
                    alt={`Fotografía de perfil de ${effectiveName}`}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-display text-xl font-bold text-emerald-800 dark:text-emerald-400 shrink-0"
                  >
                    {computeInitials(effectiveName)}
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
                    <span>{profile.representationRole}</span>
                    <span aria-hidden="true">·</span>
                    <span>{profile.trainingLevel}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    {effectiveName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate">
                      {user?.email
                        ? `Cuenta verificada · ${user.email}`
                        : 'Expediente activo en prototipo'}
                    </span>
                    {!user && (
                      <>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={onRequestSignIn}
                          className="text-emerald-800 dark:text-emerald-400 hover:underline font-medium whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Respaldo nube opcional
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {profile.bioGoal.trim().length > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-3 border-t border-slate-100 dark:border-slate-800">
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    Proyecto formativo:{' '}
                  </strong>
                  {profile.bioGoal}
                </p>
              )}

              {/* Structured Institutional Fields */}
              <dl className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Código Carné / Registro</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {effectiveCode}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Grupo Sanguíneo y RH (SST)</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {profile.bloodType}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Ficha Caracterización</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums text-right">
                    {selectedFicha ? `Ficha ${selectedFicha.fichaCode}` : 'Exploración autónoma'}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Modalidad / Jornada</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {profile.modality} · {effectiveJornada}
                  </dd>
                </div>
                <div className="py-2.5 flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Programa</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {effectiveProgram}
                  </dd>
                </div>
                <div className="py-2.5 flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Centro / Regional</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {effectiveCenter}
                  </dd>
                </div>
                <div className="py-2.5 flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Etapa Productiva</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {gfpiSubmission
                      ? gfpiSubmission.selectedAlternative
                      : profile.preferredProductiveAlt}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Formato GFPI-F-165</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums text-right">
                    {gfpiSubmission
                      ? gfpiSubmission.status === 'radicado' ||
                        gfpiSubmission.status === 'validado_coordinacion'
                        ? `✓ ${gfpiSubmission.filingCode}`
                        : `◐ Borrador`
                      : '○ Pendiente'}
                  </dd>
                </div>
                <div className="py-2.5 flex items-start justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Enfoque Bienestar</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {profile.differentialFocus}
                  </dd>
                </div>
              </dl>

              {/* Verification Matrix & Credential Actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Código de verificación digital
                  </p>
                  <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {verification.code}
                  </p>
                  <p className={`text-xs ${statusMeta.toneClass}`}>{statusMeta.label}</p>
                </div>

                <svg
                  viewBox="0 0 70 70"
                  role="img"
                  aria-label={`Matriz de verificación institucional ${verification.code}`}
                  className="w-16 h-16 shrink-0 text-slate-900 dark:text-slate-100"
                >
                  <rect
                    x="0"
                    y="0"
                    width="70"
                    height="70"
                    rx="6"
                    className="fill-slate-100 dark:fill-slate-800"
                  />
                  {verification.bits.map((active, i) => {
                    const col = i % 7;
                    const row = Math.floor(i / 7);
                    const isCornerAnchor =
                      (col <= 1 && row <= 1) ||
                      (col >= 5 && row <= 1) ||
                      (col <= 1 && row >= 5);
                    if (!active && !isCornerAnchor) return null;
                    return (
                      <rect
                        key={i}
                        x={7 + col * 8}
                        y={7 + row * 8}
                        width="6"
                        height="6"
                        rx="1"
                        fill={isCornerAnchor ? '#15803d' : 'currentColor'}
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadCarneHtml}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Descargar carné digital
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('editar')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar datos
                </button>
              </div>
            </div>
          </section>

          {/* Right 7 Cols: Official Ficha Status, 4-Dimension Progress & Institutional Commitment */}
          <div className="lg:col-span-7 space-y-6">
            {/* Panel 1: Official Ficha Linkage & Academic Status */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vinculación académica y matrícula formativa
                  </p>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    Estado en Ficha de Caracterización
                  </h2>
                </div>
                <span className={`text-xs ${statusMeta.toneClass}`}>{statusMeta.label}</span>
              </div>

              {activeFichas.length === 0 ? (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Actualmente realizas tu recorrido de inducción en modalidad de exploración autónoma. Avanza por los módulos institucionales y presenta tu evaluación diagnóstica.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('evaluacion')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Ir a evaluación
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <label className="flex-1 space-y-1 block">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Ficha de Caracterización vinculada
                      </span>
                      <select
                        value={selectedFicha?.id ?? ''}
                        onChange={(e) => void onSyncWithFicha(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        {activeFichas.map((f) => (
                          <option key={f.id} value={f.id}>
                            Ficha {f.fichaCode} · {f.programName} ({f.jornada})
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      disabled={isSyncing || !selectedFicha}
                      onClick={() => selectedFicha && void onSyncWithFicha(selectedFicha.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar con Ficha'}
                    </button>
                  </div>

                  {selectedFicha && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{selectedFicha.centerName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Jornada {selectedFicha.jornada}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        Intentos evaluativos: {currentEnrollment?.attemptsCount ?? historyRows.length}
                      </span>
                      {syncFeedback && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-800 dark:text-emerald-400 font-medium">
                            ✓ {syncFeedback}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Panel 2: 4-Dimension Mastery Matrix */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    Avance por Dimensiones de Inducción
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {completedModules.length} de 4 dimensiones estudiadas · Meta evaluativa mínima: 70%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('evaluacion')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803d] dark:text-[#4ade80] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Ir a evaluación
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                {dimensionRows.map((dim) => {
                  const pct = dim.score ?? (dim.done ? 100 : 0);
                  return (
                    <div key={dim.id} className="py-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                            {dim.index}.
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {dim.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="text-slate-500 dark:text-slate-400">
                            {dim.done ? '✓ Estudio completado' : '○ Estudio pendiente'}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              dim.score === null
                                ? 'text-slate-500 dark:text-slate-400'
                                : dim.score >= 70
                                ? 'text-emerald-800 dark:text-emerald-400'
                                : 'text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {dim.score !== null ? `Prueba: ${dim.score}%` : 'Sin evaluar'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigate(dim.targetView)}
                            className="text-slate-700 dark:text-slate-200 hover:text-[#15803d] dark:hover:text-[#4ade80] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Abrir →
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            dim.score !== null && dim.score < 70
                              ? 'bg-amber-500'
                              : 'bg-[#15803d] dark:bg-[#39A900]'
                          }`}
                          style={{ width: `${Math.max(dim.done ? 25 : 0, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Panel 2.5: Official Formato GFPI-F-165 Productive Stage Selection */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                        Código GFPI-F-165 · V04
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Acuerdo 009/2024 Art. 26 · Dec. 0223/2026</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                      Selección de Alternativa de Etapa Productiva
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {gfpiSubmission
                        ? `Alternativa registrada en tu formato: ${gfpiSubmission.selectedAlternative} (${gfpiSubmission.procedureType}).`
                        : `Alternativa proyectada en perfil: ${profile.preferredProductiveAlt}. Diligencia y radica el formato oficial GFPI-F-165 desde tu proceso de inducción.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      gfpiSubmission &&
                      (gfpiSubmission.status === 'radicado' ||
                        gfpiSubmission.status === 'validado_coordinacion')
                        ? 'text-emerald-800 dark:text-emerald-400'
                        : gfpiSubmission
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {gfpiSubmission
                      ? gfpiSubmission.status === 'radicado' ||
                        gfpiSubmission.status === 'validado_coordinacion'
                        ? `✓ Radicado · ${gfpiSubmission.filingCode}`
                        : `◐ Borrador guardado · ${gfpiSubmission.filingCode}`
                      : '○ Formato GFPI-F-165 pendiente de diligenciar'}
                  </span>
                  {gfpiSubmission && (
                    <>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        ·
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        Prácticas: {gfpiSubmission.productivaStartDate} a{' '}
                        {gfpiSubmission.productivaEndDate}
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('formato165')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {gfpiSubmission
                    ? 'Ver / Modificar GFPI-F-165'
                    : 'Diligenciar Formato GFPI-F-165'}
                </button>
              </div>
            </section>

            {/* Panel 3: Institutional Commitment Subscription (Cap. III · Art. 8 · Numeral 01) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <FileCheck2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400">
                      Cap. III · Art. 8 · Numeral 01
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Deber Primario del Aprendiz</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Suscripción del Acta de Compromiso del Aprendiz SENA
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Declaro conocer y acatar los valores del Código de Integridad y las disposiciones del Reglamento del Aprendiz SENA (Acuerdo 009 de 2024, modificado por el Acuerdo 002 de 2026), asumiendo con responsabilidad mi proceso de Formación Profesional Integral gratuita.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <span
                  className={`text-xs font-semibold ${
                    profile.commitmentAccepted
                      ? 'text-emerald-800 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {profile.commitmentAccepted
                    ? '✓ Acta de compromiso suscrita digitalmente en tu perfil'
                    : '○ Pendiente de suscripción por parte del aprendiz'}
                </span>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void onToggleCommitment(!profile.commitmentAccepted)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    profile.commitmentAccepted
                      ? 'bg-emerald-700 dark:bg-[#16a34a] text-white border-emerald-700 dark:border-[#16a34a]'
                      : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 hover:bg-slate-800 dark:hover:bg-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {profile.commitmentAccepted
                    ? 'Compromiso suscrito'
                    : 'Suscribir acta de compromiso'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: EDITAR PERFIL Y CARACTERIZACIÓN INSTITUCIONAL */}
      {activeTab === 'editar' && (
        <form
          onSubmit={(e) => void handleFormSubmit(e)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-8"
        >
          <div className="space-y-1 pb-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Datos Académicos, Carné y Caracterización
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              En cumplimiento del Capítulo III (Art. 8 Numeral 04), mantén actualizados tus datos básicos de formación, seguridad ocupacional (RH) y proyección de Etapa Productiva.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nombre completo del aprendiz
              </span>
              <input
                type="text"
                required
                minLength={SCHEMA_LIMITS.apprenticeName.minLength}
                maxLength={SCHEMA_LIMITS.apprenticeName.maxLength}
                value={formState.apprenticeName}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, apprenticeName: e.target.value }))
                }
                placeholder="Nombres y apellidos"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Código de carné / registro (alfanumérico)
              </span>
              <input
                type="text"
                required
                minLength={SCHEMA_LIMITS.documentCode.minLength}
                maxLength={SCHEMA_LIMITS.documentCode.maxLength}
                value={formState.documentCode}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, documentCode: e.target.value }))
                }
                placeholder="Ej. APR-102400"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Grupo sanguíneo y factor RH (SST)
              </span>
              <select
                value={formState.bloodType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    bloodType: e.target.value as BloodType,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.profile.bloodType.allowed.map((rh) => (
                  <option key={rh} value={rh}>
                    {rh}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nivel de formación SENA
              </span>
              <select
                value={formState.trainingLevel}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    trainingLevel: e.target.value as TrainingLevelType,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.profile.trainingLevel.allowed.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modalidad de formación
              </span>
              <select
                value={formState.modality}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    modality: e.target.value as ModalityType,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.profile.modality.allowed.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ficha activa vinculada
              </span>
              <select
                value={formState.selectedFichaId}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, selectedFichaId: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="">Exploración libre (sin ficha vinculada)</option>
                {activeFichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fichaCode} · {f.programName}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block md:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Regional y Centro de Formación
              </span>
              <input
                type="text"
                required
                minLength={SCHEMA_LIMITS.profile.regionalCenter.minLength}
                maxLength={SCHEMA_LIMITS.profile.regionalCenter.maxLength}
                value={formState.regionalCenter}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, regionalCenter: e.target.value }))
                }
                placeholder="Ej. Regional Antioquia · Centro de Servicios y Gestión Empresarial"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </label>

            <div className="space-y-1.5 block">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="profile-productive-alt"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Alternativa proyectada de Etapa Productiva (2026)
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('formato165')}
                  className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  GFPI-F-165 →
                </button>
              </div>
              <select
                id="profile-productive-alt"
                value={formState.preferredProductiveAlt}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    preferredProductiveAlt: e.target.value as ProductiveAltType,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.profile.preferredProductiveAlt.allowed.map((alt) => (
                  <option key={alt} value={alt}>
                    {alt}
                  </option>
                ))}
              </select>
            </div>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rol de participación y representatividad (Art. 7)
              </span>
              <select
                value={formState.representationRole}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    representationRole: e.target.value as RepresentationRoleType,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.profile.representationRole.allowed.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Enfoque diferencial y Bienestar (Cap. II Num. 08–09)
              </span>
              <select
                value={formState.differentialFocus}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    differentialFocus: e.target.value as DifferentialFocusType,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.profile.differentialFocus.allowed.map((focus) => (
                  <option key={focus} value={focus}>
                    {focus}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Proyecto de vida y meta formativa en el SENA
                </span>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {formState.bioGoal.length} / {SCHEMA_LIMITS.profile.bioGoal.maxLength}
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={SCHEMA_LIMITS.profile.bioGoal.maxLength}
                value={formState.bioGoal}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, bioGoal: e.target.value }))
                }
                placeholder="Describe brevemente qué habilidades técnicas y humanas proyectas aportar a tu región o sector productivo..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </label>
          </div>

          {formError && (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              ▲ {formError}
            </p>
          )}

          {formSavedMsg && (
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
              ✓ {formSavedMsg}
            </p>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>
                Protección de datos: tu correo personal permanece aislado en bóveda privada y solo tú controlas este perfil.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormState(profile);
                  setActiveTab('credencial');
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Volver al carné
              </button>
              <button
                type="submit"
                disabled={isSyncing}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isSyncing ? 'Guardando...' : 'Guardar perfil del aprendiz'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: HISTORIAL DE EVALUACIONES Y PLAN DE REFUERZO */}
      {activeTab === 'historial' && (
        <div className="space-y-8">
          {/* 4-Column Summary KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Último puntaje</p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {historyRows[0] ? `${historyRows[0].score}%` : 'Sin intentos'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Umbral aprobatorio: 70%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Mejor resultado histórico</p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {bestScore !== null ? `${bestScore}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Sobre 10 casos diagnósticos
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Intentos presentados</p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {currentEnrollment?.attemptsCount ?? historyRows.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                 Trazabilidad evaluativa
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Juicio evaluativo vigente</p>
              <p className={`text-base font-bold ${statusMeta.toneClass}`}>
                {statusMeta.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acuerdo 009 de 2024
              </p>
            </div>
          </section>

          {/* Personalized Reinforcement Guidance */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Ruta de Apropiación y Plan de Refuerzo Personalizado
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {historyRows.length === 0
                    ? 'Aún no has presentado la evaluación interactiva. Completa la lectura de Identidad y Reglamento y realiza tu primer diagnóstico.'
                    : dimensionsToReinforce.length === 0
                    ? 'Excelente desempeño: superaste el umbral del 70% en todas las dimensiones evaluadas del proceso de inducción.'
                    : `Se identificaron ${dimensionsToReinforce.length} dimensión(es) con puntaje inferior al 70% que recomendamos repasar antes de presentar un nuevo intento:`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('evaluacion')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                {historyRows.length === 0 ? 'Presentar evaluación' : 'Nuevo intento evaluativo'}
              </button>
            </div>

            {dimensionsToReinforce.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {dimensionsToReinforce.map((dim) => (
                  <div
                    key={dim.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {dim.title}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span className="font-mono text-amber-800 dark:text-amber-300 font-semibold tabular-nums">
                        Resultado actual: {dim.score}%
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(dim.targetView)}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {dim.targetView === 'identidad' ? (
                        <BookOpen className="w-3.5 h-3.5" />
                      ) : (
                        <Scale className="w-3.5 h-3.5" />
                      )}
                      Repasar módulo
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Historical Evaluations Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Registro Histórico de Evaluaciones Diagnósticas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Desglose completo de tus intentos registrados por dimensión normativa e institucional.
              </p>
            </div>

            {historyRows.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Todavía no tienes evaluaciones registradas en tu historial
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Cuando completes la evaluación interactiva de 10 escenarios, cada intento aparecerá aquí con su calificación por competencia y juicio evaluativo.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('evaluacion')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Iniciar primera evaluación
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50">
                      <th className="py-3 px-4 font-semibold">Fecha</th>
                      <th className="py-3 px-4 font-semibold">Ficha</th>
                      <th className="py-3 px-4 font-semibold text-right">Global</th>
                      <th className="py-3 px-4 font-semibold text-right">Identidad</th>
                      <th className="py-3 px-4 font-semibold text-right">Valores</th>
                      <th className="py-3 px-4 font-semibold text-right">Derechos</th>
                      <th className="py-3 px-4 font-semibold text-right">Deberes</th>
                      <th className="py-3 px-4 font-semibold text-right">Tiempo</th>
                      <th className="py-3 px-4 font-semibold">Juicio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                    {historyRows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDateEs(row.createdAtMs)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.fichaCode}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-right text-slate-900 dark:text-slate-100">
                          {row.score}%
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-300">
                          {row.dimIdentity}%
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-300">
                          {row.dimValues}%
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-300">
                          {row.dimRights}%
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-300">
                          {row.dimDuties}%
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-500 dark:text-slate-400">
                          {formatDuration(row.durationSeconds)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              row.passed
                                ? 'text-emerald-800 dark:text-emerald-400'
                                : 'text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {row.passed ? '✓ Aprobado (A)' : '▲ Refuerzo (D)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
