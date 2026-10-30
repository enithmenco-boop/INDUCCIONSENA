import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FolderPlus,
  Link2,
  RefreshCw,
  Search,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  classifyGoogleAuthError,
  clearWorkspaceAccessToken,
  getWorkspaceAccessToken,
  GoogleAuthErrorDetails,
  googleWorkspaceSignIn,
  subscribeWorkspaceToken,
} from '../lib/firebase';
import {
  computeCohortSyncSignature,
  createAndSyncSenaWorkbook,
  inspectLocalXlsxTemplate,
  LocalXlsxInspectionResult,
  SHEET_TABS,
  syncCohortToExistingWorkbook,
  WorkspaceAuthError,
} from '../lib/googleSheetsSync';
import {
  closeFichaInFirestore,
  closeLocalFicha,
  createFichaInFirestore,
  createLocalFicha,
  EnrollmentRecord,
  EvaluationAttemptRecord,
  FichaRecord,
  FichaSheetLinkRecord,
  GfpiF165Record,
  LocalInstructorWorkspace,
  seedDemoCohortInFicha,
  seedDemoCohortInLocalFicha,
  subscribeFichaEnrollments,
  subscribeFichaEvaluations,
  subscribeFichaGfpiSubmissions,
  subscribeFichaSheetLink,
  subscribeInstructorFichas,
  updateInstructorReview,
  updateLocalInstructorName,
  updateLocalInstructorReview,
  upsertFichaSheetLink,
  upsertLocalFichaSheetLink,
} from '../lib/inductionStore';
import {
  AppropriationState,
  extractSpreadsheetIdFromInput,
  JornadaType,
  SCHEMA_LIMITS,
} from '../lib/validation';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SenaLogo } from './SenaLogo';

interface InstructorDashboardProps {
  user: User | null;
  authReady: boolean;
  localWorkspace: LocalInstructorWorkspace;
  onUpdateLocalWorkspace: (
    updater: (prev: LocalInstructorWorkspace) => LocalInstructorWorkspace
  ) => void;
}

type StatusFilter = 'todos' | AppropriationState;

interface PendingSheetConfirmAction {
  mode: 'create' | 'link' | 'sync';
  targetTitle: string;
  targetSpreadsheetId: string;
}

export function InstructorDashboard({
  user,
  authReady,
  localWorkspace,
  onUpdateLocalWorkspace,
}: InstructorDashboardProps) {
  const isCloudMode = Boolean(authReady && user && user.emailVerified);

  const [cloudFichas, setCloudFichas] = useState<FichaRecord[]>([]);
  const [loadingCloudFichas, setLoadingCloudFichas] = useState<boolean>(false);
  const [selectedFichaId, setSelectedFichaId] = useState<string>(
    () => localWorkspace.fichas[0]?.id ?? ''
  );
  const [cloudEnrollments, setCloudEnrollments] = useState<EnrollmentRecord[]>([]);
  const [loadingCloudEnrollments, setLoadingCloudEnrollments] = useState<boolean>(false);
  const [cloudGfpiSubmissions, setCloudGfpiSubmissions] = useState<GfpiF165Record[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const [editingInstructorName, setEditingInstructorName] = useState<boolean>(false);
  const [instructorNameDraft, setInstructorNameDraft] = useState<string>(
    localWorkspace.instructorName
  );

  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('2925810');
  const [newProgram, setNewProgram] = useState<string>(
    'Análisis y Desarrollo de Software'
  );
  const [newCenter, setNewCenter] = useState<string>(
    'Centro de Servicios y Gestión Empresarial · Regional Antioquia'
  );
  const [newJornada, setNewJornada] = useState<JornadaType>('Diurna');
  const [newInstructorName, setNewInstructorName] = useState<string>(
    localWorkspace.instructorName
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<boolean>(false);

  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [obsDraft, setObsDraft] = useState<string>('');
  const [stateDraft, setStateDraft] = useState<AppropriationState>('apropiado');
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  // Google Workspace (Drive + Sheets) live synchronization state
  const [cloudEvaluations, setCloudEvaluations] = useState<EvaluationAttemptRecord[]>([]);
  const [cloudSheetLink, setCloudSheetLink] = useState<FichaSheetLinkRecord | null>(null);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(() =>
    getWorkspaceAccessToken()
  );
  const [connectingGoogle, setConnectingGoogle] = useState<boolean>(false);
  const [sheetBusy, setSheetBusy] = useState<boolean>(false);
  const [sheetNotice, setSheetNotice] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetAuthError, setSheetAuthError] = useState<GoogleAuthErrorDetails | null>(
    null
  );
  const [sheetTitleDraft, setSheetTitleDraft] = useState<string>('');
  const [showLinkExistingSheet, setShowLinkExistingSheet] = useState<boolean>(false);
  const [existingSheetInput, setExistingSheetInput] = useState<string>('');
  const [templateInfo, setTemplateInfo] = useState<LocalXlsxInspectionResult | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingSheetConfirmAction | null>(
    null
  );
  const [confirmAutoSyncChecked, setConfirmAutoSyncChecked] = useState<boolean>(true);
  const [liveSyncSheetId, setLiveSyncSheetId] = useState<string | null>(null);

  const xlsxInputRef = useRef<HTMLInputElement | null>(null);
  const isSyncingSheetRef = useRef<boolean>(false);

  const isEmbeddedIframe = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const standaloneAppUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const unsub = subscribeWorkspaceToken((token) => {
      setWorkspaceToken(token);
      if (token) {
        setSheetAuthError(null);
      } else {
        setLiveSyncSheetId(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setInstructorNameDraft(localWorkspace.instructorName);
    setNewInstructorName((prev) =>
      prev.trim().length >= 2 ? prev : localWorkspace.instructorName
    );
  }, [localWorkspace.instructorName]);

  // Cloud mode subscription for Fichas (only when signed in with verified account)
  useEffect(() => {
    if (!isCloudMode || !user) {
      setCloudFichas([]);
      setLoadingCloudFichas(false);
      return;
    }
    setLoadingCloudFichas(true);
    const unsub = subscribeInstructorFichas(user.uid, user.email, (list) => {
      setCloudFichas(list);
      setLoadingCloudFichas(false);
      setSelectedFichaId((prev) => {
        if (prev && list.some((f) => f.id === prev)) return prev;
        if (list.length > 0) return list[0].id;
        if (prev && localWorkspace.fichas.some((f) => f.id === prev)) return prev;
        return localWorkspace.fichas[0]?.id ?? '';
      });
    });
    return () => unsub();
  }, [isCloudMode, user, localWorkspace.fichas]);

  // Keep selectedFichaId valid in passwordless local mode
  useEffect(() => {
    if (isCloudMode) return;
    setSelectedFichaId((prev) => {
      if (prev && localWorkspace.fichas.some((f) => f.id === prev)) {
        return prev;
      }
      return localWorkspace.fichas[0]?.id ?? '';
    });
  }, [isCloudMode, localWorkspace.fichas]);

  const fichas = useMemo(() => {
    if (!isCloudMode) {
      return localWorkspace.fichas;
    }
    const cloudCodes = new Set(cloudFichas.map((f) => f.fichaCode.trim().toLowerCase()));
    const remainingLocal = localWorkspace.fichas.filter(
      (lf) => !cloudCodes.has(lf.fichaCode.trim().toLowerCase())
    );
    return [...cloudFichas, ...remainingLocal];
  }, [isCloudMode, cloudFichas, localWorkspace.fichas]);

  const cloudSelectedFicha = useMemo(
    () =>
      isCloudMode
        ? cloudFichas.find((f) => f.id === selectedFichaId) ?? null
        : null,
    [isCloudMode, cloudFichas, selectedFichaId]
  );

  const isSelectedCloudFicha = cloudSelectedFicha !== null;
  const loadingFichas = isCloudMode && loadingCloudFichas && fichas.length === 0;

  // Cloud mode subscription for Enrollments (strictly when selected Ficha exists in Firestore)
  useEffect(() => {
    if (!isCloudMode || !user || !cloudSelectedFicha) {
      setCloudEnrollments([]);
      setLoadingCloudEnrollments(false);
      return;
    }
    setLoadingCloudEnrollments(true);
    const unsub = subscribeFichaEnrollments(
      cloudSelectedFicha.id,
      user.uid,
      user.email,
      'instructor',
      (list) => {
        setCloudEnrollments(list);
        setLoadingCloudEnrollments(false);
      }
    );
    return () => unsub();
  }, [isCloudMode, user, cloudSelectedFicha]);

  // Cloud mode subscription for GFPI-F-165 submissions linked to active Cloud Ficha
  useEffect(() => {
    if (!isCloudMode || !user || !cloudSelectedFicha) {
      setCloudGfpiSubmissions([]);
      return;
    }
    const unsub = subscribeFichaGfpiSubmissions(
      cloudSelectedFicha.id,
      user.uid,
      user.email,
      (list) => {
        setCloudGfpiSubmissions(list);
      }
    );
    return () => unsub();
  }, [isCloudMode, user, cloudSelectedFicha]);

  // Cloud mode subscription for Evaluation history of active Cloud Ficha
  useEffect(() => {
    if (!isCloudMode || !user || !cloudSelectedFicha) {
      setCloudEvaluations([]);
      return;
    }
    const unsub = subscribeFichaEvaluations(
      cloudSelectedFicha.id,
      user.uid,
      user.email,
      (list) => {
        setCloudEvaluations(list);
      }
    );
    return () => unsub();
  }, [isCloudMode, user, cloudSelectedFicha]);

  // Cloud mode subscription for Instructor-isolated Google Sheet link
  useEffect(() => {
    if (!isCloudMode || !user || !cloudSelectedFicha) {
      setCloudSheetLink(null);
      return;
    }
    const unsub = subscribeFichaSheetLink(cloudSelectedFicha.id, (link) => {
      setCloudSheetLink(link);
    });
    return () => unsub();
  }, [isCloudMode, user, cloudSelectedFicha]);

  const enrollments = useMemo(() => {
    if (isSelectedCloudFicha) return cloudEnrollments;
    return localWorkspace.enrollmentsByFicha[selectedFichaId] ?? [];
  }, [
    isSelectedCloudFicha,
    cloudEnrollments,
    localWorkspace.enrollmentsByFicha,
    selectedFichaId,
  ]);

  const loadingEnrollments = isSelectedCloudFicha ? loadingCloudEnrollments : false;

  const activeFicha = useMemo(
    () => fichas.find((f) => f.id === selectedFichaId) ?? null,
    [fichas, selectedFichaId]
  );

  // Pre-fill default Google Sheet title whenever active Ficha changes
  useEffect(() => {
    if (!activeFicha) return;
    setSheetTitleDraft(
      `SENA Inducción y GFPI-F-165 · Ficha ${activeFicha.fichaCode} · ${activeFicha.programName}`.slice(
        0,
        150
      )
    );
    setSheetError(null);
    setSheetNotice(null);
  }, [activeFicha?.id]);

  const activeSheetLink = useMemo(() => {
    if (!activeFicha) return null;
    if (isSelectedCloudFicha) {
      return cloudSheetLink ?? localWorkspace.sheetLinksByFicha[activeFicha.id] ?? null;
    }
    return localWorkspace.sheetLinksByFicha[activeFicha.id] ?? null;
  }, [
    activeFicha,
    isSelectedCloudFicha,
    cloudSheetLink,
    localWorkspace.sheetLinksByFicha,
  ]);

  const activeEvaluations = useMemo(() => {
    if (!activeFicha) return [];
    const localMatching = localWorkspace.localEvaluations.filter(
      (ev) => ev.fichaId === activeFicha.id || ev.fichaCode === activeFicha.fichaCode
    );
    if (!isSelectedCloudFicha) return localMatching;
    const seenIds = new Set(cloudEvaluations.map((ev) => ev.id));
    return [...cloudEvaluations, ...localMatching.filter((ev) => !seenIds.has(ev.id))];
  }, [
    activeFicha,
    isSelectedCloudFicha,
    cloudEvaluations,
    localWorkspace.localEvaluations,
  ]);

  const activeGfpiList = useMemo(() => {
    if (!activeFicha) return [];
    const enrollmentDocSet = new Set(
      enrollments.map((e) => e.documentCode.trim().toLowerCase())
    );
    const localMatching = Object.values(localWorkspace.gfpiByDocCode).filter(
      (sub) =>
        sub.fichaId === activeFicha.id ||
        sub.fichaCode === activeFicha.fichaCode ||
        enrollmentDocSet.has(sub.documentCode.trim().toLowerCase())
    );
    if (!isSelectedCloudFicha) return localMatching;
    const cloudDocSet = new Set(
      cloudGfpiSubmissions.map((s) => s.documentCode.trim().toLowerCase())
    );
    return [
      ...cloudGfpiSubmissions,
      ...localMatching.filter(
        (sub) => !cloudDocSet.has(sub.documentCode.trim().toLowerCase())
      ),
    ];
  }, [
    activeFicha,
    isSelectedCloudFicha,
    cloudGfpiSubmissions,
    enrollments,
    localWorkspace.gfpiByDocCode,
  ]);

  const cohortSyncSummary = useMemo(() => {
    if (!activeFicha) {
      return {
        signature: '',
        consolidadoCount: 0,
        gfpiCount: 0,
        evaluationsCount: 0,
        totalRows: 0,
      };
    }
    return computeCohortSyncSignature({
      ficha: activeFicha,
      enrollments,
      gfpiSubmissions: activeGfpiList,
      evaluations: activeEvaluations,
    });
  }, [activeFicha, enrollments, activeGfpiList, activeEvaluations]);

  const gfpiByEnrollmentId = useMemo(() => {
    const map: Record<string, GfpiF165Record> = {};
    for (const row of enrollments) {
      if (isSelectedCloudFicha) {
        const byAuthor =
          row.authorId && row.authorId !== activeFicha?.instructorId
            ? activeGfpiList.find((s) => s.userId === row.authorId)
            : undefined;
        const byDoc = activeGfpiList.find(
          (s) => s.documentCode.toLowerCase() === row.documentCode.toLowerCase()
        );
        const match = byAuthor ?? byDoc;
        if (match) {
          map[row.id] = match;
        }
      } else {
        const direct = localWorkspace.gfpiByDocCode[row.documentCode];
        if (direct) {
          map[row.id] = direct;
        } else {
          const fallback = Object.values(localWorkspace.gfpiByDocCode).find(
            (s) => s.documentCode.toLowerCase() === row.documentCode.toLowerCase()
          );
          if (fallback) {
            map[row.id] = fallback;
          }
        }
      }
    }
    return map;
  }, [
    enrollments,
    isSelectedCloudFicha,
    activeGfpiList,
    localWorkspace.gfpiByDocCode,
    activeFicha?.instructorId,
  ]);

  const effectiveInstructorLabel = isCloudMode
    ? user?.displayName || user?.email || 'Instructor SENA'
    : activeFicha?.instructorName || localWorkspace.instructorName;

  const selectedEnrollment = useMemo(
    () => enrollments.find((e) => e.id === selectedEnrollmentId) ?? null,
    [enrollments, selectedEnrollmentId]
  );

  useEffect(() => {
    if (selectedEnrollment) {
      setObsDraft(selectedEnrollment.instructorObservation);
      setStateDraft(selectedEnrollment.appropriationState);
      setReviewNotice(null);
    }
  }, [selectedEnrollment]);

  const filteredEnrollments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrollments.filter((item) => {
      const matchesStatus =
        statusFilter === 'todos' || item.appropriationState === statusFilter;
      const matchesQuery =
        !q ||
        item.apprenticeName.toLowerCase().includes(q) ||
        item.documentCode.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [enrollments, searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    const total = enrollments.length;
    if (total === 0) {
      return {
        total: 0,
        appropriatedCount: 0,
        appropriationRate: 0,
        avgScore: 0,
        dimAverages: { identidad: 0, valores: 0, derechos: 0, deberes: 0 },
        gfpiSubmittedCount: 0,
        weakestLabel: 'Sin evaluaciones',
      };
    }

    const evaluated = enrollments.filter((e) => e.attemptsCount > 0);
    const appropriatedCount = enrollments.filter(
      (e) =>
        e.appropriationState === 'apropiado' || e.appropriationState === 'certificado'
    ).length;

    const avgScore =
      evaluated.length > 0
        ? Math.round(
            evaluated.reduce((acc, e) => acc + e.evalScore, 0) / evaluated.length
          )
        : 0;

    const calcDim = (pick: (e: EnrollmentRecord) => number) =>
      evaluated.length > 0
        ? Math.round(evaluated.reduce((acc, e) => acc + pick(e), 0) / evaluated.length)
        : 0;

    const dimAverages = {
      identidad: calcDim((e) => e.dimIdentity),
      valores: calcDim((e) => e.dimValues),
      derechos: calcDim((e) => e.dimRights),
      deberes: calcDim((e) => e.dimDuties),
    };

    const entries: { label: string; val: number }[] = [
      { label: 'Identidad Institucional', val: dimAverages.identidad },
      { label: 'Valores e Integridad', val: dimAverages.valores },
      { label: 'Derechos del Aprendiz', val: dimAverages.derechos },
      { label: 'Deberes y SST', val: dimAverages.deberes },
    ];
    entries.sort((a, b) => a.val - b.val);

    const gfpiSubmittedCount = enrollments.filter((e) => {
      const rec = gfpiByEnrollmentId[e.id];
      return Boolean(rec && (rec.status === 'radicado' || rec.status === 'validado_coordinacion'));
    }).length;

    return {
      total,
      appropriatedCount,
      appropriationRate: Math.round((appropriatedCount / total) * 100),
      avgScore,
      dimAverages,
      gfpiSubmittedCount,
      weakestLabel:
        evaluated.length > 0
          ? `${entries[0].label} (${entries[0].val}%)`
          : 'Pendiente de evaluación',
    };
  }, [enrollments, gfpiByEnrollmentId]);

  function handleSaveInstructorName(e: React.FormEvent) {
    e.preventDefault();
    if (instructorNameDraft.trim().length < 2) return;
    onUpdateLocalWorkspace((prev) =>
      updateLocalInstructorName(prev, instructorNameDraft)
    );
    setNewInstructorName(instructorNameDraft.trim());
    setEditingInstructorName(false);
  }

  async function handleCreateFicha(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusyAction(true);

    const chosenInstructor = isCloudMode
      ? user?.displayName || newInstructorName || 'Instructor SENA'
      : newInstructorName.trim() || localWorkspace.instructorName;

    try {
      if (isCloudMode && user) {
        const createdId = await createFichaInFirestore({
          fichaCode: newCode,
          programName: newProgram,
          centerName: newCenter,
          jornada: newJornada,
          instructorName: chosenInstructor,
        });
        setSelectedFichaId(createdId);
      } else {
        let createdId = '';
        onUpdateLocalWorkspace((prev) => {
          const result = createLocalFicha(prev, {
            fichaCode: newCode,
            programName: newProgram,
            centerName: newCenter,
            jornada: newJornada,
            instructorName: chosenInstructor,
          });
          createdId = result.createdId;
          return result.workspace;
        });
        if (createdId) {
          setSelectedFichaId(createdId);
        }
      }
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la ficha.');
    } finally {
      setBusyAction(false);
    }
  }

  async function handleSeedCohort() {
    if (!activeFicha) return;
    setBusyAction(true);
    try {
      if (isSelectedCloudFicha && user) {
        await seedDemoCohortInFicha(activeFicha);
      } else {
        onUpdateLocalWorkspace((prev) => seedDemoCohortInLocalFicha(prev, activeFicha));
      }
    } finally {
      setBusyAction(false);
    }
  }

  async function handleCloseActiveFicha() {
    if (!activeFicha) return;
    setBusyAction(true);
    try {
      if (isSelectedCloudFicha && user) {
        await closeFichaInFirestore(activeFicha.id);
      } else {
        onUpdateLocalWorkspace((prev) => closeLocalFicha(prev, activeFicha.id));
      }
    } finally {
      setBusyAction(false);
    }
  }

  async function handleSaveReview(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFicha || !selectedEnrollment) return;
    setBusyAction(true);
    setReviewNotice(null);
    try {
      if (isSelectedCloudFicha && user) {
        await updateInstructorReview({
          fichaId: activeFicha.id,
          enrollmentId: selectedEnrollment.id,
          appropriationState: stateDraft,
          instructorObservation: obsDraft,
        });
      } else {
        onUpdateLocalWorkspace((prev) =>
          updateLocalInstructorReview(prev, {
            fichaId: activeFicha.id,
            enrollmentId: selectedEnrollment.id,
            appropriationState: stateDraft,
            instructorObservation: obsDraft,
          })
        );
      }
      setReviewNotice('Seguimiento pedagógico actualizado correctamente.');
    } catch (err) {
      setReviewNotice(
        err instanceof Error ? err.message : 'Error al guardar la observación.'
      );
    } finally {
      setBusyAction(false);
    }
  }

  function handleExportCsv() {
    if (!activeFicha || enrollments.length === 0) return;
    const header = [
      'Aprendiz',
      'Codigo_Carne',
      'Ficha',
      'Programa',
      'Modulos_Completados',
      'Puntaje_Global',
      'Identidad_Pct',
      'Valores_Pct',
      'Derechos_Pct',
      'Deberes_Pct',
      'Estado_Apropiacion',
      'Estado_GFPI_F_165',
      'Alternativa_GFPI_F_165',
      'Radicado_GFPI_F_165',
      'Observacion_Instructor',
    ];
    const rows = enrollments.map((r) => {
      const gfpi = gfpiByEnrollmentId[r.id];
      return [
        `"${r.apprenticeName.replace(/"/g, '""')}"`,
        `"${r.documentCode}"`,
        `"${r.fichaCode}"`,
        `"${r.programName.replace(/"/g, '""')}"`,
        `${r.completedModules.length}/4`,
        `${r.evalScore}`,
        `${r.dimIdentity}`,
        `${r.dimValues}`,
        `${r.dimRights}`,
        `${r.dimDuties}`,
        `"${r.appropriationState}"`,
        `"${gfpi ? gfpi.status : 'pendiente'}"`,
        `"${gfpi ? gfpi.selectedAlternative.replace(/"/g, '""') : 'Sin diligenciar'}"`,
        `"${gfpi ? gfpi.filingCode : ''}"`,
        `"${r.instructorObservation.replace(/"/g, '""')}"`,
      ];
    });
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_induccion_ficha_${activeFicha.fichaCode}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function persistSheetLinkMetadata(
    ficha: FichaRecord,
    payload: {
      spreadsheetId: string;
      spreadsheetUrl: string;
      spreadsheetTitle: string;
      templateSourceName: string;
      lastSyncedRows: number;
      lastDataSignature: string;
    }
  ): Promise<void> {
    const canSaveCloud =
      isCloudMode &&
      user &&
      cloudFichas.some((cf) => cf.id === ficha.id) &&
      (ficha.instructorId === user.uid || user.email === BOOTSTRAP_ADMIN_EMAIL);

    if (canSaveCloud) {
      const saved = await upsertFichaSheetLink(ficha, payload);
      setCloudSheetLink(saved);
    }

    onUpdateLocalWorkspace((prev) => upsertLocalFichaSheetLink(prev, ficha, payload).workspace);
  }

  async function handleConnectGoogleWorkspace(forceConsent = false) {
    setSheetError(null);
    setSheetAuthError(null);
    setSheetNotice(null);
    setConnectingGoogle(true);
    try {
      const { accessToken } = await googleWorkspaceSignIn(forceConsent);
      setWorkspaceToken(accessToken);
      setSheetNotice(
        'Cuenta de Google conectada con permisos para Google Drive y Google Sheets.'
      );
    } catch (err) {
      setSheetAuthError(classifyGoogleAuthError(err));
    } finally {
      setConnectingGoogle(false);
    }
  }

  async function handleInspectXlsxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSheetError(null);
    const result = await inspectLocalXlsxTemplate(file);
    setTemplateInfo(result);
    setSheetNotice(
      result.matchesGfpi165
        ? `Plantilla oficial reconocida (${result.fileName}). La hoja en Google Drive replicará todas las casillas y columnas GFPI-F-165.`
        : `Archivo ${result.fileName} inspeccionado. Se aplicará la estructura estándar GFPI-F-165 V04.`
    );
    e.target.value = '';
  }

  function requestCreateWorkbookModal() {
    if (!activeFicha) return;
    setSheetError(null);
    const cleanTitle =
      sheetTitleDraft.trim() ||
      `SENA Inducción y GFPI-F-165 · Ficha ${activeFicha.fichaCode}`;
    setConfirmAutoSyncChecked(true);
    setPendingConfirm({
      mode: 'create',
      targetTitle: cleanTitle,
      targetSpreadsheetId: '',
    });
  }

  function requestLinkExistingWorkbookModal(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFicha) return;
    setSheetError(null);
    const extractedId = extractSpreadsheetIdFromInput(existingSheetInput);
    if (
      extractedId.length < SCHEMA_LIMITS.sheetLink.spreadsheetId.minLength ||
      !SCHEMA_LIMITS.sheetLink.spreadsheetId.pattern.test(extractedId)
    ) {
      setSheetError(
        'Pega una URL completa de Google Sheets o un ID de hoja válido.'
      );
      return;
    }
    setConfirmAutoSyncChecked(true);
    setPendingConfirm({
      mode: 'link',
      targetTitle: `Hoja existente (${extractedId.slice(0, 16)}...)`,
      targetSpreadsheetId: extractedId,
    });
  }

  function requestManualSyncModal() {
    if (!activeFicha || !activeSheetLink) return;
    setSheetError(null);
    setConfirmAutoSyncChecked(true);
    setPendingConfirm({
      mode: 'sync',
      targetTitle: activeSheetLink.spreadsheetTitle,
      targetSpreadsheetId: activeSheetLink.spreadsheetId,
    });
  }

  async function handleConfirmSheetMutation() {
    if (!pendingConfirm || !activeFicha) return;
    const token = workspaceToken ?? getWorkspaceAccessToken();
    if (!token) {
      setPendingConfirm(null);
      setSheetError('Conecta primero tu cuenta de Google para escribir en Google Sheets.');
      return;
    }

    const action = pendingConfirm;
    const enableLive = confirmAutoSyncChecked;
    setPendingConfirm(null);
    setSheetBusy(true);
    setSheetError(null);
    setSheetNotice(null);
    isSyncingSheetRef.current = true;

    try {
      const cohortPayload = {
        ficha: activeFicha,
        enrollments,
        gfpiSubmissions: activeGfpiList,
        evaluations: activeEvaluations,
      };

      const synced =
        action.mode === 'create'
          ? await createAndSyncSenaWorkbook({
              accessToken: token,
              customTitle: action.targetTitle,
              cohort: cohortPayload,
            })
          : await syncCohortToExistingWorkbook({
              accessToken: token,
              spreadsheetId: action.targetSpreadsheetId,
              cohort: cohortPayload,
            });

      const templateLabel =
        templateInfo?.fileName ||
        activeSheetLink?.templateSourceName ||
        'Estructura Oficial SENA GFPI-F-165 V04';

      await persistSheetLinkMetadata(activeFicha, {
        spreadsheetId: synced.spreadsheetId,
        spreadsheetUrl: synced.spreadsheetUrl,
        spreadsheetTitle: synced.spreadsheetTitle,
        templateSourceName: templateLabel,
        lastSyncedRows: synced.syncedRows,
        lastDataSignature: synced.signature,
      });

      setShowLinkExistingSheet(false);
      setExistingSheetInput('');
      setLiveSyncSheetId(enableLive ? synced.spreadsheetId : null);

      const timeStr = new Intl.DateTimeFormat('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date());

      setSheetNotice(
        action.mode === 'create'
          ? `Hoja "${synced.spreadsheetTitle}" creada en tu Google Drive y sincronizada (${timeStr}).`
          : `Hoja "${synced.spreadsheetTitle}" actualizada exitosamente (${timeStr}).`
      );
    } catch (err) {
      if (err instanceof WorkspaceAuthError) {
        clearWorkspaceAccessToken();
        setLiveSyncSheetId(null);
      }
      setSheetError(
        err instanceof Error
          ? err.message
          : 'No fue posible completar la sincronización con Google Sheets.'
      );
    } finally {
      isSyncingSheetRef.current = false;
      setSheetBusy(false);
    }
  }

  async function handlePublishDemoFichaToCloud() {
    if (!isCloudMode || !user) return;
    setBusyAction(true);
    setFormError(null);
    try {
      const sourceFicha = activeFicha && !isSelectedCloudFicha ? activeFicha : null;
      const targetCode = sourceFicha?.fichaCode || '2874510';
      const targetProgram =
        sourceFicha?.programName || 'Análisis y Desarrollo de Software';
      const targetCenter =
        sourceFicha?.centerName ||
        'Centro de Servicios y Gestión Empresarial · Regional Antioquia';
      const targetJornada: JornadaType = sourceFicha?.jornada || 'Diurna';
      const targetInstructor =
        user.displayName || localWorkspace.instructorName || 'Instructor SENA';

      const createdId = await createFichaInFirestore({
        fichaCode: targetCode,
        programName: targetProgram,
        centerName: targetCenter,
        jornada: targetJornada,
        instructorName: targetInstructor,
      });
      const tempFicha: FichaRecord = {
        id: createdId,
        fichaCode: targetCode,
        programName: targetProgram,
        centerName: targetCenter,
        jornada: targetJornada,
        instructorId: user.uid,
        instructorName: targetInstructor,
        status: 'activa',
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };
      await seedDemoCohortInFicha(tempFicha);

      if (sourceFicha) {
        const existingLocalLink = localWorkspace.sheetLinksByFicha[sourceFicha.id];
        if (existingLocalLink) {
          const savedCloudLink = await upsertFichaSheetLink(tempFicha, {
            spreadsheetId: existingLocalLink.spreadsheetId,
            spreadsheetUrl: existingLocalLink.spreadsheetUrl,
            spreadsheetTitle: existingLocalLink.spreadsheetTitle,
            templateSourceName: existingLocalLink.templateSourceName,
            lastSyncedRows: existingLocalLink.lastSyncedRows,
            lastDataSignature: existingLocalLink.lastDataSignature,
          });
          setCloudSheetLink(savedCloudLink);
          onUpdateLocalWorkspace(
            (prev) =>
              upsertLocalFichaSheetLink(prev, tempFicha, {
                spreadsheetId: existingLocalLink.spreadsheetId,
                spreadsheetUrl: existingLocalLink.spreadsheetUrl,
                spreadsheetTitle: existingLocalLink.spreadsheetTitle,
                templateSourceName: existingLocalLink.templateSourceName,
                lastSyncedRows: existingLocalLink.lastSyncedRows,
                lastDataSignature: existingLocalLink.lastDataSignature,
              }).workspace
          );
        }
      }

      setSelectedFichaId(createdId);
      setSheetNotice(
        `Ficha ${targetCode} publicada en la nube para sincronización multi-dispositivo.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No fue posible inicializar la ficha en la nube.'
      );
    } finally {
      setBusyAction(false);
    }
  }

  // Real-time debounced auto-sync when instructor has authorized live session sync
  useEffect(() => {
    if (
      !activeFicha ||
      !activeSheetLink ||
      !workspaceToken ||
      liveSyncSheetId !== activeSheetLink.spreadsheetId ||
      !cohortSyncSummary.signature ||
      cohortSyncSummary.signature === activeSheetLink.lastDataSignature
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (isSyncingSheetRef.current) return;
      isSyncingSheetRef.current = true;
      setSheetBusy(true);

      void syncCohortToExistingWorkbook({
        accessToken: workspaceToken,
        spreadsheetId: activeSheetLink.spreadsheetId,
        cohort: {
          ficha: activeFicha,
          enrollments,
          gfpiSubmissions: activeGfpiList,
          evaluations: activeEvaluations,
        },
      })
        .then(async (synced) => {
          await persistSheetLinkMetadata(activeFicha, {
            spreadsheetId: synced.spreadsheetId,
            spreadsheetUrl: synced.spreadsheetUrl,
            spreadsheetTitle: synced.spreadsheetTitle,
            templateSourceName:
              activeSheetLink.templateSourceName ||
              'Estructura Oficial SENA GFPI-F-165 V04',
            lastSyncedRows: synced.syncedRows,
            lastDataSignature: synced.signature,
          });
          const timeStr = new Intl.DateTimeFormat('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(new Date());
          setSheetNotice(
            `Sincronización automática en vivo completada (${timeStr}).`
          );
          setSheetError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof WorkspaceAuthError) {
            clearWorkspaceAccessToken();
            setLiveSyncSheetId(null);
          }
          setSheetError(
            err instanceof Error
              ? err.message
              : 'Error durante la sincronización automática con Google Sheets.'
          );
        })
        .finally(() => {
          isSyncingSheetRef.current = false;
          setSheetBusy(false);
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    activeFicha,
    activeSheetLink,
    workspaceToken,
    liveSyncSheetId,
    cohortSyncSummary.signature,
    enrollments,
    activeGfpiList,
    activeEvaluations,
  ]);

  function renderStateLabel(state: AppropriationState): React.ReactNode {
    switch (state) {
      case 'certificado':
        return (
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 whitespace-nowrap">
            ✓ Certificado (A)
          </span>
        );
      case 'apropiado':
        return (
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            ● Apropiado (A)
          </span>
        );
      case 'plan_mejoramiento':
        return (
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">
            ▲ Plan mejoramiento (D)
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            ○ En proceso
          </span>
        );
    }
  }

  const canCloseActiveFicha =
    activeFicha !== null &&
    activeFicha.status === 'activa' &&
    (!isSelectedCloudFicha || activeFicha.instructorId === user?.uid);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Workspace Header (Direct Passwordless Access) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <SenaLogo className="w-5 h-5" />
            <span>Gestión de Inducción SENA</span>
            <span aria-hidden="true">·</span>
            <span>Acceso directo de Instructor</span>
            <span aria-hidden="true">·</span>
            {!isCloudMode && editingInstructorName ? (
              <form
                onSubmit={handleSaveInstructorName}
                className="inline-flex items-center gap-1.5"
              >
                <input
                  type="text"
                  required
                  minLength={SCHEMA_LIMITS.instructorName.minLength}
                  maxLength={SCHEMA_LIMITS.instructorName.maxLength}
                  value={instructorNameDraft}
                  onChange={(e) => setInstructorNameDraft(e.target.value)}
                  aria-label="Nombre del instructor gestor"
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInstructorNameDraft(localWorkspace.instructorName);
                    setEditingInstructorName(false);
                  }}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {effectiveInstructorLabel}
                </span>
                {!isCloudMode && (
                  <button
                    type="button"
                    onClick={() => setEditingInstructorName(true)}
                    className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400 hover:underline font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Cambiar nombre
                  </button>
                )}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50 balance-text">
            Seguimiento de Fichas y Apropiación de Aprendices
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {fichas.length > 0 && (
            <select
              aria-label="Seleccionar Ficha de Caracterización"
              value={selectedFichaId}
              onChange={(e) => {
                setSelectedFichaId(e.target.value);
                setSelectedEnrollmentId(null);
              }}
              className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {fichas.map((f) => {
                const isCloudItem = cloudFichas.some((cf) => cf.id === f.id);
                const scopeTag = isCloudMode ? (isCloudItem ? ' · Nube' : ' · Local') : '';
                return (
                  <option key={f.id} value={f.id}>
                    Ficha {f.fichaCode} · {f.programName} ({f.status}{scopeTag})
                  </option>
                );
              })}
            </select>
          )}

          {isCloudMode && activeFicha && !isSelectedCloudFicha && (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => void handlePublishDemoFichaToCloud()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              {busyAction ? 'Publicando...' : 'Publicar Ficha en la nube'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            {showCreateForm ? 'Cancelar creación' : 'Nueva Ficha'}
          </button>

          {activeFicha && enrollments.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Create Ficha Inline Panel */}
      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreateFicha(e)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Registrar nueva Ficha de Caracterización SENA
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Número de Ficha
              </span>
              <input
                type="text"
                required
                maxLength={SCHEMA_LIMITS.fichaCode.maxLength}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Ej. 2925810"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </label>

            <label className="space-y-1 block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Programa de Formación
              </span>
              <input
                type="text"
                required
                maxLength={SCHEMA_LIMITS.programName.maxLength}
                value={newProgram}
                onChange={(e) => setNewProgram(e.target.value)}
                placeholder="Ej. Análisis y Desarrollo de Software"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jornada
              </span>
              <select
                value={newJornada}
                onChange={(e) => setNewJornada(e.target.value as JornadaType)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SCHEMA_LIMITS.jornada.allowed.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Centro de Formación y Regional
              </span>
              <input
                type="text"
                required
                maxLength={SCHEMA_LIMITS.centerName.maxLength}
                value={newCenter}
                onChange={(e) => setNewCenter(e.target.value)}
                placeholder="Ej. Centro de Servicios y Gestión Empresarial · Regional Antioquia"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instructor Gestor
              </span>
              <input
                type="text"
                required
                minLength={SCHEMA_LIMITS.instructorName.minLength}
                maxLength={SCHEMA_LIMITS.instructorName.maxLength}
                value={newInstructorName}
                onChange={(e) => setNewInstructorName(e.target.value)}
                placeholder="Nombre del instructor"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={busyAction}
                className="w-full px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {busyAction ? 'Creando...' : 'Crear Ficha Activa'}
              </button>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-700 dark:text-rose-400 font-medium">
              {formError}
            </p>
          )}
        </form>
      )}

      {/* Loading Skeleton for Cloud Mode */}
      {loadingFichas && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-4">
          <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/60 rounded" />
        </div>
      )}

      {/* Empty State when no Fichas exist */}
      {!loadingFichas && fichas.length === 0 && !showCreateForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <Users className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Aún no tienes Fichas registradas
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Crea tu primera Ficha de Caracterización para que los aprendices se vinculen o carga una cohorte demostrativa para analizar resultados de apropiación.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Crear primera Ficha
            </button>
            {isCloudMode && (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void handlePublishDemoFichaToCloud()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                {busyAction
                  ? 'Inicializando Ficha 2874590...'
                  : 'Inicializar con Ficha ejemplo 2874590'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Ficha Dashboard */}
      {activeFicha && (
        <>
          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aprendices en la Ficha
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.total}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ficha{' '}
                <span className="font-mono tabular-nums">{activeFicha.fichaCode}</span> ·{' '}
                GFPI-F-165 radicados:{' '}
                <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                  {kpis.gfpiSubmittedCount}/{kpis.total}
                </span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasa de Apropiación (≥70%)
              </p>
              <p className="font-mono text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                {kpis.appropriationRate}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {kpis.appropriatedCount} de {kpis.total} con Juicio A
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Promedio Evaluativo
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.avgScore}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escala cuantitativa 0–100%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dimensión con Mayor Brecha
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 leading-snug">
                {kpis.weakestLabel}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Foco sugerido de refuerzo grupal
              </p>
            </div>
          </div>

          {/* Live Google Drive & Google Sheets Synchronization Panel */}
          <section
            aria-label="Sincronización con Google Drive y Google Sheets"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <FileSpreadsheet className="w-4 h-4 text-[#15803d] dark:text-[#4ade80] shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Google Drive · Google Sheets
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Consolidado de Inducción y Formato Oficial GFPI-F-165</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Hoja de cálculo sincronizada a medida que los aprendices responden
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Crea o vincula el libro de seguimiento en tu unidad de Google Drive con 4 pestañas estructuradas ({SHEET_TABS.CONSOLIDADO}, {SHEET_TABS.GFPI_RESPUESTAS}, {SHEET_TABS.GFPI_INDIVIDUAL} con casillas <span className="font-mono font-semibold">[ X ]</span> imprimibles y {SHEET_TABS.EVALUACIONES}), actualizando cada aprendiz por número de documento sin duplicar filas.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5 shrink-0">
                {!workspaceToken ? (
                  <div className="space-y-1.5 sm:text-right">
                    <GoogleSignInButton
                      label={user ? 'Autorizar Google Drive y Sheets' : 'Conectar con Google'}
                      onClick={() => void handleConnectGoogleWorkspace(false)}
                      loading={connectingGoogle}
                    />
                    {user ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Autoriza el acceso en memoria a Google Drive y Sheets para esta sesión.
                      </p>
                    ) : (
                      isEmbeddedIframe &&
                      standaloneAppUrl && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          ¿Tu navegador cierra la ventana emergente?{' '}
                          <a
                            href={standaloneAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#15803d] dark:text-[#4ade80] hover:underline"
                          >
                            Abrir en pestaña completa
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      )
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-emerald-800 dark:text-emerald-400 font-semibold">
                      ✓ Google Drive conectado{user?.email ? ` (${user.email})` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={connectingGoogle || sheetBusy}
                      onClick={() => void handleConnectGoogleWorkspace(true)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cambiar cuenta / permisos
                    </button>
                  </div>
                )}

                <input
                  ref={xlsxInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => void handleInspectXlsxFile(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => xlsxInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-[#15803d] dark:hover:text-[#4ade80] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar referencia .xlsx GFPI-F-165 desde mi equipo
                </button>
              </div>
            </div>

            {templateInfo && (
              <div className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Referencia local verificada: {templateInfo.fileName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {templateInfo.sheetNames.length > 0
                      ? `Pestañas detectadas en Excel: ${templateInfo.sheetNames.join(' · ')}`
                      : 'Estructura mapeada al estándar institucional GFPI-F-165 V04'}
                    {templateInfo.detectedHeaders.length > 0
                      ? ` — Campos clave: ${templateInfo.detectedHeaders.slice(0, 5).join(', ')}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateInfo(null)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Quitar referencia
                </button>
              </div>
            )}

            {/* Workbook Creation or Active Sheet Controls */}
            {!activeSheetLink ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <label className="lg:col-span-7 space-y-1 block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Título de la nueva hoja de cálculo en tu Google Drive
                    </span>
                    <input
                      type="text"
                      maxLength={SCHEMA_LIMITS.sheetLink.spreadsheetTitle.maxLength}
                      value={sheetTitleDraft}
                      onChange={(e) => setSheetTitleDraft(e.target.value)}
                      placeholder="SENA Inducción y GFPI-F-165 · Ficha..."
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <div className="lg:col-span-5 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!workspaceToken || sheetBusy}
                      onClick={requestCreateWorkbookModal}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {sheetBusy ? 'Creando hoja...' : 'Crear hoja en Google Drive'}
                    </button>

                    <button
                      type="button"
                      disabled={!workspaceToken || sheetBusy}
                      onClick={() => setShowLinkExistingSheet((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {showLinkExistingSheet ? 'Cancelar vínculo' : 'Vincular hoja existente'}
                    </button>
                  </div>
                </div>

                {showLinkExistingSheet && (
                  <form
                    onSubmit={requestLinkExistingWorkbookModal}
                    className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                  >
                    <label className="flex-1 space-y-1 block">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        URL o ID de hoja de cálculo de Google Sheets existente
                      </span>
                      <input
                        type="text"
                        required
                        value={existingSheetInput}
                        onChange={(e) => setExistingSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/1AbC... o ID directo"
                        className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!workspaceToken || sheetBusy}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Verificar y sincronizar
                    </button>
                  </form>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Registros listos para sincronizar en Ficha {activeFicha.fichaCode}:{' '}
                  {cohortSyncSummary.consolidadoCount} aprendices en consolidado ·{' '}
                  {cohortSyncSummary.gfpiCount} formatos GFPI-F-165 ·{' '}
                  {cohortSyncSummary.evaluationsCount} intentos de evaluación
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {activeSheetLink.spreadsheetTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {activeSheetLink.lastSyncedRows} filas sincronizadas
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          cohortSyncSummary.signature === activeSheetLink.lastDataSignature
                            ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                            : 'text-amber-800 dark:text-amber-300 font-semibold'
                        }
                      >
                        {cohortSyncSummary.signature === activeSheetLink.lastDataSignature
                          ? '✓ Al día con las respuestas actuales'
                          : '◐ Nuevas respuestas listas para sincronizar'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      Última actualización:{' '}
                      {new Intl.DateTimeFormat('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(activeSheetLink.updatedAtMs))}{' '}
                      · Plantilla: {activeSheetLink.templateSourceName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={activeSheetLink.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir en Google Sheets
                    </a>

                    <button
                      type="button"
                      disabled={!workspaceToken || sheetBusy}
                      onClick={requestManualSyncModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sheetBusy ? 'animate-spin' : ''}`} />
                      {sheetBusy ? 'Sincronizando...' : 'Sincronizar cambios'}
                    </button>

                    {workspaceToken && (
                      <button
                        type="button"
                        disabled={sheetBusy}
                        onClick={() => {
                          if (liveSyncSheetId === activeSheetLink.spreadsheetId) {
                            setLiveSyncSheetId(null);
                            setSheetNotice('Sincronización automática en vivo pausada.');
                          } else {
                            requestManualSyncModal();
                          }
                        }}
                        className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          liveSyncSheetId === activeSheetLink.spreadsheetId
                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {liveSyncSheetId === activeSheetLink.spreadsheetId
                          ? '✓ Auto-sync en vivo activo (Pausar)'
                          : 'Activar auto-sync en vivo'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!workspaceToken || sheetBusy}
                      onClick={() => setShowLinkExistingSheet((v) => !v)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cambiar hoja
                    </button>
                  </div>
                </div>

                {showLinkExistingSheet && (
                  <form
                    onSubmit={requestLinkExistingWorkbookModal}
                    className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
                  >
                    <label className="flex-1 space-y-1 block">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Reemplazar por otra URL o ID de Google Sheets
                      </span>
                      <input
                        type="text"
                        required
                        value={existingSheetInput}
                        onChange={(e) => setExistingSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/1AbC... o ID directo"
                        className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!workspaceToken || sheetBusy}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cambiar y sincronizar
                    </button>
                  </form>
                )}
              </div>
            )}

            {sheetNotice && (
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                ✓ {sheetNotice}
              </p>
            )}

            {sheetAuthError && (
              <div
                role="alert"
                className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 space-y-3 text-xs text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      ▲ {sheetAuthError.title}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {sheetAuthError.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheetAuthError(null)}
                    aria-label="Cerrar aviso de conexión con Google"
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(sheetAuthError.isPopupClosed ||
                  sheetAuthError.isPopupBlocked ||
                  sheetAuthError.isMissingWorkspaceScopes) && (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed pt-1 border-t border-amber-200/70 dark:border-amber-800/60">
                    <li>
                      Si Google muestra el aviso{' '}
                      <span className="font-semibold">
                        “Google no ha verificado esta aplicación”
                      </span>
                      , haz clic en{' '}
                      <span className="font-semibold">Configuración avanzada</span> (abajo a
                      la izquierda) y luego en{' '}
                      <span className="font-semibold">Ir a la aplicación (no seguro)</span>;
                      no pulses “Volver a un lugar seguro”.
                    </li>
                    <li>
                      Marca todas las casillas de permisos para{' '}
                      <span className="font-semibold">Google Drive</span> y{' '}
                      <span className="font-semibold">Google Sheets</span>, pulsa{' '}
                      <span className="font-semibold">Continuar</span> y espera a que la
                      ventana se cierre sola.
                    </li>
                    {isEmbeddedIframe && (
                      <li>
                        Si la ventana se cierra automáticamente en la vista integrada por
                        políticas de cookies de terceros del navegador, abre la plataforma en
                        una pestaña completa para conectar sin bloqueo.
                      </li>
                    )}
                  </ol>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={connectingGoogle}
                    onClick={() => void handleConnectGoogleWorkspace(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${connectingGoogle ? 'animate-spin' : ''}`}
                    />
                    {connectingGoogle
                      ? 'Abriendo ventana de Google...'
                      : 'Reintentar autorización con Google'}
                  </button>

                  {standaloneAppUrl && (
                    <a
                      href={standaloneAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir en pestaña completa
                    </a>
                  )}
                </div>
              </div>
            )}

            {sheetError && (
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                ▲ {sheetError}
              </p>
            )}
          </section>

          {/* Cohort Dimension Mastery Bar Strip */}
          {enrollments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Dominio promedio de la Ficha por dimensión de inducción
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {activeFicha.centerName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Identidad y Símbolos', val: kpis.dimAverages.identidad },
                  { label: 'Valores e Integridad', val: kpis.dimAverages.valores },
                  { label: 'Derechos del Aprendiz', val: kpis.dimAverages.derechos },
                  { label: 'Deberes y SST', val: kpis.dimAverages.deberes },
                ].map((d) => (
                  <div key={d.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {d.label}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {d.val}%
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 100 8"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                      className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 block"
                    >
                      <rect
                        x="0"
                        y="0"
                        width={Math.max(0, Math.min(100, d.val))}
                        height="8"
                        className={
                          d.val >= 70
                            ? 'fill-[#15803d] dark:fill-[#22c55e]'
                            : 'fill-amber-600 dark:fill-amber-500'
                        }
                      />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Controls + Data Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar aprendiz o código..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Status Segmented Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'todos', label: 'Todos' },
                      { id: 'apropiado', label: 'Apropiado' },
                      { id: 'certificado', label: 'Certificado' },
                      { id: 'plan_mejoramiento', label: 'Por reforzar' },
                      { id: 'en_proceso', label: 'En proceso' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeFicha.status === 'activa' && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => void handleSeedCohort()}
                    className="px-3.5 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {busyAction ? 'Cargando...' : 'Cargar cohorte ejemplo'}
                  </button>
                )}

                {canCloseActiveFicha && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => void handleCloseActiveFicha()}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Cerrar Ficha
                  </button>
                )}
              </div>
            </div>

            {loadingEnrollments ? (
              <div className="p-8 space-y-3">
                <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No se encontraron registros de aprendices para este filtro
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Los aprendices aparecerán aquí automáticamente al vincularse a la Ficha {activeFicha.fichaCode}, o puedes poblar una cohorte demostrativa de 5 aprendices para analizar brechas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-4">Aprendiz</th>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4 text-right">Módulos</th>
                      <th className="py-3 px-4 text-right">Puntaje</th>
                      <th className="py-3 px-4">Etapa Productiva (GFPI-F-165)</th>
                      <th className="py-3 px-4">Juicio Apropiación</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {filteredEnrollments.map((row) => {
                      const gfpi = gfpiByEnrollmentId[row.id];
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                            selectedEnrollmentId === row.id
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/30'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                            {row.apprenticeName}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                            {row.documentCode}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                            {row.completedModules.length} / 4
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {row.attemptsCount > 0 ? `${row.evalScore}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {gfpi ? (
                              <div className="space-y-0.5 max-w-[240px]">
                                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {gfpi.selectedAlternative}
                                </p>
                                <p
                                  className={`font-mono text-[11px] tabular-nums ${
                                    gfpi.status === 'radicado' ||
                                    gfpi.status === 'validado_coordinacion'
                                      ? 'text-emerald-800 dark:text-emerald-400 font-semibold'
                                      : 'text-amber-800 dark:text-amber-300'
                                  }`}
                                >
                                  {gfpi.status === 'radicado' ||
                                  gfpi.status === 'validado_coordinacion'
                                    ? `✓ Radicado · ${gfpi.filingCode}`
                                    : '◐ En borrador'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">
                                ○ Sin diligenciar
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {renderStateLabel(row.appropriationState)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEnrollmentId((prev) =>
                                  prev === row.id ? null : row.id
                                )
                              }
                              className="text-xs font-semibold text-slate-900 dark:text-slate-100 underline hover:text-emerald-800 dark:hover:text-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {selectedEnrollmentId === row.id ? 'Cerrar' : 'Evaluar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Instructor Pedagogical Review Drawer / Inline Detail */}
          {selectedEnrollment && (
            <form
              onSubmit={(e) => void handleSaveReview(e)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Revisión pedagógica del instructor
                  </p>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedEnrollment.apprenticeName} ·{' '}
                    <span className="font-mono text-sm font-normal text-slate-600 dark:text-slate-300 tabular-nums">
                      Puntaje {selectedEnrollment.evalScore}%
                    </span>
                  </h3>
                </div>
                {selectedEnrollment.appropriationState === 'certificado' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Registro certificado y bloqueado
                  </span>
                )}
              </div>

              {/* Apprentice's GFPI-F-165 & Dimension Breakdown Summary for Instructor */}
              <div className="py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-mono tabular-nums">
                  Dimensiones:{' '}
                  {selectedEnrollment.attemptsCount > 0
                    ? `Identidad ${selectedEnrollment.dimIdentity}% · Valores ${selectedEnrollment.dimValues}% · Derechos ${selectedEnrollment.dimRights}% · Deberes ${selectedEnrollment.dimDuties}%`
                    : 'Evaluación diagnóstica aún no presentada'}
                </span>
                {gfpiByEnrollmentId[selectedEnrollment.id] ? (
                  <span className="text-slate-700 dark:text-slate-200">
                    <strong className="font-semibold">GFPI-F-165:</strong>{' '}
                    {gfpiByEnrollmentId[selectedEnrollment.id].selectedAlternative} ·{' '}
                    <span className="font-mono tabular-nums">
                      {gfpiByEnrollmentId[selectedEnrollment.id].filingCode}
                    </span>
                    {gfpiByEnrollmentId[selectedEnrollment.id].contactEmail
                      ? ` · ${gfpiByEnrollmentId[selectedEnrollment.id].contactEmail}`
                      : ''}
                    {gfpiByEnrollmentId[selectedEnrollment.id].contactPhone
                      ? ` · Tel. ${gfpiByEnrollmentId[selectedEnrollment.id].contactPhone}`
                      : ''}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">
                    Formato GFPI-F-165 pendiente de diligenciar por el aprendiz
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <label className="space-y-1 block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Estado de apropiación
                  </span>
                  <select
                    disabled={
                      selectedEnrollment.appropriationState === 'certificado' ||
                      activeFicha.status === 'cerrada'
                    }
                    value={stateDraft}
                    onChange={(e) =>
                      setStateDraft(e.target.value as AppropriationState)
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="en_proceso">En proceso</option>
                    <option value="apropiado">Apropiado (Juicio A)</option>
                    <option value="plan_mejoramiento">
                      Plan de mejoramiento (Juicio D)
                    </option>
                    <option
                      value="certificado"
                      disabled={selectedEnrollment.evalScore < 70}
                    >
                      Certificado definitivo (requiere ≥70%)
                    </option>
                  </select>
                </label>

                <label className="space-y-1 block lg:col-span-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Observación pedagógica o compromiso de mejoramiento
                  </span>
                  <input
                    type="text"
                    disabled={
                      selectedEnrollment.appropriationState === 'certificado' ||
                      activeFicha.status === 'cerrada'
                    }
                    maxLength={SCHEMA_LIMITS.instructorObservation.maxLength}
                    value={obsDraft}
                    onChange={(e) => setObsDraft(e.target.value)}
                    placeholder="Escribe retroalimentación o acuerdos del plan de mejoramiento..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                  {reviewNotice ?? ''}
                </p>
                {selectedEnrollment.appropriationState !== 'certificado' &&
                  activeFicha.status === 'activa' && (
                    <button
                      type="submit"
                      disabled={busyAction}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {busyAction ? 'Guardando...' : 'Guardar concepto pedagógico'}
                    </button>
                  )}
              </div>
            </form>
          )}
        </>
      )}

      {/* Mandatory Confirmation Modal Before Creating or Updating Google Sheets Data */}
      {pendingConfirm && activeFicha && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  Confirmación de escritura en Google Workspace
                </p>
                <h2
                  id="sheet-confirm-modal-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  {pendingConfirm.mode === 'create'
                    ? '¿Crear y poblar nueva hoja de cálculo en tu Google Drive?'
                    : '¿Actualizar registros en la hoja de Google Sheets vinculada?'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar ventana de confirmación"
                onClick={() => setPendingConfirm(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                {pendingConfirm.mode === 'create' ? (
                  <>
                    Se creará el archivo{' '}
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {pendingConfirm.targetTitle}
                    </strong>{' '}
                    en tu unidad de Google Drive con formato oficial SENA GFPI-F-165.
                  </>
                ) : (
                  <>
                    Se actualizarán las filas correspondientes por número de documento en{' '}
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {pendingConfirm.targetTitle}
                    </strong>{' '}
                    sin duplicar registros existentes.
                  </>
                )}
              </p>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1.5 font-mono tabular-nums">
                <p className="text-slate-800 dark:text-slate-200 font-semibold">
                  Ficha {activeFicha.fichaCode} · Resumen de sincronización:
                </p>
                <p>• {SHEET_TABS.CONSOLIDADO}: {cohortSyncSummary.consolidadoCount} aprendices</p>
                <p>• {SHEET_TABS.GFPI_RESPUESTAS}: {cohortSyncSummary.gfpiCount} formatos GFPI-F-165</p>
                <p>• {SHEET_TABS.GFPI_INDIVIDUAL}: Plantilla imprimible con selector dinámico</p>
                <p>• {SHEET_TABS.EVALUACIONES}: {cohortSyncSummary.evaluationsCount} evaluaciones</p>
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmAutoSyncChecked}
                  onChange={(e) => setConfirmAutoSyncChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#15803d] focus:ring-[#15803d]"
                />
                <span className="text-slate-700 dark:text-slate-200">
                  Mantener sincronización automática en vivo durante esta sesión a medida que los aprendices registren o actualicen sus respuestas.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSheetMutation()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Confirmar y sincronizar en Google Sheets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
