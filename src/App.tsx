import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileSpreadsheet,
  IdCard,
  Moon,
  Scale,
  Sun,
  Users,
  X,
} from 'lucide-react';
import {
  HERO_IMAGE_PATH,
  IDENTITY_IMAGE_PATH,
  RIGHTS_IMAGE_PATH,
  WORKSHOP_IMAGE_PATH,
} from './data/senaContent';
import { ApprenticeProfile } from './components/ApprenticeProfile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GfpiF165Form } from './components/GfpiF165Form';
import { IdentityModule } from './components/IdentityModule';
import { InstructorDashboard } from './components/InstructorDashboard';
import {
  EvaluationSummaryPayload,
  InteractiveEvaluation,
} from './components/InteractiveEvaluation';
import { ResilientImage } from './components/ResilientImage';
import { RightsDutiesModule } from './components/RightsDutiesModule';
import { SenaLogo } from './components/SenaLogo';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  classifyGoogleAuthError,
  clearWorkspaceAccessToken,
  googleAccountSignIn,
  GoogleAuthErrorDetails,
} from './lib/firebase';
import { downloadApprenticeTrajectoryPdf } from './lib/inductionPdfReport';
import {
  ApprenticeProfileData,
  checkIsAuthorizedInstructor,
  DEFAULT_APPRENTICE_PROFILE,
  EnrollmentRecord,
  ensureUserPrivateVault,
  EvaluationAttemptRecord,
  FichaRecord,
  GfpiF165Data,
  GfpiF165Record,
  loadLocalInstructorWorkspace,
  LOCAL_APPRENTICE_AUTHOR_ID,
  LOCAL_APPRENTICE_ENROLLMENT_ID,
  LOCAL_INSTRUCTOR_STORAGE_KEY,
  LocalInstructorWorkspace,
  saveLocalInstructorWorkspace,
  subscribeActiveFichas,
  subscribeApprenticeEvaluations,
  subscribeApprenticeProfile,
  subscribeFichaEnrollments,
  subscribeGfpiF165Submission,
  upsertApprenticeProfile,
  upsertGfpiF165Submission,
  upsertLocalGfpiSubmission,
  upsertLocalSelfEnrollment,
  upsertSelfEnrollment,
} from './lib/inductionStore';
import {
  clampScore,
  InductionModuleId,
  sanitizeCode,
  sanitizeId,
  sanitizeModulesList,
  SCHEMA_LIMITS,
  truncateClean,
} from './lib/validation';

type NavView =
  | 'inicio'
  | 'identidad'
  | 'derechos'
  | 'formato165'
  | 'evaluacion'
  | 'perfil'
  | 'instructor';
type ThemeMode = 'light' | 'dark';

const LOCAL_STORAGE_KEY = 'sena_induccion_local_v1';
const THEME_STORAGE_KEY = 'sena_induccion_theme_v1';

function loadInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage read issues
  }
  return 'light';
}

interface LocalProgressState {
  profile: ApprenticeProfileData;
  completedModules: InductionModuleId[];
  latestSummary: EvaluationSummaryPayload | null;
  gfpiSubmission: GfpiF165Record | null;
  localEvaluations: EvaluationAttemptRecord[];
}

function loadLocalProgress(): LocalProgressState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return {
        profile: { ...DEFAULT_APPRENTICE_PROFILE },
        completedModules: [],
        latestSummary: null,
        gfpiSubmission: null,
        localEvaluations: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<LocalProgressState> & {
      apprenticeName?: string;
      documentCode?: string;
      selectedFichaId?: string;
    };

    const baseProfile: ApprenticeProfileData = {
      ...DEFAULT_APPRENTICE_PROFILE,
      ...(parsed.profile ?? {}),
      apprenticeName:
        parsed.profile?.apprenticeName ??
        (typeof parsed.apprenticeName === 'string' ? parsed.apprenticeName : ''),
      documentCode:
        parsed.profile?.documentCode ??
        (typeof parsed.documentCode === 'string' ? parsed.documentCode : 'APR-102400'),
      selectedFichaId:
        parsed.profile?.selectedFichaId ??
        (typeof parsed.selectedFichaId === 'string' ? parsed.selectedFichaId : ''),
    };

    return {
      profile: baseProfile,
      completedModules: Array.isArray(parsed.completedModules)
        ? sanitizeModulesList(parsed.completedModules)
        : [],
      latestSummary: parsed.latestSummary ?? null,
      gfpiSubmission:
        parsed.gfpiSubmission && typeof parsed.gfpiSubmission === 'object'
          ? parsed.gfpiSubmission
          : null,
      localEvaluations: Array.isArray(parsed.localEvaluations)
        ? parsed.localEvaluations
        : [],
    };
  } catch {
    return {
      profile: { ...DEFAULT_APPRENTICE_PROFILE },
      completedModules: [],
      latestSummary: null,
      gfpiSubmission: null,
      localEvaluations: [],
    };
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<NavView>('inicio');
  const [theme, setTheme] = useState<ThemeMode>(() => loadInitialTheme());
  const [isBlurTransitioning, setIsBlurTransitioning] = useState<boolean>(false);
  const blurTimerRef = useRef<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<GoogleAuthErrorDetails | null>(null);
  const [isAuthorizedInstructor, setIsAuthorizedInstructor] = useState<boolean>(false);

  const [localState, setLocalState] = useState<LocalProgressState>(() =>
    loadLocalProgress()
  );
  const [localWorkspace, setLocalWorkspace] = useState<LocalInstructorWorkspace>(() =>
    loadLocalInstructorWorkspace()
  );
  const [activeFichas, setActiveFichas] = useState<FichaRecord[]>([]);
  const [currentEnrollment, setCurrentEnrollment] = useState<EnrollmentRecord | null>(
    null
  );
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationAttemptRecord[]>(
    []
  );
  const [cloudGfpiSubmission, setCloudGfpiSubmission] = useState<GfpiF165Record | null>(
    null
  );
  const [syncingProgress, setSyncingProgress] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [downloadingHomePdf, setDownloadingHomePdf] = useState<boolean>(false);

  const isCloudMode = Boolean(authReady && user && user.emailVerified);

  // Sync theme class on root <html> and persist preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota issues
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  // Persist local progress & profile smoothly
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          ...localState,
          apprenticeName: localState.profile.apprenticeName,
          documentCode: localState.profile.documentCode,
          selectedFichaId: localState.profile.selectedFichaId,
        })
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [localState]);

  // Persist passwordless local instructor workspace smoothly
  useEffect(() => {
    saveLocalInstructorWorkspace(localWorkspace);
  }, [localWorkspace]);

  // Listen to cross-tab storage updates so Apprentice -> Instructor Google Sheets live sync works across browser tabs
  useEffect(() => {
    function handleCrossTabStorage(event: StorageEvent) {
      if (event.key === LOCAL_INSTRUCTOR_STORAGE_KEY) {
        setLocalWorkspace(loadLocalInstructorWorkspace());
      } else if (event.key === LOCAL_STORAGE_KEY) {
        setLocalState(loadLocalProgress());
      }
    }
    window.addEventListener('storage', handleCrossTabStorage);
    return () => window.removeEventListener('storage', handleCrossTabStorage);
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        setAuthError(null);
        if (firebaseUser.email && firebaseUser.emailVerified) {
          void ensureUserPrivateVault(firebaseUser.uid, firebaseUser.email);
        }
        setLocalState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            apprenticeName:
              prev.profile.apprenticeName ||
              firebaseUser.displayName ||
              'Aprendiz SENA',
          },
        }));
      } else {
        setCurrentEnrollment(null);
        setEvaluationHistory([]);
        setCloudGfpiSubmission(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Verify instructor/admin authorization strictly against BOOTSTRAP_ADMIN_EMAIL and /admins/{uid}
  useEffect(() => {
    let cancelled = false;

    if (!authReady || !user || !user.emailVerified) {
      setIsAuthorizedInstructor(false);
      return () => {
        cancelled = true;
      };
    }

    if (user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      setIsAuthorizedInstructor(true);
      return () => {
        cancelled = true;
      };
    }

    setIsAuthorizedInstructor(false);
    void checkIsAuthorizedInstructor(user)
      .then((authorized) => {
        if (!cancelled) {
          setIsAuthorizedInstructor(authorized);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuthorizedInstructor(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  // Prevent any non-authorized apprentice from remaining on or opening the Instructor view
  useEffect(() => {
    if (!isAuthorizedInstructor && activeView === 'instructor') {
      setActiveView('inicio');
    }
  }, [isAuthorizedInstructor, activeView]);

  // Subscribe to Apprentice Profile, GFPI-F-165 & Evaluation History when signed in
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setEvaluationHistory([]);
      setCloudGfpiSubmission(null);
      return;
    }

    const unsubProfile = subscribeApprenticeProfile(user.uid, (cloudProfile) => {
      if (cloudProfile) {
        const { userId: _u, createdAtMs: _c, updatedAtMs: _up, ...profileFields } =
          cloudProfile;
        setLocalState((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...profileFields,
            selectedFichaId: profileFields.selectedFichaId || prev.profile.selectedFichaId,
          },
        }));
      }
    });

    const unsubGfpi = subscribeGfpiF165Submission(user.uid, (cloudGfpi) => {
      setCloudGfpiSubmission(cloudGfpi);
      if (cloudGfpi) {
        setLocalState((prev) => ({
          ...prev,
          gfpiSubmission: cloudGfpi,
          profile: {
            ...prev.profile,
            preferredProductiveAlt: cloudGfpi.selectedAlternative,
          },
        }));
      }
    });

    const unsubEvals = subscribeApprenticeEvaluations(user.uid, (evals) => {
      setEvaluationHistory(evals);
    });

    return () => {
      unsubProfile();
      unsubGfpi();
      unsubEvals();
    };
  }, [authReady, user]);

  // Subscribe to active Fichas when signed in
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setActiveFichas([]);
      return;
    }
    const unsub = subscribeActiveFichas((list) => {
      setActiveFichas(list);
      setLocalState((prev) => {
        if (
          prev.profile.selectedFichaId &&
          list.some((f) => f.id === prev.profile.selectedFichaId)
        ) {
          return prev;
        }
        if (list.length > 0) {
          return {
            ...prev,
            profile: {
              ...prev.profile,
              selectedFichaId: list[0].id,
            },
          };
        }
        return prev;
      });
    });
    return () => unsub();
  }, [authReady, user]);

  const localActiveFichas = useMemo(
    () => localWorkspace.fichas.filter((f) => f.status === 'activa'),
    [localWorkspace.fichas]
  );

  // Auto-select first active local Ficha when operating without login
  useEffect(() => {
    if (isCloudMode) return;
    setLocalState((prev) => {
      if (
        prev.profile.selectedFichaId &&
        localActiveFichas.some((f) => f.id === prev.profile.selectedFichaId)
      ) {
        return prev;
      }
      const fallbackId = localActiveFichas[0]?.id ?? '';
      if (prev.profile.selectedFichaId === fallbackId) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          selectedFichaId: fallbackId,
        },
      };
    });
  }, [isCloudMode, localActiveFichas]);

  const effectiveActiveFichas = useMemo(() => {
    if (!isCloudMode) {
      return localActiveFichas;
    }
    const cloudCodes = new Set(activeFichas.map((f) => f.fichaCode.trim().toLowerCase()));
    const remainingLocal = localActiveFichas.filter(
      (lf) => !cloudCodes.has(lf.fichaCode.trim().toLowerCase())
    );
    return [...activeFichas, ...remainingLocal];
  }, [isCloudMode, activeFichas, localActiveFichas]);

  const selectedFicha = useMemo(
    () =>
      effectiveActiveFichas.find(
        (f) => f.id === localState.profile.selectedFichaId
      ) ?? null,
    [effectiveActiveFichas, localState.profile.selectedFichaId]
  );

  const cloudSelectedFicha = useMemo(
    () =>
      isCloudMode
        ? activeFichas.find((f) => f.id === localState.profile.selectedFichaId) ?? null
        : null,
    [isCloudMode, activeFichas, localState.profile.selectedFichaId]
  );

  const localCurrentEnrollment = useMemo(() => {
    if (!selectedFicha) return null;
    const list = localWorkspace.enrollmentsByFicha[selectedFicha.id] ?? [];
    return list.find((r) => r.id === LOCAL_APPRENTICE_ENROLLMENT_ID) ?? null;
  }, [localWorkspace.enrollmentsByFicha, selectedFicha]);

  const effectiveCurrentEnrollment = cloudSelectedFicha
    ? currentEnrollment
    : localCurrentEnrollment;

  // Apprentice-safe projections with all instructor fields stripped at the component boundary
  const apprenticeActiveFichas = useMemo<FichaRecord[]>(
    () =>
      effectiveActiveFichas.map((f) => ({
        ...f,
        instructorId: '',
        instructorName: '',
      })),
    [effectiveActiveFichas]
  );

  const apprenticeSelectedFicha = useMemo<FichaRecord | null>(
    () =>
      selectedFicha
        ? {
            ...selectedFicha,
            instructorId: '',
            instructorName: '',
          }
        : null,
    [selectedFicha]
  );

  const apprenticeCurrentEnrollment = useMemo<EnrollmentRecord | null>(
    () =>
      effectiveCurrentEnrollment
        ? {
            ...effectiveCurrentEnrollment,
            instructorId: '',
            instructorObservation: '',
          }
        : null,
    [effectiveCurrentEnrollment]
  );

  const effectiveEvaluationHistory = useMemo<EvaluationAttemptRecord[]>(() => {
    const rawList = isCloudMode ? evaluationHistory : localState.localEvaluations;
    return rawList.map((attempt) => ({
      ...attempt,
      instructorId: '',
    }));
  }, [isCloudMode, evaluationHistory, localState.localEvaluations]);

  const effectiveGfpiSubmission = useMemo<GfpiF165Record | null>(() => {
    const rawGfpi = isCloudMode
      ? cloudGfpiSubmission ?? localState.gfpiSubmission
      : localState.gfpiSubmission;
    return rawGfpi
      ? {
          ...rawGfpi,
          instructorId: '',
        }
      : null;
  }, [isCloudMode, cloudGfpiSubmission, localState.gfpiSubmission]);

  // Hydrate apprentice's own enrollment from selected Cloud Ficha if already enrolled
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !cloudSelectedFicha) {
      setCurrentEnrollment(null);
      return;
    }
    const unsub = subscribeFichaEnrollments(
      cloudSelectedFicha.id,
      user.uid,
      user.email,
      'apprentice',
      (records) => {
        const mine = records.find((r) => r.authorId === user.uid) ?? null;
        setCurrentEnrollment(mine);
        if (mine) {
          setLocalState((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              apprenticeName: mine.apprenticeName || prev.profile.apprenticeName,
              documentCode: mine.documentCode || prev.profile.documentCode,
            },
            completedModules: sanitizeModulesList([
              ...prev.completedModules,
              ...mine.completedModules,
            ]),
            latestSummary:
              mine.attemptsCount > 0
                ? {
                    score: mine.evalScore,
                    passed: mine.evalScore >= 70,
                    dimIdentity: mine.dimIdentity,
                    dimValues: mine.dimValues,
                    dimRights: mine.dimRights,
                    dimDuties: mine.dimDuties,
                    correctCount: Math.round(mine.evalScore / 10),
                    durationSeconds: prev.latestSummary?.durationSeconds ?? 120,
                  }
                : prev.latestSummary,
          }));
        }
      }
    );
    return () => unsub();
  }, [authReady, user, cloudSelectedFicha]);

  async function handleGoogleSignIn() {
    setAuthError(null);
    try {
      await googleAccountSignIn();
    } catch (err) {
      setAuthError(classifyGoogleAuthError(err));
    }
  }

  async function handleSignOut() {
    clearWorkspaceAccessToken();
    await signOut(auth);
    setSyncFeedback(null);
  }

  function handleToggleTheme() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      setTheme(nextTheme);
      return;
    }

    const docWithTransition = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (typeof docWithTransition.startViewTransition === 'function') {
      try {
        docWithTransition.startViewTransition(() => {
          flushSync(() => {
            document.documentElement.classList.toggle('dark', nextTheme === 'dark');
            setTheme(nextTheme);
          });
        });
        return;
      } catch {
        // Fallback to CSS blur stage below if View Transition cannot start
      }
    }

    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
    }
    setIsBlurTransitioning(true);
    blurTimerRef.current = window.setTimeout(() => {
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      setTheme(nextTheme);
      window.requestAnimationFrame(() => {
        setIsBlurTransitioning(false);
      });
      blurTimerRef.current = null;
    }, 150);
  }

  async function handleSaveApprenticeProfile(updated: ApprenticeProfileData) {
    setLocalState((prev) => ({
      ...prev,
      profile: updated,
      gfpiSubmission:
        prev.gfpiSubmission && prev.gfpiSubmission.status === 'borrador'
          ? {
              ...prev.gfpiSubmission,
              apprenticeName: updated.apprenticeName,
              documentCode: updated.documentCode,
              trainingLevel: updated.trainingLevel,
              regionalCenter: updated.regionalCenter,
              selectedAlternative: updated.preferredProductiveAlt,
            }
          : prev.gfpiSubmission,
    }));

    const targetFicha =
      effectiveActiveFichas.find((f) => f.id === updated.selectedFichaId) ?? null;
    const targetCloudFicha =
      isCloudMode && targetFicha
        ? activeFichas.find((f) => f.id === targetFicha.id) ?? null
        : null;

    if (isCloudMode && user) {
      setSyncingProgress(true);
      setSyncFeedback(null);
      try {
        await upsertApprenticeProfile(updated);
        if (targetCloudFicha && updated.apprenticeName.trim().length >= 2) {
          await upsertSelfEnrollment({
            ficha: targetCloudFicha,
            apprenticeName: updated.apprenticeName,
            documentCode: updated.documentCode || 'APR-102400',
            completedModules: localState.completedModules,
          });
          setSyncFeedback(
            `Perfil y matrícula sincronizados en Ficha ${targetCloudFicha.fichaCode}`
          );
        } else if (targetFicha && updated.apprenticeName.trim().length >= 2) {
          setLocalWorkspace((prev) =>
            upsertLocalSelfEnrollment(prev, {
              ficha: targetFicha,
              apprenticeName: updated.apprenticeName,
              documentCode: updated.documentCode || 'APR-102400',
              completedModules: localState.completedModules,
            })
          );
          setSyncFeedback(
            `Perfil respaldado y sincronizado en Ficha ${targetFicha.fichaCode}`
          );
        } else {
          setSyncFeedback('Perfil del aprendiz respaldado en la nube.');
        }
      } finally {
        setSyncingProgress(false);
      }
    } else if (targetFicha) {
      setLocalWorkspace((prev) =>
        upsertLocalSelfEnrollment(prev, {
          ficha: targetFicha,
          apprenticeName: updated.apprenticeName,
          documentCode: updated.documentCode || 'APR-102400',
          completedModules: localState.completedModules,
        })
      );
      setSyncFeedback(
        `Perfil y matrícula sincronizados en Ficha ${targetFicha.fichaCode}`
      );
    }
  }

  async function handleSaveGfpiF165(data: GfpiF165Data) {
    const syncedProfile: ApprenticeProfileData = {
      ...localState.profile,
      apprenticeName: data.apprenticeName.trim() || localState.profile.apprenticeName,
      documentCode: data.documentCode.trim() || localState.profile.documentCode,
      trainingLevel: data.trainingLevel,
      regionalCenter: data.regionalCenter.trim() || localState.profile.regionalCenter,
      preferredProductiveAlt: data.selectedAlternative,
      selectedFichaId: data.fichaId || localState.profile.selectedFichaId,
    };

    const targetFicha =
      effectiveActiveFichas.find(
        (f) => f.id === (data.fichaId || syncedProfile.selectedFichaId)
      ) ?? null;
    const targetCloudFicha =
      isCloudMode && targetFicha
        ? activeFichas.find((f) => f.id === targetFicha.id) ?? null
        : null;

    if (isCloudMode && user) {
      setSyncingProgress(true);
      setSyncFeedback(null);
      try {
        const savedRecord = await upsertGfpiF165Submission(data);
        setCloudGfpiSubmission(savedRecord);
        setLocalState((prev) => ({
          ...prev,
          profile: syncedProfile,
          gfpiSubmission: savedRecord,
        }));
        await upsertApprenticeProfile(syncedProfile);
        if (targetCloudFicha && syncedProfile.apprenticeName.trim().length >= 2) {
          await upsertSelfEnrollment({
            ficha: targetCloudFicha,
            apprenticeName: syncedProfile.apprenticeName,
            documentCode: syncedProfile.documentCode || 'APR-102400',
            completedModules: localState.completedModules,
          });
        } else if (targetFicha) {
          setLocalWorkspace((prev) => {
            const { workspace: nextWs } = upsertLocalGfpiSubmission(prev, data);
            if (syncedProfile.apprenticeName.trim().length >= 2) {
              return upsertLocalSelfEnrollment(nextWs, {
                ficha: targetFicha,
                apprenticeName: syncedProfile.apprenticeName,
                documentCode: syncedProfile.documentCode || 'APR-102400',
                completedModules: localState.completedModules,
              });
            }
            return nextWs;
          });
        }
        setSyncFeedback(
          data.status === 'radicado'
            ? `Formato GFPI-F-165 radicado (${savedRecord.filingCode})`
            : 'Borrador GFPI-F-165 respaldado en la nube.'
        );
      } finally {
        setSyncingProgress(false);
      }
      return;
    }

    let localSaved: GfpiF165Record | null = null;
    setLocalWorkspace((prev) => {
      const { workspace: nextWs, record } = upsertLocalGfpiSubmission(prev, data);
      localSaved = record;
      if (targetFicha) {
        return upsertLocalSelfEnrollment(nextWs, {
          ficha: targetFicha,
          apprenticeName: syncedProfile.apprenticeName,
          documentCode: syncedProfile.documentCode || 'APR-102400',
          completedModules: localState.completedModules,
        });
      }
      return nextWs;
    });

    setLocalState((prev) => ({
      ...prev,
      profile: syncedProfile,
      gfpiSubmission: localSaved ?? prev.gfpiSubmission,
    }));

    setSyncFeedback(
      data.status === 'radicado'
        ? `Formato GFPI-F-165 radicado (${data.filingCode})`
        : 'Borrador GFPI-F-165 guardado en tu expediente.'
    );
  }

  async function handleToggleCommitment(accepted: boolean) {
    const nextProfile: ApprenticeProfileData = {
      ...localState.profile,
      apprenticeName:
        localState.profile.apprenticeName.trim() ||
        user?.displayName ||
        'Aprendiz SENA',
      commitmentAccepted: accepted,
    };
    setLocalState((prev) => ({
      ...prev,
      profile: nextProfile,
    }));

    if (isCloudMode && user) {
      setSyncingProgress(true);
      try {
        await upsertApprenticeProfile(nextProfile);
        setSyncFeedback(
          accepted
            ? 'Acta de compromiso registrada en tu perfil.'
            : 'Estado de acta actualizado.'
        );
      } finally {
        setSyncingProgress(false);
      }
    } else {
      setSyncFeedback(
        accepted
          ? 'Acta de compromiso registrada en tu perfil.'
          : 'Estado de acta actualizado.'
      );
    }
  }

  async function handleSyncWithFichaById(fichaId: string) {
    const nextProfile: ApprenticeProfileData = {
      ...localState.profile,
      selectedFichaId: fichaId,
    };
    setLocalState((prev) => ({
      ...prev,
      profile: nextProfile,
    }));

    const targetFicha =
      effectiveActiveFichas.find((f) => f.id === fichaId) ?? null;
    if (!targetFicha) return;
    const targetCloudFicha =
      isCloudMode ? activeFichas.find((f) => f.id === targetFicha.id) ?? null : null;

    if (isCloudMode && user && targetCloudFicha) {
      setSyncingProgress(true);
      setSyncFeedback(null);
      try {
        const effectiveName =
          nextProfile.apprenticeName.trim() || user.displayName || 'Aprendiz SENA';
        const syncedProfile = { ...nextProfile, apprenticeName: effectiveName };
        await upsertApprenticeProfile(syncedProfile);
        await upsertSelfEnrollment({
          ficha: targetCloudFicha,
          apprenticeName: effectiveName,
          documentCode: syncedProfile.documentCode || 'APR-102400',
          completedModules: localState.completedModules,
          evalResult: localState.latestSummary ?? undefined,
        });
        setSyncFeedback(`Vinculado y sincronizado en Ficha ${targetCloudFicha.fichaCode}`);
      } finally {
        setSyncingProgress(false);
      }
    } else {
      const effectiveName =
        nextProfile.apprenticeName.trim() ||
        user?.displayName ||
        'Aprendiz en Inducción';
      if (isCloudMode && user) {
        void upsertApprenticeProfile({ ...nextProfile, apprenticeName: effectiveName });
      }
      const existingInTarget = (
        localWorkspace.enrollmentsByFicha[targetFicha.id] ?? []
      ).some((r) => r.id === LOCAL_APPRENTICE_ENROLLMENT_ID);
      setLocalWorkspace((prev) =>
        upsertLocalSelfEnrollment(prev, {
          ficha: targetFicha,
          apprenticeName: effectiveName,
          documentCode: nextProfile.documentCode || 'APR-102400',
          completedModules: localState.completedModules,
          evalResult:
            !existingInTarget && localState.latestSummary
              ? localState.latestSummary
              : undefined,
        })
      );
      setSyncFeedback(`Vinculado y sincronizado en Ficha ${targetFicha.fichaCode}`);
    }
  }

  async function handleToggleModuleComplete(moduleId: InductionModuleId) {
    const exists = localState.completedModules.includes(moduleId);
    const nextModules = exists
      ? localState.completedModules.filter((m) => m !== moduleId)
      : sanitizeModulesList([...localState.completedModules, moduleId]);

    setLocalState((prev) => ({
      ...prev,
      completedModules: nextModules,
    }));

    if (
      isCloudMode &&
      user &&
      cloudSelectedFicha &&
      localState.profile.apprenticeName.trim().length >= 2
    ) {
      setSyncingProgress(true);
      try {
        await upsertSelfEnrollment({
          ficha: cloudSelectedFicha,
          apprenticeName: localState.profile.apprenticeName,
          documentCode: localState.profile.documentCode || 'APR-102400',
          completedModules: nextModules,
        });
        setSyncFeedback(`Avance sincronizado en Ficha ${cloudSelectedFicha.fichaCode}`);
      } catch {
        // Handled by structured Firestore error handler or local fallback
      } finally {
        setSyncingProgress(false);
      }
    } else if (selectedFicha) {
      const hasNameOrRecord =
        localState.profile.apprenticeName.trim().length >= 2 ||
        Boolean(localCurrentEnrollment);
      if (hasNameOrRecord) {
        setLocalWorkspace((prev) =>
          upsertLocalSelfEnrollment(prev, {
            ficha: selectedFicha,
            apprenticeName:
              localState.profile.apprenticeName.trim() ||
              user?.displayName ||
              'Aprendiz en Inducción',
            documentCode: localState.profile.documentCode || 'APR-102400',
            completedModules: nextModules,
          })
        );
      }
    }
  }

  async function handleCompleteEvaluation(summary: EvaluationSummaryPayload) {
    const now = Date.now();
    const cleanScore = clampScore(summary.score);
    const localAttempt: EvaluationAttemptRecord = {
      id: sanitizeId(`eval_apr_${now.toString(36)}`),
      authorId: user?.uid ? sanitizeId(user.uid) : LOCAL_APPRENTICE_AUTHOR_ID,
      fichaId: selectedFicha?.id ?? '',
      instructorId: '',
      fichaCode: selectedFicha
        ? sanitizeCode(selectedFicha.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength)
        : 'SIN-FICHA',
      apprenticeName: truncateClean(
        localState.profile.apprenticeName.trim() ||
          user?.displayName ||
          'Aprendiz en Inducción',
        SCHEMA_LIMITS.apprenticeName.maxLength
      ),
      score: cleanScore,
      passed: cleanScore >= 70,
      dimIdentity: clampScore(summary.dimIdentity),
      dimValues: clampScore(summary.dimValues),
      dimRights: clampScore(summary.dimRights),
      dimDuties: clampScore(summary.dimDuties),
      correctCount: Math.max(0, Math.min(10, Math.round(summary.correctCount))),
      totalQuestions: 10,
      durationSeconds: Math.max(1, Math.min(7200, Math.round(summary.durationSeconds))),
      createdAtMs: now,
    };

    setLocalState((prev) => ({
      ...prev,
      latestSummary: summary,
      localEvaluations: [localAttempt, ...prev.localEvaluations].slice(0, 30),
    }));

    if (isCloudMode && user && cloudSelectedFicha) {
      setSyncingProgress(true);
      setSyncFeedback(null);
      try {
        await upsertSelfEnrollment({
          ficha: cloudSelectedFicha,
          apprenticeName:
            localState.profile.apprenticeName.trim() ||
            user.displayName ||
            'Aprendiz SENA',
          documentCode: localState.profile.documentCode.trim() || 'APR-102400',
          completedModules: localState.completedModules,
          evalResult: summary,
        });
        setSyncFeedback(
          `Resultado (${summary.score}%) registrado exitosamente en la Ficha ${cloudSelectedFicha.fichaCode}.`
        );
      } finally {
        setSyncingProgress(false);
      }
    } else if (selectedFicha) {
      setLocalWorkspace((prev) =>
        upsertLocalSelfEnrollment(prev, {
          ficha: selectedFicha,
          apprenticeName:
            localState.profile.apprenticeName.trim() ||
            user?.displayName ||
            'Aprendiz en Inducción',
          documentCode: localState.profile.documentCode.trim() || 'APR-102400',
          completedModules: localState.completedModules,
          evalResult: summary,
        })
      );
      setSyncFeedback(
        `Resultado (${summary.score}%) registrado exitosamente en la Ficha ${selectedFicha.fichaCode}.`
      );
    }
  }

  async function handleLinkEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFicha) return;
    await handleSyncWithFichaById(selectedFicha.id);
  }

  async function handleDownloadApprenticePdf(
    overrideSummary?: EvaluationSummaryPayload
  ) {
    const effectiveSummary = overrideSummary ?? localState.latestSummary;
    await downloadApprenticeTrajectoryPdf({
      profile: localState.profile,
      userDisplayName: user?.displayName ?? null,
      selectedFicha: selectedFicha
        ? {
            fichaCode: selectedFicha.fichaCode,
            programName: selectedFicha.programName,
            centerName: selectedFicha.centerName,
            jornada: selectedFicha.jornada,
          }
        : null,
      currentEnrollment:
        !overrideSummary && effectiveCurrentEnrollment
          ? {
              appropriationState: effectiveCurrentEnrollment.appropriationState,
              evalScore: effectiveCurrentEnrollment.evalScore,
              dimIdentity: effectiveCurrentEnrollment.dimIdentity,
              dimValues: effectiveCurrentEnrollment.dimValues,
              dimRights: effectiveCurrentEnrollment.dimRights,
              dimDuties: effectiveCurrentEnrollment.dimDuties,
              attemptsCount: effectiveCurrentEnrollment.attemptsCount,
            }
          : null,
      gfpiSubmission: effectiveGfpiSubmission
        ? {
            selectedAlternative: effectiveGfpiSubmission.selectedAlternative,
            procedureType: effectiveGfpiSubmission.procedureType,
            status: effectiveGfpiSubmission.status,
            filingCode: effectiveGfpiSubmission.filingCode,
            productivaStartDate: effectiveGfpiSubmission.productivaStartDate,
            productivaEndDate: effectiveGfpiSubmission.productivaEndDate,
          }
        : null,
      completedModules: localState.completedModules,
      latestSummary: effectiveSummary,
      evaluationHistory: effectiveEvaluationHistory,
    });
  }

  async function handleHomePdfDownload() {
    if (downloadingHomePdf) return;
    setDownloadingHomePdf(true);
    try {
      await handleDownloadApprenticePdf();
    } finally {
      setDownloadingHomePdf(false);
    }
  }

  const moduleCompletionPct = Math.round(
    (localState.completedModules.length / 4) * 100
  );

  const visibleNavItems = useMemo(() => {
    const base: { id: NavView; label: string }[] = [
      { id: 'inicio', label: 'Inicio' },
      { id: 'identidad', label: 'Identidad' },
      { id: 'derechos', label: 'Reglamento' },
      { id: 'formato165', label: 'GFPI-F-165' },
      { id: 'evaluacion', label: 'Evaluación' },
      { id: 'perfil', label: 'Mi Perfil' },
    ];
    if (isAuthorizedInstructor) {
      base.push({ id: 'instructor', label: 'Instructor' });
    }
    return base;
  }, [isAuthorizedInstructor]);

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0b1220] text-slate-900 dark:text-slate-100 transition-colors duration-300 theme-blur-stage ${
          isBlurTransitioning ? 'theme-blur-stage--active' : ''
        }`}
      >
        {/* TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
            {/* Zone 1: Brand mark with official SENA Logosímbolo */}
            <button
              type="button"
              onClick={() => setActiveView('inicio')}
              className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SenaLogo className="w-8 h-8" />
              <span>Ruta Inducción SENA</span>
            </button>

            {/* Zone 2: Concise single-line text navigation links */}
            <nav
              aria-label="Navegación principal"
              className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              {visibleNavItems.map((nav) => (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveView(nav.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeView === nav.id
                      ? 'border-[#15803d] dark:border-[#39A900] text-slate-900 dark:text-white font-semibold'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
            </nav>

            {/* Zone 3: Right-side Theme Toggle + Session Action */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleTheme}
                aria-pressed={theme === 'dark'}
                aria-label={
                  theme === 'dark'
                    ? 'Cambiar prototipo a modo claro'
                    : 'Cambiar prototipo a modo oscuro'
                }
                title={
                  theme === 'dark'
                    ? 'Cambiar a modo claro'
                    : 'Cambiar a modo oscuro'
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A900] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Modo claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-700 shrink-0" />
                    <span>Modo oscuro</span>
                  </>
                )}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cerrar sesión
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleGoogleSignIn()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>

          {/* Mobile & Tablet compact nav row */}
          <div className="lg:hidden flex items-center gap-4 overflow-x-auto px-6 py-2 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            {visibleNavItems.map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveView(nav.id)}
                className={`py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === nav.id
                    ? 'text-[#15803d] dark:text-[#4ade80] font-bold underline underline-offset-4'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        </header>

        {authError && (
          <div
            role="alert"
            className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200"
          >
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <p>
                <span className="font-semibold">▲ {authError.title}:</span>{' '}
                {authError.message}
              </p>
              <div className="flex items-center gap-3 shrink-0">
                {typeof window !== 'undefined' && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80"
                  >
                    Abrir en pestaña completa
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  aria-label="Cerrar aviso"
                  className="p-1 hover:opacity-80 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE */}
        <main className="flex-1">
          {activeView === 'inicio' && (
            <div className="max-w-7xl mx-auto px-6 py-10 space-y-14">
              {/* Balanced 2-Column Hero Split */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-10 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <SenaLogo className="w-9 h-9" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          Servicio Nacional de Aprendizaje
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Formación Profesional Integral</span>
                        <span aria-hidden="true">·</span>
                        <span>Colombia</span>
                      </div>
                    </div>

                    <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-[1.1] balance-text">
                      Apropia tu camino formativo, tus derechos y el valor de ser aprendiz SENA
                    </h1>

                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                      Recorre de forma interactiva la imagen institucional, el Código de Integridad y el Reglamento del Aprendiz vigente (Acuerdo 009 de 2024, actualizado en 2026 por el Acuerdo 002 de 2026 y el Decreto 0223 de 2026), y gestiona tu perfil y carné digital conectados con tu Ficha.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveView('identidad')}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Iniciar ruta de inducción
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('formato165')}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-[#15803d] dark:text-[#4ade80]" />
                      Diligenciar Formato GFPI-F-165
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveView('perfil')}
                      className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <IdCard className="w-4 h-4" />
                      Mi carné digital
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[320px] relative">
                  <ResilientImage
                    src={HERO_IMAGE_PATH}
                    alt="Aprendices del SENA colaborando en ambiente moderno de ingeniería, mecanizado y desarrollo de software"
                    fallbackTitle="Ambientes de Aprendizaje Colaborativo SENA"
                    className="w-full h-full lg:h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
                    <p className="text-xs text-slate-200">
                      Etapa Lectiva y Etapa Productiva · Gratuidad Pública Total
                    </p>
                    <p className="font-display text-lg font-semibold mt-0.5">
                      Aprender a aprender, aprender a hacer y aprender a ser
                    </p>
                  </div>
                </div>
              </section>

              {/* Full-Width 4-Column Induction Progress Strip Below Hero Split */}
              <section
                aria-label="Estado actual de apropiación"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avance de estudio</p>
                  <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {localState.completedModules.length} / 4 dimensiones
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {moduleCompletionPct}% del recorrido revisado
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Última evaluación interactiva</p>
                  <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {localState.latestSummary ? `${localState.latestSummary.score}%` : 'Pendiente'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {localState.latestSummary
                      ? localState.latestSummary.passed
                        ? '✓ Juicio Aprobado (A)'
                        : '▲ Requiere refuerzo (D)'
                      : '10 escenarios diagnósticos'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Perfil del aprendiz</p>
                  <button
                    type="button"
                    onClick={() => setActiveView('perfil')}
                    className="inline-flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-[#15803d] dark:hover:text-[#4ade80] cursor-pointer text-left"
                  >
                    <span className="truncate">
                      {localState.profile.apprenticeName.trim() || 'Configurar mi perfil'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                    {selectedFicha
                      ? `Ficha ${selectedFicha.fichaCode} · ${localState.profile.documentCode}`
                      : `Carné ${localState.profile.documentCode}`}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Formato GFPI-F-165</p>
                  <button
                    type="button"
                    onClick={() => setActiveView('formato165')}
                    className="inline-flex items-center justify-between text-sm font-semibold text-[#15803d] dark:text-[#4ade80] hover:text-emerald-900 dark:hover:text-emerald-300 cursor-pointer text-left"
                  >
                    <span className="truncate">
                      {effectiveGfpiSubmission
                        ? effectiveGfpiSubmission.status === 'radicado' ||
                          effectiveGfpiSubmission.status === 'validado_coordinacion'
                          ? `✓ Radicado · ${effectiveGfpiSubmission.filingCode}`
                          : '◐ Borrador guardado'
                        : 'Seleccionar alternativa práctica'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {effectiveGfpiSubmission
                      ? effectiveGfpiSubmission.selectedAlternative
                      : '6 alternativas Etapa Productiva'}
                  </p>
                </div>
              </section>

              {/* Apprentice Ficha Enrollment Synchronization Bar (Works Directly Without Login) */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                      Vinculación Rápida del Aprendiz a Ficha de Caracterización
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Asocia tus datos académicos a tu Ficha de Caracterización activa o personaliza tu expediente completo en Mi Perfil.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={downloadingHomePdf}
                      onClick={() => void handleHomePdfDownload()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#15803d] dark:text-[#4ade80]" />
                      {downloadingHomePdf
                        ? 'Generando PDF...'
                        : 'Descargar trayectoria PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('perfil')}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Abrir perfil completo
                    </button>
                    {isAuthorizedInstructor && effectiveActiveFichas.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveView('instructor')}
                        className="px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Crear primera Ficha como Instructor
                      </button>
                    )}
                  </div>
                </div>

                {effectiveActiveFichas.length > 0 && (
                  <form
                    onSubmit={(e) => void handleLinkEnrollment(e)}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
                  >
                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Ficha Activa
                      </span>
                      <select
                        value={localState.profile.selectedFichaId}
                        onChange={(e) =>
                          setLocalState((prev) => ({
                            ...prev,
                            profile: {
                              ...prev.profile,
                              selectedFichaId: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      >
                        {effectiveActiveFichas.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fichaCode} · {f.programName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Nombre completo del aprendiz
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={SCHEMA_LIMITS.apprenticeName.maxLength}
                        value={localState.profile.apprenticeName}
                        onChange={(e) =>
                          setLocalState((prev) => ({
                            ...prev,
                            profile: {
                              ...prev.profile,
                              apprenticeName: e.target.value,
                            },
                          }))
                        }
                        placeholder="Tu nombre y apellidos"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Código Carné / Registro
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={SCHEMA_LIMITS.documentCode.maxLength}
                        value={localState.profile.documentCode}
                        onChange={(e) =>
                          setLocalState((prev) => ({
                            ...prev,
                            profile: {
                              ...prev.profile,
                              documentCode: e.target.value,
                            },
                          }))
                        }
                        placeholder="Ej. APR-102400"
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={syncingProgress}
                      className="px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {syncingProgress
                        ? 'Sincronizando...'
                        : 'Vincular y guardar progreso'}
                    </button>
                  </form>
                )}

                {syncFeedback && (
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
                    ✓ {syncFeedback}
                  </p>
                )}
              </section>

              {/* 3-Pillar Induction Journey Cards */}
              <section className="space-y-6">
                <div className="space-y-1">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Estructura Pedagógica del Proceso de Inducción
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Tres etapas articuladas para garantizar que cada aprendiz comprenda, viva y apropie la cultura institucional del SENA.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-48 w-full overflow-hidden">
                        <ResilientImage
                          src={IDENTITY_IMAGE_PATH}
                          alt="Arquitectura de Centro de Formación SENA en entorno regional colombiano"
                          fallbackTitle="Identidad, Símbolos e Historia"
                        />
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>Etapa 01</span>
                          <span aria-hidden="true">·</span>
                          <span>Escudo, Logosímbolo, Himno y Valores</span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                          Valor e Imagen Institucional
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Inspecciona el significado productivo del piñón, el caduceo y el cafeto, el sentido humano del Logosímbolo y practica dilemas reales del Código de Integridad.
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 pt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {localState.completedModules.includes('identidad') &&
                        localState.completedModules.includes('valores')
                          ? '✓ Completado'
                          : 'Interactivo · 10 min'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveView('identidad')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-[#15803d] dark:hover:text-[#4ade80] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        Explorar módulo
                      </button>
                    </div>
                  </article>

                  {/* Card 2 */}
                  <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-48 w-full overflow-hidden">
                        <ResilientImage
                          src={RIGHTS_IMAGE_PATH}
                          alt="Aprendices revisando el Reglamento del Aprendiz y proyectando su etapa productiva"
                          fallbackTitle="Derechos, Deberes y Etapa Productiva"
                        />
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>Etapa 02</span>
                          <span aria-hidden="true">·</span>
                          <span>Acuerdo 009/2024 · Act. 2026</span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                          Derechos, Deberes y Convivencia
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Explora los 24 Derechos (Cap. II) y 25 Deberes (Cap. III) del Acuerdo 009 de 2024 con sus ajustes 2026: debido proceso (Acuerdo 002 de 2026) y contrato laboral especial (Decreto 0223 de 2026).
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 pt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {localState.completedModules.includes('derechos') &&
                        localState.completedModules.includes('deberes')
                          ? '✓ Completado'
                          : '24 Derechos · 25 Deberes · 4 Casos'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveView('derechos')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-[#15803d] dark:hover:text-[#4ade80] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Scale className="w-4 h-4" />
                        Abrir reglamento
                      </button>
                    </div>
                  </article>

                  {/* Card 3 */}
                  <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-48 w-full overflow-hidden">
                        <ResilientImage
                          src={WORKSHOP_IMAGE_PATH}
                          alt="Evaluación práctica de competencias y seguridad industrial en ambiente técnico"
                          fallbackTitle="Evaluación Diagnóstica de Apropiación"
                        />
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>Etapa 03</span>
                          <span aria-hidden="true">·</span>
                          <span>Diagnóstico por Competencias</span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                          Evaluación Interactiva y Seguimiento
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Resuelve 10 situaciones contextualizadas para medir objetivamente si apropiaste el proceso (Juicio A ≥ 70%) y reporta el desglose directamente a tu Ficha y perfil.
                        </p>
                      </div>
                    </div>
                    <div className="px-6 pb-6 pt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        {localState.latestSummary
                          ? `Último: ${localState.latestSummary.score}%`
                          : 'Diagnóstico inmediato'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveView('evaluacion')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803d] dark:text-[#4ade80] hover:text-emerald-900 dark:hover:text-emerald-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        Presentar prueba
                      </button>
                    </div>
                  </article>
                </div>
              </section>

              {/* Dedicated Induction GFPI-F-165 Productive Stage Selection Section */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      Formato Oficial GFPI-F-165 · V04
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Etapa Productiva desde la Inducción</span>
                    <span aria-hidden="true">·</span>
                    <span>Acuerdo 009/2024 Art. 26 y Decreto 0223/2026</span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Selecciona desde la inducción tu alternativa para realizar las prácticas
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Diligencia el formato institucional GFPI-F-165 eligiendo entre Contrato de Aprendizaje Laboral Especial, Vínculo Formativo, Proyecto Productivo / Fondo Emprender, Economía Popular / CampeSENA, Monitoría SENA o Pasantía Institucional. Tu elección queda sincronizada en tu perfil, carné digital y Ficha activa, y puedes descargar el formato oficial listo para imprimir.
                  </p>
                </div>

                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col lg:items-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveView('formato165')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {effectiveGfpiSubmission
                      ? 'Ver / Modificar Formato GFPI-F-165'
                      : 'Diligenciar Formato GFPI-F-165'}
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {effectiveGfpiSubmission
                      ? `Estado: ${
                          effectiveGfpiSubmission.status === 'radicado' ||
                          effectiveGfpiSubmission.status === 'validado_coordinacion'
                            ? `Radicado (${effectiveGfpiSubmission.filingCode})`
                            : 'Borrador en edición'
                        }`
                      : 'Trámite habilitado en inducción'}
                  </span>
                </div>
              </section>

              {/* Authorized Instructor Context Strip (Hidden completely from Apprentices) */}
              {isAuthorizedInstructor && (
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8 space-y-2">
                    <div className="flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
                      <SenaLogo className="w-5 h-5" />
                      <span>Panel Docente Habilitado para tu Cuenta Autorizada</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                      Gestión de Fichas y Seguimiento de Inducción
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Accede al módulo de Gestión Instructor para administrar tus Fichas de Caracterización, verificar la apropiación de tus aprendices y sincronizar el consolidado oficial en Google Sheets.
                    </p>
                  </div>

                  <div className="lg:col-span-4 flex lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveView('instructor')}
                      className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      Abrir Gestión Instructor
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeView === 'identidad' && (
            <IdentityModule
              completedModules={localState.completedModules}
              onToggleComplete={(m) => void handleToggleModuleComplete(m)}
              onGoToNext={() => setActiveView('derechos')}
            />
          )}

          {activeView === 'derechos' && (
            <RightsDutiesModule
              completedModules={localState.completedModules}
              gfpiSubmission={effectiveGfpiSubmission}
              onToggleComplete={(m) => void handleToggleModuleComplete(m)}
              onOpenFormato165={() => setActiveView('formato165')}
              onStartEvaluation={() => setActiveView('evaluacion')}
            />
          )}

          {activeView === 'formato165' && (
            <GfpiF165Form
              user={user}
              profile={localState.profile}
              activeFichas={apprenticeActiveFichas}
              selectedFicha={apprenticeSelectedFicha}
              savedSubmission={effectiveGfpiSubmission}
              isSaving={syncingProgress}
              onSaveSubmission={handleSaveGfpiF165}
              onNavigate={(view) => setActiveView(view)}
              onRequestSignIn={() => void handleGoogleSignIn()}
            />
          )}

          {activeView === 'evaluacion' && (
            <InteractiveEvaluation
              apprenticeName={localState.profile.apprenticeName}
              documentCode={localState.profile.documentCode}
              selectedFicha={apprenticeSelectedFicha}
              isSignedIn={Boolean(user)}
              isSaving={syncingProgress}
              saveFeedback={syncFeedback}
              latestSummary={localState.latestSummary}
              onCompleteEvaluation={handleCompleteEvaluation}
              onDownloadTrajectoryPdf={handleDownloadApprenticePdf}
              onNavigateModule={(target) => setActiveView(target)}
              onRequestSignIn={() => void handleGoogleSignIn()}
            />
          )}

          {activeView === 'perfil' && (
            <ApprenticeProfile
              user={user}
              profile={localState.profile}
              activeFichas={apprenticeActiveFichas}
              selectedFicha={apprenticeSelectedFicha}
              currentEnrollment={apprenticeCurrentEnrollment}
              gfpiSubmission={effectiveGfpiSubmission}
              completedModules={localState.completedModules}
              latestSummary={localState.latestSummary}
              evaluationHistory={effectiveEvaluationHistory}
              isSyncing={syncingProgress}
              syncFeedback={syncFeedback}
              onSaveProfile={handleSaveApprenticeProfile}
              onToggleCommitment={handleToggleCommitment}
              onSyncWithFicha={handleSyncWithFichaById}
              onNavigate={(view) => setActiveView(view)}
              onRequestSignIn={() => void handleGoogleSignIn()}
            />
          )}

          {isAuthorizedInstructor && activeView === 'instructor' && (
            <InstructorDashboard
              user={user}
              authReady={authReady}
              localWorkspace={localWorkspace}
              onUpdateLocalWorkspace={setLocalWorkspace}
            />
          )}
        </main>

        {/* Quiet Institutional Footer (Zero fake telemetry or engines) */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-16 transition-colors">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2.5">
              <SenaLogo className="w-6 h-6" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Ruta Inducción SENA</span>
              <span aria-hidden="true">·</span>
              <span>Formación Profesional Integral Gratuita</span>
              <span aria-hidden="true">·</span>
              <span>Marco Vigente: Acuerdo 009 de 2024 y Acuerdo 002 de 2026</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveView('identidad')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Identidad
              </button>
              <button
                type="button"
                onClick={() => setActiveView('derechos')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Reglamento
              </button>
              <button
                type="button"
                onClick={() => setActiveView('formato165')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                GFPI-F-165
              </button>
              <button
                type="button"
                onClick={() => setActiveView('perfil')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Mi Perfil
              </button>
              <button
                type="button"
                onClick={() => setActiveView('evaluacion')}
                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#15803d] dark:text-[#4ade80]" />
                Evaluación
              </button>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
