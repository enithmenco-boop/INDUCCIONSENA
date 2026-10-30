import blueprint from '../../firebase-blueprint.json';

/**
 * Validation Synchronicity Layer
 * Parses volumetric boundaries (minLength, maxLength) and structural regex patterns
 * directly from firebase-blueprint.json so client mutations strictly match firestore.rules.
 */

const fichaProps = blueprint.entities.Ficha.properties;
const enrollmentProps = blueprint.entities.Enrollment.properties;
const userPrivateProps = blueprint.entities.UserPrivate.properties;
const profileProps = blueprint.entities.ApprenticeProfile.properties;
const gfpi165Props = blueprint.entities.GfpiF165Submission.properties;
const sheetLinkProps = blueprint.entities.FichaSheetLink.properties;

export type TrainingLevelType =
  | 'Tecnólogo'
  | 'Técnico'
  | 'Operario'
  | 'Auxiliar'
  | 'Especialización Tecnológica';

export type ModalityType = 'Presencial' | 'Virtual' | 'A Distancia';

export type BloodType = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';

export type ProductiveAltType =
  | 'Contrato de Aprendizaje Laboral Especial (Dec. 0223/2026)'
  | 'Vínculo Formativo o Laboral'
  | 'Proyecto Productivo / Fondo Emprender'
  | 'Prácticas Economía Popular / CampeSENA'
  | 'Monitoría SENA'
  | 'Pasantía Institucional';

export type RepresentationRoleType =
  | 'Aprendiz en Formación'
  | 'Vocero Principal de Ficha'
  | 'Vocero Suplente de Ficha'
  | 'Vocero de Enfoque Diferencial'
  | 'Representante de Centro';

export type DifferentialFocusType =
  | 'Ninguno / General'
  | 'Jóvenes en Acción / Renta Joven'
  | 'Comunidad Campesina (CampeSENA)'
  | 'Pueblos Étnicos (Indígena / NARP / Rrom)'
  | 'Persona con Discapacidad (Ajustes Razonables)'
  | 'Mujer Cabeza de Familia / Enfoque de Género'
  | 'Víctima del Conflicto Armado';

export type GfpiProcedureType =
  | 'Selección Inicial (Inducción)'
  | 'Modificación de Alternativa';

export type GfpiDocumentType = 'CC' | 'TI' | 'CE' | 'PPT' | 'PEP';

export type GfpiCompanySectorType =
  | 'Por definir en Etapa Lectiva'
  | 'Tecnología y Software'
  | 'Industria y Manufactura'
  | 'Comercio y Servicios'
  | 'Economía Popular / Agropecuario'
  | 'Entidad Pública / SENA';

export type GfpiStatusType = 'borrador' | 'radicado' | 'validado_coordinacion';

export const SCHEMA_LIMITS = {
  id: {
    minLength: userPrivateProps.userId.minLength,
    maxLength: userPrivateProps.userId.maxLength,
    pattern: new RegExp(userPrivateProps.userId.pattern),
  },
  email: {
    minLength: userPrivateProps.email.minLength,
    maxLength: userPrivateProps.email.maxLength,
  },
  fichaCode: {
    minLength: fichaProps.fichaCode.minLength,
    maxLength: fichaProps.fichaCode.maxLength,
    pattern: new RegExp(fichaProps.fichaCode.pattern),
  },
  programName: {
    minLength: fichaProps.programName.minLength,
    maxLength: fichaProps.programName.maxLength,
  },
  centerName: {
    minLength: fichaProps.centerName.minLength,
    maxLength: fichaProps.centerName.maxLength,
  },
  instructorName: {
    minLength: fichaProps.instructorName.minLength,
    maxLength: fichaProps.instructorName.maxLength,
  },
  jornada: {
    allowed: fichaProps.jornada.enum as readonly ('Diurna' | 'Mixta' | 'Nocturna' | 'Virtual')[],
    maxLength: fichaProps.jornada.maxLength,
  },
  apprenticeName: {
    minLength: enrollmentProps.apprenticeName.minLength,
    maxLength: enrollmentProps.apprenticeName.maxLength,
  },
  documentCode: {
    minLength: enrollmentProps.documentCode.minLength,
    maxLength: enrollmentProps.documentCode.maxLength,
    pattern: new RegExp(enrollmentProps.documentCode.pattern),
  },
  instructorObservation: {
    minLength: enrollmentProps.instructorObservation.minLength,
    maxLength: enrollmentProps.instructorObservation.maxLength,
  },
  profile: {
    trainingLevel: {
      allowed: profileProps.trainingLevel.enum as readonly TrainingLevelType[],
      maxLength: profileProps.trainingLevel.maxLength,
    },
    modality: {
      allowed: profileProps.modality.enum as readonly ModalityType[],
      maxLength: profileProps.modality.maxLength,
    },
    regionalCenter: {
      minLength: profileProps.regionalCenter.minLength,
      maxLength: profileProps.regionalCenter.maxLength,
    },
    bloodType: {
      allowed: profileProps.bloodType.enum as readonly BloodType[],
      maxLength: profileProps.bloodType.maxLength,
    },
    preferredProductiveAlt: {
      allowed: profileProps.preferredProductiveAlt.enum as readonly ProductiveAltType[],
      maxLength: profileProps.preferredProductiveAlt.maxLength,
    },
    representationRole: {
      allowed: profileProps.representationRole.enum as readonly RepresentationRoleType[],
      maxLength: profileProps.representationRole.maxLength,
    },
    differentialFocus: {
      allowed: profileProps.differentialFocus.enum as readonly DifferentialFocusType[],
      maxLength: profileProps.differentialFocus.maxLength,
    },
    bioGoal: {
      minLength: profileProps.bioGoal.minLength,
      maxLength: profileProps.bioGoal.maxLength,
    },
    selectedFichaId: {
      maxLength: profileProps.selectedFichaId.maxLength,
      pattern: new RegExp(profileProps.selectedFichaId.pattern),
    },
  },
  gfpi165: {
    procedureType: {
      allowed: gfpi165Props.procedureType.enum as readonly GfpiProcedureType[],
      maxLength: gfpi165Props.procedureType.maxLength,
    },
    filingCode: {
      minLength: gfpi165Props.filingCode.minLength,
      maxLength: gfpi165Props.filingCode.maxLength,
      pattern: new RegExp(gfpi165Props.filingCode.pattern),
    },
    documentType: {
      allowed: gfpi165Props.documentType.enum as readonly GfpiDocumentType[],
      maxLength: gfpi165Props.documentType.maxLength,
    },
    contactEmail: {
      maxLength: gfpi165Props.contactEmail.maxLength,
    },
    contactPhone: {
      maxLength: gfpi165Props.contactPhone.maxLength,
      pattern: new RegExp(gfpi165Props.contactPhone.pattern),
    },
    residenceAddress: {
      maxLength: gfpi165Props.residenceAddress.maxLength,
    },
    isoDate: {
      length: gfpi165Props.lectivaStartDate.maxLength,
      pattern: new RegExp(gfpi165Props.lectivaStartDate.pattern),
    },
    selectedAlternative: {
      allowed: gfpi165Props.selectedAlternative.enum as readonly ProductiveAltType[],
      maxLength: gfpi165Props.selectedAlternative.maxLength,
    },
    alternativeJustification: {
      minLength: gfpi165Props.alternativeJustification.minLength,
      maxLength: gfpi165Props.alternativeJustification.maxLength,
    },
    companyName: {
      maxLength: gfpi165Props.companyName.maxLength,
    },
    companyNit: {
      maxLength: gfpi165Props.companyNit.maxLength,
      pattern: new RegExp(gfpi165Props.companyNit.pattern),
    },
    companyCity: {
      maxLength: gfpi165Props.companyCity.maxLength,
    },
    companyContactName: {
      maxLength: gfpi165Props.companyContactName.maxLength,
    },
    companySector: {
      allowed: gfpi165Props.companySector.enum as readonly GfpiCompanySectorType[],
      maxLength: gfpi165Props.companySector.maxLength,
    },
    status: {
      allowed: gfpi165Props.status.enum as readonly GfpiStatusType[],
      maxLength: gfpi165Props.status.maxLength,
    },
  },
  sheetLink: {
    spreadsheetId: {
      minLength: sheetLinkProps.spreadsheetId.minLength,
      maxLength: sheetLinkProps.spreadsheetId.maxLength,
      pattern: new RegExp(sheetLinkProps.spreadsheetId.pattern),
    },
    spreadsheetUrl: {
      minLength: sheetLinkProps.spreadsheetUrl.minLength,
      maxLength: sheetLinkProps.spreadsheetUrl.maxLength,
    },
    spreadsheetTitle: {
      minLength: sheetLinkProps.spreadsheetTitle.minLength,
      maxLength: sheetLinkProps.spreadsheetTitle.maxLength,
    },
    templateSourceName: {
      maxLength: sheetLinkProps.templateSourceName.maxLength,
    },
    lastDataSignature: {
      maxLength: sheetLinkProps.lastDataSignature.maxLength,
      pattern: new RegExp(sheetLinkProps.lastDataSignature.pattern),
    },
  },
  allowedModules: ['identidad', 'valores', 'derechos', 'deberes'] as const,
};

export type InductionModuleId = (typeof SCHEMA_LIMITS.allowedModules)[number];
export type JornadaType = 'Diurna' | 'Mixta' | 'Nocturna' | 'Virtual';
export type AppropriationState = 'en_proceso' | 'apropiado' | 'plan_mejoramiento' | 'certificado';

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, SCHEMA_LIMITS.id.maxLength);
  return cleaned || 'id_default';
}

export function sanitizeOptionalId(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, SCHEMA_LIMITS.profile.selectedFichaId.maxLength);
}

export function sanitizeCode(raw: string, maxLen: number): string {
  return raw.trim().replace(/[^0-9A-Za-z-]/g, '').slice(0, maxLen);
}

export function sanitizeOptionalCode(raw: string, maxLen: number): string {
  return raw.trim().replace(/[^0-9A-Za-z-]/g, '').slice(0, maxLen);
}

export function sanitizePhone(raw: string): string {
  return raw
    .trim()
    .replace(/[^0-9+()\-\s]/g, '')
    .slice(0, SCHEMA_LIMITS.gfpi165.contactPhone.maxLength);
}

export function truncateClean(raw: string, maxLen: number): string {
  return raw.trim().slice(0, maxLen);
}

export function extractSpreadsheetIdFromInput(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1].slice(0, SCHEMA_LIMITS.sheetLink.spreadsheetId.maxLength);
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, SCHEMA_LIMITS.sheetLink.spreadsheetId.maxLength);
}

export function validateSheetLinkInput(input: {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
}): { valid: boolean; error?: string } {
  const id = input.spreadsheetId.trim();
  if (
    id.length < SCHEMA_LIMITS.sheetLink.spreadsheetId.minLength ||
    id.length > SCHEMA_LIMITS.sheetLink.spreadsheetId.maxLength ||
    !SCHEMA_LIMITS.sheetLink.spreadsheetId.pattern.test(id)
  ) {
    return {
      valid: false,
      error: 'Ingresa un ID o URL válido de hoja de cálculo de Google Sheets.',
    };
  }
  if (
    input.spreadsheetUrl.trim().length < SCHEMA_LIMITS.sheetLink.spreadsheetUrl.minLength ||
    input.spreadsheetUrl.trim().length > SCHEMA_LIMITS.sheetLink.spreadsheetUrl.maxLength
  ) {
    return {
      valid: false,
      error: 'La URL de Google Sheets es inválida.',
    };
  }
  if (
    input.spreadsheetTitle.trim().length < SCHEMA_LIMITS.sheetLink.spreadsheetTitle.minLength ||
    input.spreadsheetTitle.trim().length > SCHEMA_LIMITS.sheetLink.spreadsheetTitle.maxLength
  ) {
    return {
      valid: false,
      error: 'El título del libro de Google Sheets debe tener entre 3 y 160 caracteres.',
    };
  }
  return { valid: true };
}

export function validateFichaInput(input: {
  fichaCode: string;
  programName: string;
  centerName: string;
  jornada: string;
  instructorName: string;
}): { valid: boolean; error?: string } {
  const code = input.fichaCode.trim();
  if (
    code.length < SCHEMA_LIMITS.fichaCode.minLength ||
    code.length > SCHEMA_LIMITS.fichaCode.maxLength ||
    !SCHEMA_LIMITS.fichaCode.pattern.test(code)
  ) {
    return {
      valid: false,
      error: `El número de ficha debe tener entre ${SCHEMA_LIMITS.fichaCode.minLength} y ${SCHEMA_LIMITS.fichaCode.maxLength} caracteres alfanuméricos o guiones.`,
    };
  }
  if (
    input.programName.trim().length < SCHEMA_LIMITS.programName.minLength ||
    input.programName.trim().length > SCHEMA_LIMITS.programName.maxLength
  ) {
    return {
      valid: false,
      error: `El nombre del programa debe tener entre ${SCHEMA_LIMITS.programName.minLength} y ${SCHEMA_LIMITS.programName.maxLength} caracteres.`,
    };
  }
  if (
    input.centerName.trim().length < SCHEMA_LIMITS.centerName.minLength ||
    input.centerName.trim().length > SCHEMA_LIMITS.centerName.maxLength
  ) {
    return {
      valid: false,
      error: `El Centro de Formación debe tener entre ${SCHEMA_LIMITS.centerName.minLength} y ${SCHEMA_LIMITS.centerName.maxLength} caracteres.`,
    };
  }
  if (!SCHEMA_LIMITS.jornada.allowed.includes(input.jornada as JornadaType)) {
    return { valid: false, error: 'Selecciona una jornada válida.' };
  }
  if (
    input.instructorName.trim().length < SCHEMA_LIMITS.instructorName.minLength ||
    input.instructorName.trim().length > SCHEMA_LIMITS.instructorName.maxLength
  ) {
    return { valid: false, error: 'El nombre del instructor es inválido.' };
  }
  return { valid: true };
}

export function validateEnrollmentRegistration(input: {
  apprenticeName: string;
  documentCode: string;
}): { valid: boolean; error?: string } {
  const name = input.apprenticeName.trim();
  const code = input.documentCode.trim();
  if (
    name.length < SCHEMA_LIMITS.apprenticeName.minLength ||
    name.length > SCHEMA_LIMITS.apprenticeName.maxLength
  ) {
    return {
      valid: false,
      error: `El nombre del aprendiz debe tener entre ${SCHEMA_LIMITS.apprenticeName.minLength} y ${SCHEMA_LIMITS.apprenticeName.maxLength} caracteres.`,
    };
  }
  if (
    code.length < SCHEMA_LIMITS.documentCode.minLength ||
    code.length > SCHEMA_LIMITS.documentCode.maxLength ||
    !SCHEMA_LIMITS.documentCode.pattern.test(code)
  ) {
    return {
      valid: false,
      error: `El código de carné/registro debe tener entre ${SCHEMA_LIMITS.documentCode.minLength} y ${SCHEMA_LIMITS.documentCode.maxLength} caracteres (letras, números o guion).`,
    };
  }
  return { valid: true };
}

export function validateApprenticeProfileInput(input: {
  apprenticeName: string;
  documentCode: string;
  trainingLevel: string;
  modality: string;
  regionalCenter: string;
  bloodType: string;
  preferredProductiveAlt: string;
  representationRole: string;
  differentialFocus: string;
  bioGoal: string;
}): { valid: boolean; error?: string } {
  const baseCheck = validateEnrollmentRegistration({
    apprenticeName: input.apprenticeName,
    documentCode: input.documentCode,
  });
  if (!baseCheck.valid) {
    return baseCheck;
  }

  const center = input.regionalCenter.trim();
  if (
    center.length < SCHEMA_LIMITS.profile.regionalCenter.minLength ||
    center.length > SCHEMA_LIMITS.profile.regionalCenter.maxLength
  ) {
    return {
      valid: false,
      error: `El Centro de Formación y Regional debe tener entre ${SCHEMA_LIMITS.profile.regionalCenter.minLength} y ${SCHEMA_LIMITS.profile.regionalCenter.maxLength} caracteres.`,
    };
  }

  if (!SCHEMA_LIMITS.profile.trainingLevel.allowed.includes(input.trainingLevel as TrainingLevelType)) {
    return { valid: false, error: 'Selecciona un nivel de formación válido.' };
  }
  if (!SCHEMA_LIMITS.profile.modality.allowed.includes(input.modality as ModalityType)) {
    return { valid: false, error: 'Selecciona una modalidad válida.' };
  }
  if (!SCHEMA_LIMITS.profile.bloodType.allowed.includes(input.bloodType as BloodType)) {
    return { valid: false, error: 'Selecciona un grupo sanguíneo y RH válido.' };
  }
  if (
    !SCHEMA_LIMITS.profile.preferredProductiveAlt.allowed.includes(
      input.preferredProductiveAlt as ProductiveAltType
    )
  ) {
    return { valid: false, error: 'Selecciona una alternativa de Etapa Productiva válida.' };
  }
  if (
    !SCHEMA_LIMITS.profile.representationRole.allowed.includes(
      input.representationRole as RepresentationRoleType
    )
  ) {
    return { valid: false, error: 'Selecciona un rol de representatividad válido.' };
  }
  if (
    !SCHEMA_LIMITS.profile.differentialFocus.allowed.includes(
      input.differentialFocus as DifferentialFocusType
    )
  ) {
    return { valid: false, error: 'Selecciona una opción de caracterización válida.' };
  }
  if (input.bioGoal.trim().length > SCHEMA_LIMITS.profile.bioGoal.maxLength) {
    return {
      valid: false,
      error: `El proyecto formativo no debe superar ${SCHEMA_LIMITS.profile.bioGoal.maxLength} caracteres.`,
    };
  }

  return { valid: true };
}

export function validateGfpiF165Input(input: {
  procedureType: string;
  apprenticeName: string;
  documentType: string;
  documentCode: string;
  contactEmail?: string;
  contactPhone?: string;
  residenceAddress?: string;
  fichaCode: string;
  programName: string;
  trainingLevel: string;
  regionalCenter: string;
  jornada: string;
  lectivaStartDate: string;
  lectivaEndDate: string;
  productivaStartDate: string;
  productivaEndDate: string;
  selectedAlternative: string;
  alternativeJustification: string;
  companyName: string;
  companyNit: string;
  companyCity: string;
  companyContactName?: string;
  companySector: string;
  apprenticeSignatureAccepted: boolean;
  status: string;
}): { valid: boolean; error?: string } {
  const baseCheck = validateEnrollmentRegistration({
    apprenticeName: input.apprenticeName,
    documentCode: input.documentCode,
  });
  if (!baseCheck.valid) {
    return baseCheck;
  }

  if (
    !SCHEMA_LIMITS.gfpi165.procedureType.allowed.includes(
      input.procedureType as GfpiProcedureType
    )
  ) {
    return { valid: false, error: 'Selecciona un tipo de trámite válido en el formato.' };
  }

  if (
    !SCHEMA_LIMITS.gfpi165.documentType.allowed.includes(
      input.documentType as GfpiDocumentType
    )
  ) {
    return { valid: false, error: 'Selecciona un tipo de documento válido.' };
  }

  const email = (input.contactEmail ?? '').trim();
  if (email.length > SCHEMA_LIMITS.gfpi165.contactEmail.maxLength) {
    return { valid: false, error: 'El correo electrónico excede el límite permitido.' };
  }
  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Ingresa un correo electrónico de contacto válido.' };
  }

  const phone = (input.contactPhone ?? '').trim();
  if (
    phone.length > SCHEMA_LIMITS.gfpi165.contactPhone.maxLength ||
    !SCHEMA_LIMITS.gfpi165.contactPhone.pattern.test(phone)
  ) {
    return {
      valid: false,
      error: 'El teléfono de contacto solo admite números, espacios, paréntesis, + o guiones.',
    };
  }

  if ((input.residenceAddress ?? '').trim().length > SCHEMA_LIMITS.gfpi165.residenceAddress.maxLength) {
    return { valid: false, error: 'La dirección de residencia excede el límite permitido.' };
  }

  const fCode = input.fichaCode.trim();
  if (
    fCode.length < SCHEMA_LIMITS.fichaCode.minLength ||
    fCode.length > SCHEMA_LIMITS.fichaCode.maxLength ||
    !SCHEMA_LIMITS.fichaCode.pattern.test(fCode)
  ) {
    return {
      valid: false,
      error: `El número de Ficha debe tener entre ${SCHEMA_LIMITS.fichaCode.minLength} y ${SCHEMA_LIMITS.fichaCode.maxLength} caracteres alfanuméricos o guiones.`,
    };
  }

  if (
    input.programName.trim().length < SCHEMA_LIMITS.programName.minLength ||
    input.programName.trim().length > SCHEMA_LIMITS.programName.maxLength
  ) {
    return {
      valid: false,
      error: `El programa de formación debe tener entre ${SCHEMA_LIMITS.programName.minLength} y ${SCHEMA_LIMITS.programName.maxLength} caracteres.`,
    };
  }

  if (
    !SCHEMA_LIMITS.profile.trainingLevel.allowed.includes(
      input.trainingLevel as TrainingLevelType
    )
  ) {
    return { valid: false, error: 'Selecciona un nivel de formación válido.' };
  }

  if (
    input.regionalCenter.trim().length < SCHEMA_LIMITS.profile.regionalCenter.minLength ||
    input.regionalCenter.trim().length > SCHEMA_LIMITS.profile.regionalCenter.maxLength
  ) {
    return {
      valid: false,
      error: `La Regional y Centro de Formación debe tener entre ${SCHEMA_LIMITS.profile.regionalCenter.minLength} y ${SCHEMA_LIMITS.profile.regionalCenter.maxLength} caracteres.`,
    };
  }

  if (!SCHEMA_LIMITS.jornada.allowed.includes(input.jornada as JornadaType)) {
    return { valid: false, error: 'Selecciona una jornada académica válida.' };
  }

  const dates = [
    { label: 'Inicio Etapa Lectiva', val: input.lectivaStartDate },
    { label: 'Fin Etapa Lectiva', val: input.lectivaEndDate },
    { label: 'Inicio Etapa Productiva', val: input.productivaStartDate },
    { label: 'Fin Etapa Productiva', val: input.productivaEndDate },
  ];
  for (const d of dates) {
    if (!SCHEMA_LIMITS.gfpi165.isoDate.pattern.test(d.val)) {
      return { valid: false, error: `Ingresa una fecha válida (AAAA-MM-DD) para ${d.label}.` };
    }
  }
  if (input.lectivaEndDate < input.lectivaStartDate) {
    return {
      valid: false,
      error: 'La fecha de finalización de Etapa Lectiva no puede ser anterior a su fecha de inicio.',
    };
  }
  if (input.productivaEndDate < input.productivaStartDate) {
    return {
      valid: false,
      error: 'La fecha de finalización de Etapa Productiva no puede ser anterior a su fecha de inicio.',
    };
  }

  if (
    !SCHEMA_LIMITS.gfpi165.selectedAlternative.allowed.includes(
      input.selectedAlternative as ProductiveAltType
    )
  ) {
    return {
      valid: false,
      error: 'Selecciona una de las alternativas reglamentarias de Etapa Productiva.',
    };
  }

  if (
    input.alternativeJustification.trim().length >
    SCHEMA_LIMITS.gfpi165.alternativeJustification.maxLength
  ) {
    return {
      valid: false,
      error: `La sustentación de la alternativa no debe exceder ${SCHEMA_LIMITS.gfpi165.alternativeJustification.maxLength} caracteres.`,
    };
  }

  if (input.companyName.trim().length > SCHEMA_LIMITS.gfpi165.companyName.maxLength) {
    return { valid: false, error: 'El nombre de la entidad o proyecto excede el límite permitido.' };
  }

  const nit = input.companyNit.trim();
  if (
    nit.length > SCHEMA_LIMITS.gfpi165.companyNit.maxLength ||
    !SCHEMA_LIMITS.gfpi165.companyNit.pattern.test(nit)
  ) {
    return {
      valid: false,
      error: 'El NIT o referencia empresarial solo admite letras, números y guiones.',
    };
  }

  if (input.companyCity.trim().length > SCHEMA_LIMITS.gfpi165.companyCity.maxLength) {
    return { valid: false, error: 'El municipio o ciudad excede el límite permitido.' };
  }

  if (
    (input.companyContactName ?? '').trim().length >
    SCHEMA_LIMITS.gfpi165.companyContactName.maxLength
  ) {
    return { valid: false, error: 'El nombre del contacto empresarial excede el límite permitido.' };
  }

  if (
    !SCHEMA_LIMITS.gfpi165.companySector.allowed.includes(
      input.companySector as GfpiCompanySectorType
    )
  ) {
    return { valid: false, error: 'Selecciona un sector económico válido.' };
  }

  if (!SCHEMA_LIMITS.gfpi165.status.allowed.includes(input.status as GfpiStatusType)) {
    return { valid: false, error: 'Estado de formulario inválido.' };
  }

  if (input.status === 'radicado' && !input.apprenticeSignatureAccepted) {
    return {
      valid: false,
      error: 'Debes marcar la declaración y firma digital del aprendiz para radicar el formato GFPI-F-165.',
    };
  }

  return { valid: true };
}

export function clampScore(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function sanitizeModulesList(modules: string[]): InductionModuleId[] {
  const unique = Array.from(new Set(modules));
  return unique
    .filter((m): m is InductionModuleId =>
      (SCHEMA_LIMITS.allowedModules as readonly string[]).includes(m)
    )
    .slice(0, 4);
}
