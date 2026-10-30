/**
 * Security Rules Specification Test Suite — Dirty Dozen Verification
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * return PERMISSION_DENIED against firestore.rules.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  blockingGate: string;
}

export const DIRTY_DOZEN_CASES: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Ficha Create',
    collectionPath: '/fichas/ficha_2874590',
    operation: 'create',
    auth: { uid: 'inst_1', email: 'inst@sena.edu.co', email_verified: true },
    payload: {
      fichaCode: '2874590',
      programName: 'Analisis y Desarrollo de Software',
      centerName: 'Centro de Servicios',
      jornada: 'Diurna',
      instructorId: 'inst_1',
      instructorName: 'Carlos Perez',
      status: 'activa',
      isVerified: true, // Ghost field
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'isValidFicha -> data.keys().hasOnly(...)',
  },
  {
    id: 2,
    name: 'Email Spoofing on Bootstrap Admin',
    collectionPath: '/admins/spoof_uid',
    operation: 'create',
    auth: { uid: 'spoof_uid', email: 'enithmenco@gmail.com', email_verified: false },
    payload: { grantedBy: 'spoof_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'isVerifiedUser -> request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'PII Blanket Scrape on users_private',
    collectionPath: '/users_private/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'other@sena.edu.co', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'request.auth.uid == userId || isAdmin()',
  },
  {
    id: 4,
    name: 'Identity Spoofing on Enrollment Create',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_01',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'att@sena.edu.co', email_verified: true },
    payload: { authorId: 'victim_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'incoming().authorId == request.auth.uid',
  },
  {
    id: 5,
    name: 'Instructor Hijack on Enrollment Create',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_02',
    operation: 'create',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    payload: { authorId: 'apr_1', instructorId: 'fake_instructor' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'Master Gate -> incoming().instructorId == getParentFicha(fichaId).instructorId',
  },
  {
    id: 6,
    name: 'Orphaned Evaluation Write',
    collectionPath: '/evaluations/eval_orphan',
    operation: 'create',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    payload: { authorId: 'apr_1', fichaId: 'non_existent_ficha' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'exists(/databases/$(database)/documents/fichas/$(incoming().fichaId))',
  },
  {
    id: 7,
    name: 'Self-Certification State Shortcut by Apprentice',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_apr_1',
    operation: 'update',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    payload: { appropriationState: 'certificado' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: "Tier 2 Apprentice Update -> incoming().appropriationState in ['en_proceso', 'apropiado', 'plan_mejoramiento']",
  },
  {
    id: 8,
    name: 'Terminal State Mutation on Certified Enrollment',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_certified',
    operation: 'update',
    auth: { uid: 'inst_1', email: 'inst@sena.edu.co', email_verified: true },
    payload: { appropriationState: 'en_proceso' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: "Terminal State Lock -> existing().appropriationState != 'certificado'",
  },
  {
    id: 9,
    name: 'Resource Poisoning via Oversized Observation String',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_apr_1',
    operation: 'update',
    auth: { uid: 'inst_1', email: 'inst@sena.edu.co', email_verified: true },
    payload: { instructorObservation: 'X'.repeat(5000) },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'isValidEnrollment -> data.instructorObservation.size() <= 500',
  },
  {
    id: 10,
    name: 'Array Poisoning on completedModules',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_apr_1',
    operation: 'update',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    payload: { completedModules: ['identidad', 'unknown_module'] },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: "data.completedModules.hasOnly(['identidad', 'valores', 'derechos', 'deberes'])",
  },
  {
    id: 11,
    name: 'Forged Timestamp / Immortal Field Mutation',
    collectionPath: '/fichas/ficha_2874590',
    operation: 'update',
    auth: { uid: 'inst_1', email: 'inst@sena.edu.co', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'incoming().createdAt == existing().createdAt && incoming().updatedAt == request.time',
  },
  {
    id: 12,
    name: 'Unauthorized List Scraping on Evaluations',
    collectionPath: '/evaluations',
    operation: 'list',
    auth: { uid: 'scraper_uid', email: 'scraper@sena.edu.co', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'resource.data.authorId == request.auth.uid || resource.data.instructorId == request.auth.uid',
  },
  {
    id: 13,
    name: 'Cross-User Apprentice Profile Read',
    collectionPath: '/apprentice_profiles/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'other@sena.edu.co', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'request.auth.uid == userId || isAdmin()',
  },
  {
    id: 14,
    name: 'Shadow Field & Enum Poisoning on Apprentice Profile Update',
    collectionPath: '/apprentice_profiles/apr_1',
    operation: 'update',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    payload: { bloodType: 'INVALID_RH', role: 'admin' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'isValidApprenticeProfile -> data.keys().hasOnly(...) && data.bloodType in [...]',
  },
  {
    id: 15,
    name: 'Unsigned Radicación & Status Escalation on GFPI-F-165',
    collectionPath: '/gfpi_f_165_submissions/apr_1',
    operation: 'create',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    payload: {
      userId: 'apr_1',
      status: 'radicado',
      apprenticeSignatureAccepted: false,
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: "incoming().status != 'radicado' || incoming().apprenticeSignatureAccepted == true",
  },
  {
    id: 16,
    name: 'Unauthorized Cross-User Read on GFPI-F-165 Submission',
    collectionPath: '/gfpi_f_165_submissions/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'other@sena.edu.co', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'request.auth.uid == userId || parentFichaInstructor || isAdmin()',
  },
  {
    id: 17,
    name: 'Apprentice Attempting to Read Instructor Google Sheet Link',
    collectionPath: '/ficha_sheet_links/ficha_2874590',
    operation: 'get',
    auth: { uid: 'apr_1', email: 'apr@sena.edu.co', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'Master Gate -> get(/fichas/$(fichaId)).data.instructorId == request.auth.uid || isAdmin()',
  },
  {
    id: 18,
    name: 'Shadow Field & Non-Owner Write on FichaSheetLink',
    collectionPath: '/ficha_sheet_links/ficha_2874590',
    operation: 'create',
    auth: { uid: 'attacker_inst', email: 'att@sena.edu.co', email_verified: true },
    payload: {
      fichaId: 'ficha_2874590',
      instructorId: 'attacker_inst',
      spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
      accessToken: 'leaked_token', // Forbidden shadow field
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'isValidFichaSheetLink -> data.keys().hasOnly(...) && parentFicha.instructorId == request.auth.uid',
  },
  {
    id: 19,
    name: 'Apprentice Attempting Privilege Escalation by Creating a Ficha',
    collectionPath: '/fichas/ficha_9999999',
    operation: 'create',
    auth: { uid: 'apr_1', email: 'apr@soy.sena.edu.co', email_verified: true },
    payload: {
      fichaCode: '9999999',
      programName: 'Analisis y Desarrollo de Software',
      centerName: 'Centro de Servicios',
      jornada: 'Diurna',
      instructorId: 'apr_1',
      instructorName: 'Aprendiz No Autorizado',
      status: 'activa',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: 'Ficha Create RBAC Gate -> isAdmin()',
  },
  {
    id: 20,
    name: 'Apprentice Attempting to Forge Instructor Observation or Non-Canonical Enrollment ID',
    collectionPath: '/fichas/ficha_2874590/enrollments/enr_apr_1',
    operation: 'create',
    auth: { uid: 'apr_1', email: 'apr@soy.sena.edu.co', email_verified: true },
    payload: {
      authorId: 'apr_1',
      instructorObservation: 'Certificado aprobado por instructor',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingGate: "Apprentice Enrollment Create Gate -> enrollmentId == 'enr_' + request.auth.uid && incoming().instructorObservation == ''",
  },
];


