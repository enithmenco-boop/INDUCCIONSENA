import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEMO_COHORT_TEMPLATES } from '../data/senaContent';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AppropriationState,
  BloodType,
  clampScore,
  DifferentialFocusType,
  GfpiCompanySectorType,
  GfpiDocumentType,
  GfpiProcedureType,
  GfpiStatusType,
  InductionModuleId,
  JornadaType,
  ModalityType,
  ProductiveAltType,
  RepresentationRoleType,
  sanitizeCode,
  sanitizeId,
  sanitizeModulesList,
  sanitizeOptionalCode,
  sanitizeOptionalId,
  sanitizePhone,
  SCHEMA_LIMITS,
  TrainingLevelType,
  truncateClean,
  validateApprenticeProfileInput,
  validateEnrollmentRegistration,
  validateFichaInput,
  validateGfpiF165Input,
  validateSheetLinkInput,
} from './validation';

export interface FichaRecord {
  id: string;
  fichaCode: string;
  programName: string;
  centerName: string;
  jornada: JornadaType;
  instructorId: string;
  instructorName: string;
  status: 'activa' | 'cerrada';
  createdAtMs: number;
  updatedAtMs: number;
}

export interface EnrollmentRecord {
  id: string;
  fichaId: string;
  fichaCode: string;
  programName: string;
  authorId: string;
  instructorId: string;
  apprenticeName: string;
  documentCode: string;
  completedModules: InductionModuleId[];
  evalScore: number;
  dimIdentity: number;
  dimValues: number;
  dimRights: number;
  dimDuties: number;
  attemptsCount: number;
  appropriationState: AppropriationState;
  instructorObservation: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface EvaluationAttemptRecord {
  id: string;
  authorId: string;
  fichaId: string;
  instructorId: string;
  fichaCode: string;
  apprenticeName: string;
  score: number;
  passed: boolean;
  dimIdentity: number;
  dimValues: number;
  dimRights: number;
  dimDuties: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  createdAtMs: number;
}

export interface FichaSheetLinkRecord {
  fichaId: string;
  fichaCode: string;
  instructorId: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  templateSourceName: string;
  lastSyncedRows: number;
  lastDataSignature: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ApprenticeProfileData {
  apprenticeName: string;
  documentCode: string;
  trainingLevel: TrainingLevelType;
  modality: ModalityType;
  regionalCenter: string;
  bloodType: BloodType;
  preferredProductiveAlt: ProductiveAltType;
  representationRole: RepresentationRoleType;
  differentialFocus: DifferentialFocusType;
  commitmentAccepted: boolean;
  bioGoal: string;
  selectedFichaId: string;
}

export interface ApprenticeProfileRecord extends ApprenticeProfileData {
  userId: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export const DEFAULT_APPRENTICE_PROFILE: ApprenticeProfileData = {
  apprenticeName: '',
  documentCode: 'APR-102400',
  trainingLevel: 'Tecnólogo',
  modality: 'Presencial',
  regionalCenter: 'Regional Distrito Capital · Centro de Servicios Financieros',
  bloodType: 'O+',
  preferredProductiveAlt: 'Contrato de Aprendizaje Laboral Especial (Dec. 0223/2026)',
  representationRole: 'Aprendiz en Formación',
  differentialFocus: 'Ninguno / General',
  commitmentAccepted: false,
  bioGoal: '',
  selectedFichaId: '',
};

export interface GfpiF165Data {
  fichaId: string;
  procedureType: GfpiProcedureType;
  filingCode: string;
  apprenticeName: string;
  documentType: GfpiDocumentType;
  documentCode: string;
  contactEmail: string;
  contactPhone: string;
  residenceAddress: string;
  fichaCode: string;
  programName: string;
  trainingLevel: TrainingLevelType;
  regionalCenter: string;
  jornada: JornadaType;
  lectivaStartDate: string;
  lectivaEndDate: string;
  productivaStartDate: string;
  productivaEndDate: string;
  selectedAlternative: ProductiveAltType;
  alternativeJustification: string;
  companyName: string;
  companyNit: string;
  companyCity: string;
  companyContactName: string;
  companySector: GfpiCompanySectorType;
  apprenticeSignatureAccepted: boolean;
  status: GfpiStatusType;
}

export interface GfpiF165Record extends GfpiF165Data {
  userId: string;
  instructorId: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export function generateGfpiFilingCode(documentCode: string, fichaCode: string): string {
  const seed = `${documentCode.trim()}|${fichaCode.trim()}|GFPI165`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return sanitizeCode(`GFPI165-2026-${hex}`, SCHEMA_LIMITS.gfpi165.filingCode.maxLength);
}

export function computeSuggestedStageDates(
  trainingLevel: TrainingLevelType,
  lectivaStartIso = '2026-02-02'
): {
  lectivaStartDate: string;
  lectivaEndDate: string;
  productivaStartDate: string;
  productivaEndDate: string;
} {
  const lectivaMonths =
    trainingLevel === 'Tecnólogo'
      ? 21
      : trainingLevel === 'Técnico'
      ? 9
      : trainingLevel === 'Especialización Tecnológica'
      ? 6
      : 3;
  const productivaMonths =
    trainingLevel === 'Operario' || trainingLevel === 'Auxiliar' ? 3 : 6;

  const [yRaw, mRaw, dRaw] = lectivaStartIso.split('-').map((n) => Number(n));
  const baseYear = Number.isFinite(yRaw) && yRaw >= 2020 ? yRaw : 2026;
  const baseMonth = Number.isFinite(mRaw) && mRaw >= 1 && mRaw <= 12 ? mRaw - 1 : 1;
  const baseDay = Number.isFinite(dRaw) && dRaw >= 1 && dRaw <= 28 ? dRaw : 2;

  const toIso = (dateObj: Date): string => {
    const yy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const startLectiva = new Date(Date.UTC(baseYear, baseMonth, baseDay));
  const endLectiva = new Date(Date.UTC(baseYear, baseMonth + lectivaMonths, baseDay));
  const startProductiva = new Date(
    Date.UTC(endLectiva.getUTCFullYear(), endLectiva.getUTCMonth(), endLectiva.getUTCDate() + 1)
  );
  const endProductiva = new Date(
    Date.UTC(
      startProductiva.getUTCFullYear(),
      startProductiva.getUTCMonth() + productivaMonths,
      baseDay
    )
  );

  return {
    lectivaStartDate: toIso(startLectiva),
    lectivaEndDate: toIso(endLectiva),
    productivaStartDate: toIso(startProductiva),
    productivaEndDate: toIso(endProductiva),
  };
}

export function buildDefaultGfpiF165(
  profile: ApprenticeProfileData = DEFAULT_APPRENTICE_PROFILE,
  ficha: FichaRecord | null = null
): GfpiF165Data {
  const dates = computeSuggestedStageDates(profile.trainingLevel, '2026-02-02');
  const fichaCode = ficha ? ficha.fichaCode : '2874590';
  const docCode = profile.documentCode || 'APR-102400';

  return {
    fichaId: ficha ? ficha.id : profile.selectedFichaId,
    procedureType: 'Selección Inicial (Inducción)',
    filingCode: generateGfpiFilingCode(docCode, fichaCode),
    apprenticeName: profile.apprenticeName,
    documentType: 'CC',
    documentCode: docCode,
    contactEmail: '',
    contactPhone: '',
    residenceAddress: '',
    fichaCode,
    programName: ficha
      ? ficha.programName
      : 'Análisis y Desarrollo de Software',
    trainingLevel: profile.trainingLevel,
    regionalCenter: ficha ? ficha.centerName : profile.regionalCenter,
    jornada: ficha ? ficha.jornada : 'Diurna',
    ...dates,
    selectedAlternative: profile.preferredProductiveAlt,
    alternativeJustification: '',
    companyName: '',
    companyNit: '',
    companyCity: '',
    companyContactName: '',
    companySector: 'Por definir en Etapa Lectiva',
    apprenticeSignatureAccepted: false,
    status: 'borrador',
  };
}

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  return Date.now();
}

function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export async function ensureUserPrivateVault(uid: string, email: string): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users_private/${safeUid}`;
  const ref = doc(db, 'users_private', safeUid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        userId: safeUid,
        email: truncateClean(email, SCHEMA_LIMITS.email.maxLength),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeApprenticeProfile(
  uid: string,
  onData: (profile: ApprenticeProfileRecord | null) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const path = `apprentice_profiles/${safeUid}`;
  const ref = doc(db, 'apprentice_profiles', safeUid);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        userId: String(data.userId ?? safeUid),
        apprenticeName: String(data.apprenticeName ?? ''),
        documentCode: String(data.documentCode ?? 'APR-102400'),
        trainingLevel: coerceEnum(
          data.trainingLevel,
          SCHEMA_LIMITS.profile.trainingLevel.allowed,
          DEFAULT_APPRENTICE_PROFILE.trainingLevel
        ),
        modality: coerceEnum(
          data.modality,
          SCHEMA_LIMITS.profile.modality.allowed,
          DEFAULT_APPRENTICE_PROFILE.modality
        ),
        regionalCenter: String(
          data.regionalCenter ?? DEFAULT_APPRENTICE_PROFILE.regionalCenter
        ),
        bloodType: coerceEnum(
          data.bloodType,
          SCHEMA_LIMITS.profile.bloodType.allowed,
          DEFAULT_APPRENTICE_PROFILE.bloodType
        ),
        preferredProductiveAlt: coerceEnum(
          data.preferredProductiveAlt,
          SCHEMA_LIMITS.profile.preferredProductiveAlt.allowed,
          DEFAULT_APPRENTICE_PROFILE.preferredProductiveAlt
        ),
        representationRole: coerceEnum(
          data.representationRole,
          SCHEMA_LIMITS.profile.representationRole.allowed,
          DEFAULT_APPRENTICE_PROFILE.representationRole
        ),
        differentialFocus: coerceEnum(
          data.differentialFocus,
          SCHEMA_LIMITS.profile.differentialFocus.allowed,
          DEFAULT_APPRENTICE_PROFILE.differentialFocus
        ),
        commitmentAccepted: Boolean(data.commitmentAccepted),
        bioGoal: String(data.bioGoal ?? ''),
        selectedFichaId: String(data.selectedFichaId ?? ''),
        createdAtMs: toMillis(data.createdAt),
        updatedAtMs: toMillis(data.updatedAt),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function upsertApprenticeProfile(
  input: ApprenticeProfileData
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Inicia sesión con Google para guardar tu perfil en la nube.');
  }

  const check = validateApprenticeProfileInput(input);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const safeUid = sanitizeId(currentUser.uid);
  const path = `apprentice_profiles/${safeUid}`;
  const ref = doc(db, 'apprentice_profiles', safeUid);

  let verifiedFichaId = sanitizeOptionalId(input.selectedFichaId);
  if (verifiedFichaId) {
    try {
      const fichaSnap = await getDoc(doc(db, 'fichas', verifiedFichaId));
      if (!fichaSnap.exists()) {
        verifiedFichaId = '';
      }
    } catch {
      verifiedFichaId = '';
    }
  }

  const cleanPayload = {
    apprenticeName: truncateClean(
      input.apprenticeName,
      SCHEMA_LIMITS.apprenticeName.maxLength
    ),
    documentCode: sanitizeCode(
      input.documentCode,
      SCHEMA_LIMITS.documentCode.maxLength
    ),
    trainingLevel: input.trainingLevel,
    modality: input.modality,
    regionalCenter: truncateClean(
      input.regionalCenter,
      SCHEMA_LIMITS.profile.regionalCenter.maxLength
    ),
    bloodType: input.bloodType,
    preferredProductiveAlt: input.preferredProductiveAlt,
    representationRole: input.representationRole,
    differentialFocus: input.differentialFocus,
    commitmentAccepted: Boolean(input.commitmentAccepted),
    bioGoal: truncateClean(input.bioGoal, SCHEMA_LIMITS.profile.bioGoal.maxLength),
    selectedFichaId: verifiedFichaId,
  };

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        userId: safeUid,
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...cleanPayload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function mapSnapshotToGfpiRecord(
  docId: string,
  data: Record<string, unknown>
): GfpiF165Record {
  const fallback = buildDefaultGfpiF165();
  const docCode = String(data.documentCode ?? fallback.documentCode);
  const fCode = String(data.fichaCode ?? fallback.fichaCode);

  return {
    userId: String(data.userId ?? docId),
    fichaId: String(data.fichaId ?? ''),
    instructorId: String(data.instructorId ?? ''),
    procedureType: coerceEnum(
      data.procedureType,
      SCHEMA_LIMITS.gfpi165.procedureType.allowed,
      fallback.procedureType
    ),
    filingCode: String(
      data.filingCode ?? generateGfpiFilingCode(docCode, fCode)
    ),
    apprenticeName: String(data.apprenticeName ?? ''),
    documentType: coerceEnum(
      data.documentType,
      SCHEMA_LIMITS.gfpi165.documentType.allowed,
      fallback.documentType
    ),
    documentCode: docCode,
    contactEmail: String(data.contactEmail ?? ''),
    contactPhone: String(data.contactPhone ?? ''),
    residenceAddress: String(data.residenceAddress ?? ''),
    fichaCode: fCode,
    programName: String(data.programName ?? fallback.programName),
    trainingLevel: coerceEnum(
      data.trainingLevel,
      SCHEMA_LIMITS.profile.trainingLevel.allowed,
      fallback.trainingLevel
    ),
    regionalCenter: String(data.regionalCenter ?? fallback.regionalCenter),
    jornada: coerceEnum(
      data.jornada,
      SCHEMA_LIMITS.jornada.allowed,
      fallback.jornada
    ),
    lectivaStartDate: String(data.lectivaStartDate ?? fallback.lectivaStartDate),
    lectivaEndDate: String(data.lectivaEndDate ?? fallback.lectivaEndDate),
    productivaStartDate: String(
      data.productivaStartDate ?? fallback.productivaStartDate
    ),
    productivaEndDate: String(
      data.productivaEndDate ?? fallback.productivaEndDate
    ),
    selectedAlternative: coerceEnum(
      data.selectedAlternative,
      SCHEMA_LIMITS.gfpi165.selectedAlternative.allowed,
      fallback.selectedAlternative
    ),
    alternativeJustification: String(data.alternativeJustification ?? ''),
    companyName: String(data.companyName ?? ''),
    companyNit: String(data.companyNit ?? ''),
    companyCity: String(data.companyCity ?? ''),
    companyContactName: String(data.companyContactName ?? ''),
    companySector: coerceEnum(
      data.companySector,
      SCHEMA_LIMITS.gfpi165.companySector.allowed,
      fallback.companySector
    ),
    apprenticeSignatureAccepted: Boolean(data.apprenticeSignatureAccepted),
    status: coerceEnum(
      data.status,
      SCHEMA_LIMITS.gfpi165.status.allowed,
      'borrador'
    ),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
}

export function subscribeGfpiF165Submission(
  uid: string,
  onData: (submission: GfpiF165Record | null) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const path = `gfpi_f_165_submissions/${safeUid}`;
  const ref = doc(db, 'gfpi_f_165_submissions', safeUid);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(
        mapSnapshotToGfpiRecord(
          snapshot.id,
          snapshot.data() as Record<string, unknown>
        )
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeFichaGfpiSubmissions(
  fichaId: string,
  uid: string,
  email: string | null | undefined,
  onData: (submissions: GfpiF165Record[]) => void
): () => void {
  const safeFichaId = sanitizeId(fichaId);
  const path = 'gfpi_f_165_submissions';
  const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL;

  const q = isBootstrap
    ? query(collection(db, path), where('fichaId', '==', safeFichaId))
    : query(
        collection(db, path),
        where('fichaId', '==', safeFichaId),
        where('instructorId', '==', sanitizeId(uid))
      );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapSnapshotToGfpiRecord(d.id, d.data() as Record<string, unknown>)
      );
      list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function upsertGfpiF165Submission(
  input: GfpiF165Data
): Promise<GfpiF165Record> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Inicia sesión con Google para respaldar el formato GFPI-F-165 en la nube.');
  }

  const check = validateGfpiF165Input(input);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const safeUid = sanitizeId(currentUser.uid);
  const path = `gfpi_f_165_submissions/${safeUid}`;
  const ref = doc(db, 'gfpi_f_165_submissions', safeUid);

  let verifiedFichaId = sanitizeOptionalId(input.fichaId);
  let verifiedInstructorId = '';
  if (verifiedFichaId) {
    try {
      const fichaSnap = await getDoc(doc(db, 'fichas', verifiedFichaId));
      if (fichaSnap.exists() && fichaSnap.data().status === 'activa') {
        verifiedInstructorId = sanitizeOptionalId(
          String(fichaSnap.data().instructorId ?? '')
        );
      } else {
        verifiedFichaId = '';
      }
    } catch {
      verifiedFichaId = '';
    }
  }

  const cleanDocCode = sanitizeCode(
    input.documentCode,
    SCHEMA_LIMITS.documentCode.maxLength
  );
  const cleanFichaCode = sanitizeCode(
    input.fichaCode,
    SCHEMA_LIMITS.fichaCode.maxLength
  );
  const cleanFilingCode =
    sanitizeCode(input.filingCode, SCHEMA_LIMITS.gfpi165.filingCode.maxLength) ||
    generateGfpiFilingCode(cleanDocCode, cleanFichaCode);

  const safeStatus: GfpiStatusType =
    input.status === 'radicado' ? 'radicado' : 'borrador';

  const cleanPayload = {
    fichaId: verifiedFichaId,
    instructorId: verifiedInstructorId,
    procedureType: input.procedureType,
    filingCode: cleanFilingCode,
    apprenticeName: truncateClean(
      input.apprenticeName,
      SCHEMA_LIMITS.apprenticeName.maxLength
    ),
    documentType: input.documentType,
    documentCode: cleanDocCode,
    contactEmail: truncateClean(
      input.contactEmail,
      SCHEMA_LIMITS.gfpi165.contactEmail.maxLength
    ),
    contactPhone: sanitizePhone(input.contactPhone),
    residenceAddress: truncateClean(
      input.residenceAddress,
      SCHEMA_LIMITS.gfpi165.residenceAddress.maxLength
    ),
    fichaCode: cleanFichaCode,
    programName: truncateClean(
      input.programName,
      SCHEMA_LIMITS.programName.maxLength
    ),
    trainingLevel: input.trainingLevel,
    regionalCenter: truncateClean(
      input.regionalCenter,
      SCHEMA_LIMITS.profile.regionalCenter.maxLength
    ),
    jornada: input.jornada,
    lectivaStartDate: input.lectivaStartDate,
    lectivaEndDate: input.lectivaEndDate,
    productivaStartDate: input.productivaStartDate,
    productivaEndDate: input.productivaEndDate,
    selectedAlternative: input.selectedAlternative,
    alternativeJustification: truncateClean(
      input.alternativeJustification,
      SCHEMA_LIMITS.gfpi165.alternativeJustification.maxLength
    ),
    companyName: truncateClean(
      input.companyName,
      SCHEMA_LIMITS.gfpi165.companyName.maxLength
    ),
    companyNit: sanitizeOptionalCode(
      input.companyNit,
      SCHEMA_LIMITS.gfpi165.companyNit.maxLength
    ),
    companyCity: truncateClean(
      input.companyCity,
      SCHEMA_LIMITS.gfpi165.companyCity.maxLength
    ),
    companyContactName: truncateClean(
      input.companyContactName,
      SCHEMA_LIMITS.gfpi165.companyContactName.maxLength
    ),
    companySector: input.companySector,
    apprenticeSignatureAccepted: Boolean(input.apprenticeSignatureAccepted),
    status: safeStatus,
  };

  const now = Date.now();

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        userId: safeUid,
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        userId: safeUid,
        ...cleanPayload,
        createdAtMs: now,
        updatedAtMs: now,
      };
    }

    const existingData = existingSnap.data();
    if (existingData.status === 'validado_coordinacion') {
      throw new Error(
        'Este formato GFPI-F-165 ya cuenta con validación definitiva de Coordinación Académica.'
      );
    }

    await updateDoc(ref, {
      ...cleanPayload,
      updatedAt: serverTimestamp(),
    });

    return {
      userId: safeUid,
      ...cleanPayload,
      createdAtMs: toMillis(existingData.createdAt),
      updatedAtMs: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeApprenticeEvaluations(
  uid: string,
  onData: (evaluations: EvaluationAttemptRecord[]) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const path = 'evaluations';
  const q = query(collection(db, path), where('authorId', '==', safeUid));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: EvaluationAttemptRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorId: String(data.authorId ?? ''),
          fichaId: String(data.fichaId ?? ''),
          instructorId: String(data.instructorId ?? ''),
          fichaCode: String(data.fichaCode ?? ''),
          apprenticeName: String(data.apprenticeName ?? ''),
          score: Number(data.score ?? 0),
          passed: Boolean(data.passed),
          dimIdentity: Number(data.dimIdentity ?? 0),
          dimValues: Number(data.dimValues ?? 0),
          dimRights: Number(data.dimRights ?? 0),
          dimDuties: Number(data.dimDuties ?? 0),
          correctCount: Number(data.correctCount ?? 0),
          totalQuestions: Number(data.totalQuestions ?? 10),
          durationSeconds: Number(data.durationSeconds ?? 0),
          createdAtMs: toMillis(data.createdAt),
        };
      });
      records.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeFichaEvaluations(
  fichaId: string,
  uid: string,
  email: string | null | undefined,
  onData: (evaluations: EvaluationAttemptRecord[]) => void
): () => void {
  const safeFichaId = sanitizeId(fichaId);
  const path = 'evaluations';
  const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL;

  const q = isBootstrap
    ? query(collection(db, path), where('fichaId', '==', safeFichaId))
    : query(
        collection(db, path),
        where('fichaId', '==', safeFichaId),
        where('instructorId', '==', sanitizeId(uid))
      );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: EvaluationAttemptRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorId: String(data.authorId ?? ''),
          fichaId: String(data.fichaId ?? ''),
          instructorId: String(data.instructorId ?? ''),
          fichaCode: String(data.fichaCode ?? ''),
          apprenticeName: String(data.apprenticeName ?? ''),
          score: Number(data.score ?? 0),
          passed: Boolean(data.passed),
          dimIdentity: Number(data.dimIdentity ?? 0),
          dimValues: Number(data.dimValues ?? 0),
          dimRights: Number(data.dimRights ?? 0),
          dimDuties: Number(data.dimDuties ?? 0),
          correctCount: Number(data.correctCount ?? 0),
          totalQuestions: Number(data.totalQuestions ?? 10),
          durationSeconds: Number(data.durationSeconds ?? 0),
          createdAtMs: toMillis(data.createdAt),
        };
      });
      records.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeFichaSheetLink(
  fichaId: string,
  onData: (link: FichaSheetLinkRecord | null) => void
): () => void {
  const safeFichaId = sanitizeId(fichaId);
  const path = `ficha_sheet_links/${safeFichaId}`;
  const ref = doc(db, 'ficha_sheet_links', safeFichaId);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        fichaId: String(data.fichaId ?? safeFichaId),
        fichaCode: String(data.fichaCode ?? ''),
        instructorId: String(data.instructorId ?? ''),
        spreadsheetId: String(data.spreadsheetId ?? ''),
        spreadsheetUrl: String(data.spreadsheetUrl ?? ''),
        spreadsheetTitle: String(data.spreadsheetTitle ?? ''),
        templateSourceName: String(data.templateSourceName ?? ''),
        lastSyncedRows: Number(data.lastSyncedRows ?? 0),
        lastDataSignature: String(data.lastDataSignature ?? ''),
        createdAtMs: toMillis(data.createdAt),
        updatedAtMs: toMillis(data.updatedAt),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function upsertFichaSheetLink(
  ficha: FichaRecord,
  input: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    spreadsheetTitle: string;
    templateSourceName: string;
    lastSyncedRows: number;
    lastDataSignature: string;
  }
): Promise<FichaSheetLinkRecord> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Inicia sesión con Google para vincular la hoja en la nube.');
  }

  const check = validateSheetLinkInput(input);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const safeFichaId = sanitizeId(ficha.id);
  const path = `ficha_sheet_links/${safeFichaId}`;
  const ref = doc(db, 'ficha_sheet_links', safeFichaId);

  const cleanSpreadsheetId = sanitizeId(input.spreadsheetId);
  const cleanSpreadsheetUrl = truncateClean(
    input.spreadsheetUrl,
    SCHEMA_LIMITS.sheetLink.spreadsheetUrl.maxLength
  );
  const cleanSpreadsheetTitle = truncateClean(
    input.spreadsheetTitle,
    SCHEMA_LIMITS.sheetLink.spreadsheetTitle.maxLength
  );
  const cleanTemplateSource = truncateClean(
    input.templateSourceName,
    SCHEMA_LIMITS.sheetLink.templateSourceName.maxLength
  );
  const cleanRows = Math.max(0, Math.min(5000, Math.round(input.lastSyncedRows)));
  const cleanSignature = sanitizeOptionalId(input.lastDataSignature);
  const cleanFichaCode = sanitizeCode(ficha.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength);
  const cleanInstructorId = sanitizeId(ficha.instructorId);
  const now = Date.now();

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        fichaId: safeFichaId,
        fichaCode: cleanFichaCode,
        instructorId: cleanInstructorId,
        spreadsheetId: cleanSpreadsheetId,
        spreadsheetUrl: cleanSpreadsheetUrl,
        spreadsheetTitle: cleanSpreadsheetTitle,
        templateSourceName: cleanTemplateSource,
        lastSyncedRows: cleanRows,
        lastDataSignature: cleanSignature,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        fichaId: safeFichaId,
        fichaCode: cleanFichaCode,
        instructorId: cleanInstructorId,
        spreadsheetId: cleanSpreadsheetId,
        spreadsheetUrl: cleanSpreadsheetUrl,
        spreadsheetTitle: cleanSpreadsheetTitle,
        templateSourceName: cleanTemplateSource,
        lastSyncedRows: cleanRows,
        lastDataSignature: cleanSignature,
        createdAtMs: now,
        updatedAtMs: now,
      };
    }

    const existingData = existingSnap.data();
    await updateDoc(ref, {
      spreadsheetId: cleanSpreadsheetId,
      spreadsheetUrl: cleanSpreadsheetUrl,
      spreadsheetTitle: cleanSpreadsheetTitle,
      templateSourceName: cleanTemplateSource,
      lastSyncedRows: cleanRows,
      lastDataSignature: cleanSignature,
      updatedAt: serverTimestamp(),
    });

    return {
      fichaId: safeFichaId,
      fichaCode: cleanFichaCode,
      instructorId: cleanInstructorId,
      spreadsheetId: cleanSpreadsheetId,
      spreadsheetUrl: cleanSpreadsheetUrl,
      spreadsheetTitle: cleanSpreadsheetTitle,
      templateSourceName: cleanTemplateSource,
      lastSyncedRows: cleanRows,
      lastDataSignature: cleanSignature,
      createdAtMs: toMillis(existingData.createdAt),
      updatedAtMs: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeActiveFichas(
  onData: (fichas: FichaRecord[]) => void
): () => void {
  const path = 'fichas';
  const q = query(collection(db, path), where('status', '==', 'activa'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: FichaRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fichaCode: String(data.fichaCode ?? ''),
          programName: String(data.programName ?? ''),
          centerName: String(data.centerName ?? ''),
          jornada: (data.jornada as JornadaType) ?? 'Diurna',
          instructorId: String(data.instructorId ?? ''),
          instructorName: String(data.instructorName ?? ''),
          status: data.status === 'cerrada' ? 'cerrada' : 'activa',
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
        };
      });
      records.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeInstructorFichas(
  uid: string,
  email: string | null | undefined,
  onData: (fichas: FichaRecord[]) => void
): () => void {
  const path = 'fichas';
  const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL;
  const q = isBootstrap
    ? query(collection(db, path))
    : query(collection(db, path), where('instructorId', '==', sanitizeId(uid)));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: FichaRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fichaCode: String(data.fichaCode ?? ''),
          programName: String(data.programName ?? ''),
          centerName: String(data.centerName ?? ''),
          jornada: (data.jornada as JornadaType) ?? 'Diurna',
          instructorId: String(data.instructorId ?? ''),
          instructorName: String(data.instructorName ?? ''),
          status: data.status === 'cerrada' ? 'cerrada' : 'activa',
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
        };
      });
      records.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeFichaEnrollments(
  fichaId: string,
  uid: string,
  email: string | null | undefined,
  mode: 'instructor' | 'apprentice',
  onData: (enrollments: EnrollmentRecord[]) => void
): () => void {
  const safeFichaId = sanitizeId(fichaId);
  const path = `fichas/${safeFichaId}/enrollments`;
  const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL;

  const q =
    mode === 'instructor'
      ? isBootstrap
        ? query(collection(db, 'fichas', safeFichaId, 'enrollments'))
        : query(
            collection(db, 'fichas', safeFichaId, 'enrollments'),
            where('instructorId', '==', sanitizeId(uid))
          )
      : query(
          collection(db, 'fichas', safeFichaId, 'enrollments'),
          where('authorId', '==', sanitizeId(uid))
        );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: EnrollmentRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          fichaId: String(data.fichaId ?? safeFichaId),
          fichaCode: String(data.fichaCode ?? ''),
          programName: String(data.programName ?? ''),
          authorId: String(data.authorId ?? ''),
          instructorId: String(data.instructorId ?? ''),
          apprenticeName: String(data.apprenticeName ?? ''),
          documentCode: String(data.documentCode ?? ''),
          completedModules: sanitizeModulesList(
            Array.isArray(data.completedModules) ? data.completedModules : []
          ),
          evalScore: Number(data.evalScore ?? 0),
          dimIdentity: Number(data.dimIdentity ?? 0),
          dimValues: Number(data.dimValues ?? 0),
          dimRights: Number(data.dimRights ?? 0),
          dimDuties: Number(data.dimDuties ?? 0),
          attemptsCount: Number(data.attemptsCount ?? 0),
          appropriationState:
            (data.appropriationState as AppropriationState) ?? 'en_proceso',
          instructorObservation: String(data.instructorObservation ?? ''),
          createdAtMs: toMillis(data.createdAt),
          updatedAtMs: toMillis(data.updatedAt),
        };
      });
      list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createFichaInFirestore(input: {
  fichaCode: string;
  programName: string;
  centerName: string;
  jornada: JornadaType;
  instructorName: string;
}): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Debes iniciar sesión con Google para crear una ficha.');
  }

  const check = validateFichaInput(input);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const cleanCode = sanitizeCode(input.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength);
  const fichaId = sanitizeId(`ficha_${cleanCode}_${Date.now().toString(36)}`);
  const path = `fichas/${fichaId}`;

  try {
    await setDoc(doc(db, 'fichas', fichaId), {
      fichaCode: cleanCode,
      programName: truncateClean(input.programName, SCHEMA_LIMITS.programName.maxLength),
      centerName: truncateClean(input.centerName, SCHEMA_LIMITS.centerName.maxLength),
      jornada: input.jornada,
      instructorId: sanitizeId(currentUser.uid),
      instructorName: truncateClean(
        input.instructorName,
        SCHEMA_LIMITS.instructorName.maxLength
      ),
      status: 'activa',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return fichaId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function closeFichaInFirestore(fichaId: string): Promise<void> {
  const safeId = sanitizeId(fichaId);
  const path = `fichas/${safeId}`;
  try {
    await updateDoc(doc(db, 'fichas', safeId), {
      status: 'cerrada',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertSelfEnrollment(params: {
  ficha: FichaRecord;
  apprenticeName: string;
  documentCode: string;
  completedModules: InductionModuleId[];
  evalResult?: {
    score: number;
    dimIdentity: number;
    dimValues: number;
    dimRights: number;
    dimDuties: number;
    correctCount: number;
    durationSeconds: number;
  };
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Inicia sesión con Google para sincronizar tu ficha.');
  }

  const regCheck = validateEnrollmentRegistration({
    apprenticeName: params.apprenticeName,
    documentCode: params.documentCode,
  });
  if (!regCheck.valid) {
    throw new Error(regCheck.error);
  }

  const safeUid = sanitizeId(currentUser.uid);
  const safeFichaId = sanitizeId(params.ficha.id);
  const enrollmentId = sanitizeId(`enr_${safeUid}`);
  const enrollmentPath = `fichas/${safeFichaId}/enrollments/${enrollmentId}`;
  const enrollmentRef = doc(db, 'fichas', safeFichaId, 'enrollments', enrollmentId);

  const cleanModules = sanitizeModulesList(params.completedModules);
  const cleanName = truncateClean(
    params.apprenticeName,
    SCHEMA_LIMITS.apprenticeName.maxLength
  );
  const cleanDocCode = sanitizeCode(
    params.documentCode,
    SCHEMA_LIMITS.documentCode.maxLength
  );

  try {
    const existingSnap = await getDoc(enrollmentRef);

    if (!existingSnap.exists()) {
      const score = params.evalResult ? clampScore(params.evalResult.score) : 0;
      const state: AppropriationState = params.evalResult
        ? score >= 70
          ? 'apropiado'
          : 'plan_mejoramiento'
        : 'en_proceso';

      await setDoc(enrollmentRef, {
        fichaId: safeFichaId,
        fichaCode: sanitizeCode(params.ficha.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength),
        programName: truncateClean(
          params.ficha.programName,
          SCHEMA_LIMITS.programName.maxLength
        ),
        authorId: safeUid,
        instructorId: sanitizeId(params.ficha.instructorId),
        apprenticeName: cleanName,
        documentCode: cleanDocCode,
        completedModules: cleanModules,
        evalScore: score,
        dimIdentity: params.evalResult ? clampScore(params.evalResult.dimIdentity) : 0,
        dimValues: params.evalResult ? clampScore(params.evalResult.dimValues) : 0,
        dimRights: params.evalResult ? clampScore(params.evalResult.dimRights) : 0,
        dimDuties: params.evalResult ? clampScore(params.evalResult.dimDuties) : 0,
        attemptsCount: params.evalResult ? 1 : 0,
        appropriationState: state,
        instructorObservation: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      if (existingData.appropriationState === 'certificado') {
        return; // Terminal state reached; already certified by instructor
      }

      if (params.evalResult) {
        const score = clampScore(params.evalResult.score);
        const state: AppropriationState =
          score >= 70 ? 'apropiado' : 'plan_mejoramiento';
        const nextAttempts = Math.min(50, Number(existingData.attemptsCount ?? 0) + 1);

        await updateDoc(enrollmentRef, {
          apprenticeName: cleanName,
          documentCode: cleanDocCode,
          completedModules: cleanModules,
          evalScore: score,
          dimIdentity: clampScore(params.evalResult.dimIdentity),
          dimValues: clampScore(params.evalResult.dimValues),
          dimRights: clampScore(params.evalResult.dimRights),
          dimDuties: clampScore(params.evalResult.dimDuties),
          attemptsCount: nextAttempts,
          appropriationState: state,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(enrollmentRef, {
          apprenticeName: cleanName,
          documentCode: cleanDocCode,
          completedModules: cleanModules,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (params.evalResult) {
      const score = clampScore(params.evalResult.score);
      const evalId = sanitizeId(`eval_${safeUid}_${Date.now().toString(36)}`);
      await setDoc(doc(db, 'evaluations', evalId), {
        authorId: safeUid,
        fichaId: safeFichaId,
        instructorId: sanitizeId(params.ficha.instructorId),
        fichaCode: sanitizeCode(params.ficha.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength),
        apprenticeName: cleanName,
        score,
        passed: score >= 70,
        dimIdentity: clampScore(params.evalResult.dimIdentity),
        dimValues: clampScore(params.evalResult.dimValues),
        dimRights: clampScore(params.evalResult.dimRights),
        dimDuties: clampScore(params.evalResult.dimDuties),
        correctCount: Math.max(0, Math.min(10, Math.round(params.evalResult.correctCount))),
        totalQuestions: 10,
        durationSeconds: Math.max(
          1,
          Math.min(7200, Math.round(params.evalResult.durationSeconds))
        ),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, enrollmentPath);
  }
}

export async function seedDemoCohortInFicha(ficha: FichaRecord): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Debes iniciar sesión como instructor para cargar datos en la ficha.');
  }

  const safeUid = sanitizeId(currentUser.uid);
  const safeFichaId = sanitizeId(ficha.id);

  for (const tpl of DEMO_COHORT_TEMPLATES) {
    const enrollmentId = sanitizeId(`cohort_${safeFichaId}_${tpl.suffix}`);
    const path = `fichas/${safeFichaId}/enrollments/${enrollmentId}`;
    try {
      const ref = doc(db, 'fichas', safeFichaId, 'enrollments', enrollmentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          fichaId: safeFichaId,
          fichaCode: sanitizeCode(ficha.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength),
          programName: truncateClean(
            ficha.programName,
            SCHEMA_LIMITS.programName.maxLength
          ),
          authorId: safeUid,
          instructorId: sanitizeId(ficha.instructorId),
          apprenticeName: truncateClean(
            tpl.apprenticeName,
            SCHEMA_LIMITS.apprenticeName.maxLength
          ),
          documentCode: sanitizeCode(
            tpl.documentCode,
            SCHEMA_LIMITS.documentCode.maxLength
          ),
          completedModules: sanitizeModulesList(tpl.completedModules),
          evalScore: clampScore(tpl.evalScore),
          dimIdentity: clampScore(tpl.dimIdentity),
          dimValues: clampScore(tpl.dimValues),
          dimRights: clampScore(tpl.dimRights),
          dimDuties: clampScore(tpl.dimDuties),
          attemptsCount: tpl.attemptsCount,
          appropriationState: tpl.appropriationState,
          instructorObservation: truncateClean(
            tpl.instructorObservation,
            SCHEMA_LIMITS.instructorObservation.maxLength
          ),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export async function updateInstructorReview(params: {
  fichaId: string;
  enrollmentId: string;
  appropriationState: AppropriationState;
  instructorObservation: string;
}): Promise<void> {
  const safeFichaId = sanitizeId(params.fichaId);
  const safeEnrollmentId = sanitizeId(params.enrollmentId);
  const path = `fichas/${safeFichaId}/enrollments/${safeEnrollmentId}`;

  try {
    await updateDoc(doc(db, 'fichas', safeFichaId, 'enrollments', safeEnrollmentId), {
      appropriationState: params.appropriationState,
      instructorObservation: truncateClean(
        params.instructorObservation,
        SCHEMA_LIMITS.instructorObservation.maxLength
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/* ============================================================================
 * PASSWORDLESS LOCAL COHORT WORKSPACE (Instant Instructor & Apprentice Sync)
 * ========================================================================== */

export const LOCAL_INSTRUCTOR_STORAGE_KEY = 'sena_induccion_instructor_local_v1';
export const LOCAL_APPRENTICE_AUTHOR_ID = 'local_aprendiz';
export const LOCAL_APPRENTICE_ENROLLMENT_ID = 'enr_local_aprendiz';

export interface LocalInstructorWorkspace {
  instructorName: string;
  fichas: FichaRecord[];
  enrollmentsByFicha: Record<string, EnrollmentRecord[]>;
  localEvaluations: EvaluationAttemptRecord[];
  gfpiByDocCode: Record<string, GfpiF165Record>;
  sheetLinksByFicha: Record<string, FichaSheetLinkRecord>;
}

const DEMO_GFPI_ALTERNATIVES: Record<
  string,
  {
    selectedAlternative: ProductiveAltType;
    status: GfpiStatusType;
    companySector: GfpiCompanySectorType;
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    residenceAddress: string;
    companyContactName: string;
  }
> = {
  'APR-108421': {
    selectedAlternative: 'Contrato de Aprendizaje Laboral Especial (Dec. 0223/2026)',
    status: 'radicado',
    companySector: 'Tecnología y Software',
    companyName: 'Soluciones Digitales Andinas S.A.S.',
    contactEmail: 'aprendiz.software1@soy.sena.edu.co',
    contactPhone: '300 412 8890',
    residenceAddress: 'Medellín · Antioquia',
    companyContactName: 'Ing. Natalia Restrepo',
  },
  'APR-109534': {
    selectedAlternative: 'Proyecto Productivo / Fondo Emprender',
    status: 'radicado',
    companySector: 'Tecnología y Software',
    companyName: 'Proyecto AgroTech Trazabilidad Cafetera',
    contactEmail: 'emprendimiento.cafe@soy.sena.edu.co',
    contactPhone: '311 654 2031',
    residenceAddress: 'Envigado · Antioquia',
    companyContactName: 'Unidad SBDC SENA',
  },
  'APR-104892': {
    selectedAlternative: 'Pasantía Institucional',
    status: 'borrador',
    companySector: 'Entidad Pública / SENA',
    companyName: '',
    contactEmail: 'aprendiz.pasantia@soy.sena.edu.co',
    contactPhone: '315 890 1142',
    residenceAddress: 'Bello · Antioquia',
    companyContactName: '',
  },
  'APR-112047': {
    selectedAlternative: 'Monitoría SENA',
    status: 'radicado',
    companySector: 'Entidad Pública / SENA',
    companyName: 'SENNOVA · Semillero Desarrollo de Software',
    contactEmail: 'monitoria.sennova@soy.sena.edu.co',
    contactPhone: '320 778 4509',
    residenceAddress: 'Itagüí · Antioquia',
    companyContactName: 'Líder SENNOVA Centro',
  },
};

function buildSeededGfpiMapForFicha(
  ficha: FichaRecord,
  baseNow: number
): Record<string, GfpiF165Record> {
  const dates = computeSuggestedStageDates('Tecnólogo', '2026-02-02');
  const map: Record<string, GfpiF165Record> = {};

  for (const tpl of DEMO_COHORT_TEMPLATES) {
    const preset = DEMO_GFPI_ALTERNATIVES[tpl.documentCode];
    if (!preset) continue;
    const code = sanitizeCode(tpl.documentCode, SCHEMA_LIMITS.documentCode.maxLength);
    map[code] = {
      userId: `demo_${tpl.suffix}`,
      fichaId: ficha.id,
      instructorId: ficha.instructorId,
      procedureType: 'Selección Inicial (Inducción)',
      filingCode: generateGfpiFilingCode(code, ficha.fichaCode),
      apprenticeName: tpl.apprenticeName,
      documentType: 'CC',
      documentCode: code,
      contactEmail: preset.contactEmail,
      contactPhone: preset.contactPhone,
      residenceAddress: preset.residenceAddress,
      fichaCode: ficha.fichaCode,
      programName: ficha.programName,
      trainingLevel: 'Tecnólogo',
      regionalCenter: ficha.centerName,
      jornada: ficha.jornada,
      ...dates,
      selectedAlternative: preset.selectedAlternative,
      alternativeJustification:
        'Selección proyectada durante jornada de inducción SENA.',
      companyName: preset.companyName,
      companyNit: '',
      companyCity: 'Medellín',
      companyContactName: preset.companyContactName,
      companySector: preset.companySector,
      apprenticeSignatureAccepted: preset.status === 'radicado',
      status: preset.status,
      createdAtMs: baseNow - 7200_000,
      updatedAtMs: baseNow - 3600_000,
    };
  }

  return map;
}

function buildSeededEnrollmentsForFicha(
  ficha: FichaRecord,
  baseNow: number
): EnrollmentRecord[] {
  return DEMO_COHORT_TEMPLATES.map((tpl, index) => ({
    id: sanitizeId(`cohort_${ficha.id}_${tpl.suffix}`),
    fichaId: ficha.id,
    fichaCode: ficha.fichaCode,
    programName: ficha.programName,
    authorId: `demo_${tpl.suffix}`,
    instructorId: ficha.instructorId,
    apprenticeName: truncateClean(
      tpl.apprenticeName,
      SCHEMA_LIMITS.apprenticeName.maxLength
    ),
    documentCode: sanitizeCode(tpl.documentCode, SCHEMA_LIMITS.documentCode.maxLength),
    completedModules: sanitizeModulesList(tpl.completedModules),
    evalScore: clampScore(tpl.evalScore),
    dimIdentity: clampScore(tpl.dimIdentity),
    dimValues: clampScore(tpl.dimValues),
    dimRights: clampScore(tpl.dimRights),
    dimDuties: clampScore(tpl.dimDuties),
    attemptsCount: tpl.attemptsCount,
    appropriationState: tpl.appropriationState,
    instructorObservation: truncateClean(
      tpl.instructorObservation,
      SCHEMA_LIMITS.instructorObservation.maxLength
    ),
    createdAtMs: baseNow - (index + 1) * 3600_000,
    updatedAtMs: baseNow - index * 1800_000,
  }));
}

export function buildDefaultLocalInstructorWorkspace(): LocalInstructorWorkspace {
  const now = Date.now();
  const defaultInstructorName = 'Instructor Gestor SENA';

  const primaryFicha: FichaRecord = {
    id: 'ficha_2874590_local',
    fichaCode: '2874590',
    programName: 'Análisis y Desarrollo de Software',
    centerName: 'Centro de Servicios y Gestión Empresarial · Regional Antioquia',
    jornada: 'Diurna',
    instructorId: 'local_instructor',
    instructorName: defaultInstructorName,
    status: 'activa',
    createdAtMs: now - 86_400_000,
    updatedAtMs: now,
  };

  const secondaryFicha: FichaRecord = {
    id: 'ficha_2901450_local',
    fichaCode: '2901450',
    programName: 'Gestión Contable y de Información Financiera',
    centerName: 'Centro de Servicios Financieros · Regional Distrito Capital',
    jornada: 'Mixta',
    instructorId: 'local_instructor',
    instructorName: defaultInstructorName,
    status: 'activa',
    createdAtMs: now - 172_800_000,
    updatedAtMs: now - 36_000_000,
  };

  return {
    instructorName: defaultInstructorName,
    fichas: [primaryFicha, secondaryFicha],
    enrollmentsByFicha: {
      [primaryFicha.id]: buildSeededEnrollmentsForFicha(primaryFicha, now),
      [secondaryFicha.id]: [],
    },
    localEvaluations: [],
    gfpiByDocCode: buildSeededGfpiMapForFicha(primaryFicha, now),
    sheetLinksByFicha: {},
  };
}

export function loadLocalInstructorWorkspace(): LocalInstructorWorkspace {
  try {
    const raw = localStorage.getItem(LOCAL_INSTRUCTOR_STORAGE_KEY);
    if (!raw) {
      return buildDefaultLocalInstructorWorkspace();
    }
    const parsed = JSON.parse(raw) as Partial<LocalInstructorWorkspace>;
    if (!Array.isArray(parsed.fichas) || parsed.fichas.length === 0) {
      return buildDefaultLocalInstructorWorkspace();
    }
    const defaultSeeded = buildDefaultLocalInstructorWorkspace();

    const mergedGfpi: Record<string, GfpiF165Record> = {
      ...defaultSeeded.gfpiByDocCode,
    };
    if (parsed.gfpiByDocCode && typeof parsed.gfpiByDocCode === 'object') {
      for (const [key, rawVal] of Object.entries(parsed.gfpiByDocCode)) {
        if (rawVal && typeof rawVal === 'object') {
          const val = rawVal as Partial<GfpiF165Record>;
          mergedGfpi[key] = {
            ...buildDefaultGfpiF165(),
            ...val,
            userId:
              typeof val.userId === 'string' && val.userId.length > 0
                ? val.userId
                : LOCAL_APPRENTICE_AUTHOR_ID,
            instructorId:
              typeof val.instructorId === 'string' && val.instructorId.length > 0
                ? val.instructorId
                : 'local_instructor',
            createdAtMs: typeof val.createdAtMs === 'number' ? val.createdAtMs : Date.now(),
            updatedAtMs: typeof val.updatedAtMs === 'number' ? val.updatedAtMs : Date.now(),
            contactEmail: typeof val.contactEmail === 'string' ? val.contactEmail : '',
            contactPhone: typeof val.contactPhone === 'string' ? val.contactPhone : '',
            residenceAddress:
              typeof val.residenceAddress === 'string' ? val.residenceAddress : '',
            companyContactName:
              typeof val.companyContactName === 'string' ? val.companyContactName : '',
          };
        }
      }
    }

    return {
      instructorName:
        typeof parsed.instructorName === 'string' &&
        parsed.instructorName.trim().length >= 2
          ? truncateClean(parsed.instructorName, SCHEMA_LIMITS.instructorName.maxLength)
          : 'Instructor Gestor SENA',
      fichas: parsed.fichas,
      enrollmentsByFicha:
        parsed.enrollmentsByFicha && typeof parsed.enrollmentsByFicha === 'object'
          ? parsed.enrollmentsByFicha
          : {},
      localEvaluations: Array.isArray(parsed.localEvaluations)
        ? parsed.localEvaluations
        : [],
      gfpiByDocCode: mergedGfpi,
      sheetLinksByFicha:
        parsed.sheetLinksByFicha && typeof parsed.sheetLinksByFicha === 'object'
          ? parsed.sheetLinksByFicha
          : {},
    };
  } catch {
    return buildDefaultLocalInstructorWorkspace();
  }
}

export function saveLocalInstructorWorkspace(
  workspace: LocalInstructorWorkspace
): void {
  try {
    localStorage.setItem(LOCAL_INSTRUCTOR_STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Ignore storage quota issues
  }
}

export function upsertLocalFichaSheetLink(
  workspace: LocalInstructorWorkspace,
  ficha: FichaRecord,
  input: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    spreadsheetTitle: string;
    templateSourceName: string;
    lastSyncedRows: number;
    lastDataSignature: string;
  }
): { workspace: LocalInstructorWorkspace; record: FichaSheetLinkRecord } {
  const now = Date.now();
  const existing = workspace.sheetLinksByFicha[ficha.id];
  const record: FichaSheetLinkRecord = {
    fichaId: ficha.id,
    fichaCode: ficha.fichaCode,
    instructorId: ficha.instructorId,
    spreadsheetId: sanitizeId(input.spreadsheetId),
    spreadsheetUrl: truncateClean(
      input.spreadsheetUrl,
      SCHEMA_LIMITS.sheetLink.spreadsheetUrl.maxLength
    ),
    spreadsheetTitle: truncateClean(
      input.spreadsheetTitle,
      SCHEMA_LIMITS.sheetLink.spreadsheetTitle.maxLength
    ),
    templateSourceName: truncateClean(
      input.templateSourceName,
      SCHEMA_LIMITS.sheetLink.templateSourceName.maxLength
    ),
    lastSyncedRows: Math.max(0, Math.min(5000, Math.round(input.lastSyncedRows))),
    lastDataSignature: sanitizeOptionalId(input.lastDataSignature),
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
  };

  return {
    record,
    workspace: {
      ...workspace,
      sheetLinksByFicha: {
        ...workspace.sheetLinksByFicha,
        [ficha.id]: record,
      },
    },
  };
}

export function updateLocalInstructorName(
  workspace: LocalInstructorWorkspace,
  rawName: string
): LocalInstructorWorkspace {
  const clean = truncateClean(rawName, SCHEMA_LIMITS.instructorName.maxLength);
  if (clean.length < SCHEMA_LIMITS.instructorName.minLength) {
    return workspace;
  }
  const now = Date.now();
  return {
    ...workspace,
    instructorName: clean,
    fichas: workspace.fichas.map((f) =>
      f.instructorId === 'local_instructor'
        ? { ...f, instructorName: clean, updatedAtMs: now }
        : f
    ),
  };
}

export function createLocalFicha(
  workspace: LocalInstructorWorkspace,
  input: {
    fichaCode: string;
    programName: string;
    centerName: string;
    jornada: JornadaType;
    instructorName: string;
  }
): { workspace: LocalInstructorWorkspace; createdId: string } {
  const check = validateFichaInput(input);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const now = Date.now();
  const cleanCode = sanitizeCode(input.fichaCode, SCHEMA_LIMITS.fichaCode.maxLength);
  const cleanInstructor = truncateClean(
    input.instructorName,
    SCHEMA_LIMITS.instructorName.maxLength
  );
  const createdId = sanitizeId(`ficha_${cleanCode}_${now.toString(36)}`);

  const newFicha: FichaRecord = {
    id: createdId,
    fichaCode: cleanCode,
    programName: truncateClean(input.programName, SCHEMA_LIMITS.programName.maxLength),
    centerName: truncateClean(input.centerName, SCHEMA_LIMITS.centerName.maxLength),
    jornada: input.jornada,
    instructorId: 'local_instructor',
    instructorName: cleanInstructor,
    status: 'activa',
    createdAtMs: now,
    updatedAtMs: now,
  };

  return {
    createdId,
    workspace: {
      ...workspace,
      instructorName: cleanInstructor,
      fichas: [newFicha, ...workspace.fichas],
      enrollmentsByFicha: {
        ...workspace.enrollmentsByFicha,
        [createdId]: [],
      },
    },
  };
}

export function closeLocalFicha(
  workspace: LocalInstructorWorkspace,
  fichaId: string
): LocalInstructorWorkspace {
  const now = Date.now();
  return {
    ...workspace,
    fichas: workspace.fichas.map((f) =>
      f.id === fichaId ? { ...f, status: 'cerrada', updatedAtMs: now } : f
    ),
  };
}

export function seedDemoCohortInLocalFicha(
  workspace: LocalInstructorWorkspace,
  ficha: FichaRecord
): LocalInstructorWorkspace {
  const existing = workspace.enrollmentsByFicha[ficha.id] ?? [];
  const existingIds = new Set(existing.map((e) => e.id));
  const seeded = buildSeededEnrollmentsForFicha(ficha, Date.now()).filter(
    (item) => !existingIds.has(item.id)
  );

  if (seeded.length === 0) {
    return workspace;
  }

  const merged = [...seeded, ...existing].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return {
    ...workspace,
    enrollmentsByFicha: {
      ...workspace.enrollmentsByFicha,
      [ficha.id]: merged,
    },
  };
}

export function updateLocalInstructorReview(
  workspace: LocalInstructorWorkspace,
  params: {
    fichaId: string;
    enrollmentId: string;
    appropriationState: AppropriationState;
    instructorObservation: string;
  }
): LocalInstructorWorkspace {
  const now = Date.now();
  const list = workspace.enrollmentsByFicha[params.fichaId] ?? [];
  const nextList = list.map((row) =>
    row.id === params.enrollmentId
      ? {
          ...row,
          appropriationState: params.appropriationState,
          instructorObservation: truncateClean(
            params.instructorObservation,
            SCHEMA_LIMITS.instructorObservation.maxLength
          ),
          updatedAtMs: now,
        }
      : row
  );

  return {
    ...workspace,
    enrollmentsByFicha: {
      ...workspace.enrollmentsByFicha,
      [params.fichaId]: nextList,
    },
  };
}

export function upsertLocalSelfEnrollment(
  workspace: LocalInstructorWorkspace,
  params: {
    ficha: FichaRecord;
    apprenticeName: string;
    documentCode: string;
    completedModules: InductionModuleId[];
    evalResult?: {
      score: number;
      dimIdentity: number;
      dimValues: number;
      dimRights: number;
      dimDuties: number;
      correctCount: number;
      durationSeconds: number;
    };
  }
): LocalInstructorWorkspace {
  const effectiveName = truncateClean(
    params.apprenticeName.trim().length >= 2
      ? params.apprenticeName
      : 'Aprendiz en Inducción',
    SCHEMA_LIMITS.apprenticeName.maxLength
  );
  const cleanDocCode = sanitizeCode(
    params.documentCode.trim().length >= 3 ? params.documentCode : 'APR-102400',
    SCHEMA_LIMITS.documentCode.maxLength
  );
  const cleanModules = sanitizeModulesList(params.completedModules);
  const now = Date.now();

  const existingList = workspace.enrollmentsByFicha[params.ficha.id] ?? [];
  const existingRecord = existingList.find(
    (e) => e.id === LOCAL_APPRENTICE_ENROLLMENT_ID
  );

  let updatedRecord: EnrollmentRecord;

  if (!existingRecord) {
    const score = params.evalResult ? clampScore(params.evalResult.score) : 0;
    const state: AppropriationState = params.evalResult
      ? score >= 70
        ? 'apropiado'
        : 'plan_mejoramiento'
      : 'en_proceso';

    updatedRecord = {
      id: LOCAL_APPRENTICE_ENROLLMENT_ID,
      fichaId: params.ficha.id,
      fichaCode: params.ficha.fichaCode,
      programName: params.ficha.programName,
      authorId: LOCAL_APPRENTICE_AUTHOR_ID,
      instructorId: params.ficha.instructorId,
      apprenticeName: effectiveName,
      documentCode: cleanDocCode,
      completedModules: cleanModules,
      evalScore: score,
      dimIdentity: params.evalResult ? clampScore(params.evalResult.dimIdentity) : 0,
      dimValues: params.evalResult ? clampScore(params.evalResult.dimValues) : 0,
      dimRights: params.evalResult ? clampScore(params.evalResult.dimRights) : 0,
      dimDuties: params.evalResult ? clampScore(params.evalResult.dimDuties) : 0,
      attemptsCount: params.evalResult ? 1 : 0,
      appropriationState: state,
      instructorObservation: '',
      createdAtMs: now,
      updatedAtMs: now,
    };
  } else if (existingRecord.appropriationState === 'certificado') {
    updatedRecord = {
      ...existingRecord,
      apprenticeName: effectiveName,
      documentCode: cleanDocCode,
      completedModules: cleanModules,
      updatedAtMs: now,
    };
  } else if (params.evalResult) {
    const score = clampScore(params.evalResult.score);
    const state: AppropriationState =
      score >= 70 ? 'apropiado' : 'plan_mejoramiento';
    updatedRecord = {
      ...existingRecord,
      apprenticeName: effectiveName,
      documentCode: cleanDocCode,
      completedModules: cleanModules,
      evalScore: score,
      dimIdentity: clampScore(params.evalResult.dimIdentity),
      dimValues: clampScore(params.evalResult.dimValues),
      dimRights: clampScore(params.evalResult.dimRights),
      dimDuties: clampScore(params.evalResult.dimDuties),
      attemptsCount: Math.min(50, existingRecord.attemptsCount + 1),
      appropriationState: state,
      updatedAtMs: now,
    };
  } else {
    updatedRecord = {
      ...existingRecord,
      apprenticeName: effectiveName,
      documentCode: cleanDocCode,
      completedModules: cleanModules,
      updatedAtMs: now,
    };
  }

  const nextList = [
    updatedRecord,
    ...existingList.filter((e) => e.id !== LOCAL_APPRENTICE_ENROLLMENT_ID),
  ];

  let nextEvaluations = workspace.localEvaluations;
  if (params.evalResult) {
    const score = clampScore(params.evalResult.score);
    const attempt: EvaluationAttemptRecord = {
      id: sanitizeId(`eval_local_${now.toString(36)}`),
      authorId: LOCAL_APPRENTICE_AUTHOR_ID,
      fichaId: params.ficha.id,
      instructorId: params.ficha.instructorId,
      fichaCode: params.ficha.fichaCode,
      apprenticeName: effectiveName,
      score,
      passed: score >= 70,
      dimIdentity: clampScore(params.evalResult.dimIdentity),
      dimValues: clampScore(params.evalResult.dimValues),
      dimRights: clampScore(params.evalResult.dimRights),
      dimDuties: clampScore(params.evalResult.dimDuties),
      correctCount: Math.max(0, Math.min(10, Math.round(params.evalResult.correctCount))),
      totalQuestions: 10,
      durationSeconds: Math.max(
        1,
        Math.min(7200, Math.round(params.evalResult.durationSeconds))
      ),
      createdAtMs: now,
    };
    nextEvaluations = [attempt, ...workspace.localEvaluations];
  }

  return {
    ...workspace,
    enrollmentsByFicha: {
      ...workspace.enrollmentsByFicha,
      [params.ficha.id]: nextList,
    },
    localEvaluations: nextEvaluations,
  };
}

export function upsertLocalGfpiSubmission(
  workspace: LocalInstructorWorkspace,
  input: GfpiF165Data
): { workspace: LocalInstructorWorkspace; record: GfpiF165Record } {
  const now = Date.now();
  const cleanDocCode = sanitizeCode(
    input.documentCode.trim().length >= 3 ? input.documentCode : 'APR-102400',
    SCHEMA_LIMITS.documentCode.maxLength
  );
  const cleanFichaCode = sanitizeCode(
    input.fichaCode.trim().length >= 4 ? input.fichaCode : '2874590',
    SCHEMA_LIMITS.fichaCode.maxLength
  );
  const cleanFilingCode =
    sanitizeCode(input.filingCode, SCHEMA_LIMITS.gfpi165.filingCode.maxLength) ||
    generateGfpiFilingCode(cleanDocCode, cleanFichaCode);

  const existing = workspace.gfpiByDocCode[cleanDocCode];
  const record: GfpiF165Record = {
    userId: LOCAL_APPRENTICE_AUTHOR_ID,
    fichaId: input.fichaId,
    instructorId: 'local_instructor',
    procedureType: input.procedureType,
    filingCode: cleanFilingCode,
    apprenticeName: truncateClean(
      input.apprenticeName.trim() || 'Aprendiz en Inducción',
      SCHEMA_LIMITS.apprenticeName.maxLength
    ),
    documentType: input.documentType,
    documentCode: cleanDocCode,
    contactEmail: truncateClean(
      input.contactEmail,
      SCHEMA_LIMITS.gfpi165.contactEmail.maxLength
    ),
    contactPhone: sanitizePhone(input.contactPhone),
    residenceAddress: truncateClean(
      input.residenceAddress,
      SCHEMA_LIMITS.gfpi165.residenceAddress.maxLength
    ),
    fichaCode: cleanFichaCode,
    programName: truncateClean(
      input.programName,
      SCHEMA_LIMITS.programName.maxLength
    ),
    trainingLevel: input.trainingLevel,
    regionalCenter: truncateClean(
      input.regionalCenter,
      SCHEMA_LIMITS.profile.regionalCenter.maxLength
    ),
    jornada: input.jornada,
    lectivaStartDate: input.lectivaStartDate,
    lectivaEndDate: input.lectivaEndDate,
    productivaStartDate: input.productivaStartDate,
    productivaEndDate: input.productivaEndDate,
    selectedAlternative: input.selectedAlternative,
    alternativeJustification: truncateClean(
      input.alternativeJustification,
      SCHEMA_LIMITS.gfpi165.alternativeJustification.maxLength
    ),
    companyName: truncateClean(
      input.companyName,
      SCHEMA_LIMITS.gfpi165.companyName.maxLength
    ),
    companyNit: sanitizeOptionalCode(
      input.companyNit,
      SCHEMA_LIMITS.gfpi165.companyNit.maxLength
    ),
    companyCity: truncateClean(
      input.companyCity,
      SCHEMA_LIMITS.gfpi165.companyCity.maxLength
    ),
    companyContactName: truncateClean(
      input.companyContactName,
      SCHEMA_LIMITS.gfpi165.companyContactName.maxLength
    ),
    companySector: input.companySector,
    apprenticeSignatureAccepted: Boolean(input.apprenticeSignatureAccepted),
    status: input.status === 'radicado' ? 'radicado' : 'borrador',
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
  };

  return {
    record,
    workspace: {
      ...workspace,
      gfpiByDocCode: {
        ...workspace.gfpiByDocCode,
        [cleanDocCode]: record,
      },
    },
  };
}
