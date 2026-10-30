import type {
  EnrollmentRecord,
  EvaluationAttemptRecord,
  FichaRecord,
  GfpiF165Record,
} from './inductionStore';

export const SHEET_TABS = {
  CONSOLIDADO: 'Consolidado_Induccion',
  GFPI_RESPUESTAS: 'Respuestas_GFPI_F_165',
  GFPI_INDIVIDUAL: 'Formato_GFPI_F_165_Individual',
  EVALUACIONES: 'Historial_Evaluaciones',
} as const;

export class WorkspaceAuthError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'WorkspaceAuthError';
    this.status = status;
  }
}

export interface LocalXlsxInspectionResult {
  fileName: string;
  sheetNames: string[];
  detectedHeaders: string[];
  matchesGfpi165: boolean;
}

export interface CohortSyncInput {
  ficha: FichaRecord;
  enrollments: EnrollmentRecord[];
  gfpiSubmissions: GfpiF165Record[];
  evaluations: EvaluationAttemptRecord[];
}

export interface CohortSyncSummary {
  signature: string;
  consolidadoCount: number;
  gfpiCount: number;
  evaluationsCount: number;
  totalRows: number;
}

export interface SyncedWorkbookResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  syncedRows: number;
  signature: string;
  tabNames: string[];
}

interface SpreadsheetSheetProperties {
  sheetId: number;
  title: string;
}

interface SpreadsheetMetadataResponse {
  spreadsheetId: string;
  spreadsheetUrl?: string;
  properties?: {
    title?: string;
    locale?: string;
  };
  sheets?: {
    properties?: SpreadsheetSheetProperties;
  }[];
}

interface BatchGetValuesResponse {
  valueRanges?: {
    range?: string;
    values?: string[][];
  }[];
}

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

const CONSOLIDADO_HEADERS = [
  'Código / Documento',
  'Tipo Doc',
  'Nombres y Apellidos',
  'Ficha',
  'Programa de Formación',
  'Jornada',
  'Módulos Completados (de 4)',
  'Puntaje Evaluación (%)',
  'Identidad (%)',
  'Valores (%)',
  'Derechos (%)',
  'Deberes (%)',
  'Estado Apropiación',
  'Estado GFPI-F-165',
  'Alternativa Etapa Productiva',
  'Última Actualización',
] as const;

const GFPI_RESPUESTAS_HEADERS = [
  'Número Documento',
  'Tipo Doc',
  'Radicado GFPI-F-165',
  'Fecha Actualización',
  'Trámite Selección Inicial [X]',
  'Trámite Modificación [X]',
  'Nombres y Apellidos',
  'Correo Electrónico',
  'Teléfono Contacto',
  'Dirección y Municipio Residencia',
  'Regional y Centro SENA',
  'Ficha',
  'Nivel de Formación',
  'Programa de Formación',
  'Jornada',
  'Inicio Etapa Lectiva',
  'Fin Etapa Lectiva',
  'Alt 1: Contrato Aprendizaje [X]',
  'Alt 2: Vínculo Formativo/Laboral [X]',
  'Alt 3: Proyecto Productivo [X]',
  'Alt 4: Economía Popular/CampeSENA [X]',
  'Alt 5: Monitoría SENA [X]',
  'Alt 6: Pasantía Institucional [X]',
  'Alternativa Seleccionada',
  'Sector Económico',
  'Entidad Coformadora o Proyecto',
  'NIT Empresa',
  'Ciudad Práctica',
  'Contacto / Jefe Inmediato',
  'Inicio Etapa Productiva',
  'Fin Etapa Productiva',
  'Sustentación / Observaciones',
  'Firma Digital y Ley 1581',
  'Estado Trámite',
] as const;

const EVALUACIONES_HEADERS = [
  'ID Intento',
  'Fecha y Hora',
  'Ficha',
  'Aprendiz',
  'Puntaje Global (%)',
  'Juicio Evaluativo',
  'Identidad (%)',
  'Valores (%)',
  'Derechos (%)',
  'Deberes (%)',
  'Aciertos (de 10)',
  'Duración (s)',
] as const;

function normalizeKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase();
}

function formatBogotaTimestamp(ms: number): string {
  try {
    const d = new Date(ms);
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return parts;
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
}

function formatAppropriationLabel(state: EnrollmentRecord['appropriationState']): string {
  switch (state) {
    case 'certificado':
      return 'Certificado (A)';
    case 'apropiado':
      return 'Apropiado (A)';
    case 'plan_mejoramiento':
      return 'Plan de Mejoramiento (D)';
    default:
      return 'En Proceso';
  }
}

function formatGfpiStatusLabel(status: GfpiF165Record['status'] | 'pendiente'): string {
  switch (status) {
    case 'validado_coordinacion':
      return 'Validado Coordinación';
    case 'radicado':
      return 'Radicado en Inducción';
    case 'borrador':
      return 'Borrador';
    default:
      return 'Pendiente';
  }
}

function hashStringDeterministic(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i += 1) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sig_${part1}_${part2}`;
}

function buildCohortRows(input: CohortSyncInput): {
  consolidadoRows: (string | number)[][];
  gfpiRows: (string | number)[][];
  evaluacionesRows: (string | number)[][];
  firstGfpiDocCode: string;
  signature: string;
} {
  const { ficha, enrollments, gfpiSubmissions, evaluations } = input;

  // Map GFPI submissions by normalized documentCode (latest wins)
  const gfpiByDoc = new Map<string, GfpiF165Record>();
  const sortedGfpi = [...gfpiSubmissions].sort((a, b) => a.updatedAtMs - b.updatedAtMs);
  for (const sub of sortedGfpi) {
    const key = normalizeKey(sub.documentCode);
    if (key) {
      gfpiByDoc.set(key, sub);
    }
  }

  // Build unified Consolidado rows keyed by normalized documentCode (zero duplicates)
  const seenDocs = new Set<string>();
  const consolidadoRows: (string | number)[][] = [];

  const sortedEnrollments = [...enrollments].sort((a, b) =>
    a.apprenticeName.localeCompare(b.apprenticeName, 'es')
  );

  for (const enr of sortedEnrollments) {
    const key = normalizeKey(enr.documentCode);
    if (!key || seenDocs.has(key)) continue;
    seenDocs.add(key);

    const matchedGfpi = gfpiByDoc.get(key);
    const latestMs = Math.max(enr.updatedAtMs, matchedGfpi?.updatedAtMs ?? 0);

    consolidadoRows.push([
      enr.documentCode,
      matchedGfpi?.documentType ?? 'CC',
      enr.apprenticeName,
      enr.fichaCode || ficha.fichaCode,
      enr.programName || ficha.programName,
      matchedGfpi?.jornada ?? ficha.jornada,
      enr.completedModules.length,
      enr.attemptsCount > 0 ? enr.evalScore : '',
      enr.attemptsCount > 0 ? enr.dimIdentity : '',
      enr.attemptsCount > 0 ? enr.dimValues : '',
      enr.attemptsCount > 0 ? enr.dimRights : '',
      enr.attemptsCount > 0 ? enr.dimDuties : '',
      formatAppropriationLabel(enr.appropriationState),
      formatGfpiStatusLabel(matchedGfpi ? matchedGfpi.status : 'pendiente'),
      matchedGfpi ? matchedGfpi.selectedAlternative : 'Pendiente por seleccionar',
      formatBogotaTimestamp(latestMs),
    ]);
  }

  // Also include apprentices who submitted GFPI-F-165 for this Ficha prior to enrollment row creation
  for (const [docKey, sub] of gfpiByDoc.entries()) {
    if (seenDocs.has(docKey)) continue;
    seenDocs.add(docKey);
    consolidadoRows.push([
      sub.documentCode,
      sub.documentType,
      sub.apprenticeName,
      sub.fichaCode || ficha.fichaCode,
      sub.programName || ficha.programName,
      sub.jornada || ficha.jornada,
      0,
      '',
      '',
      '',
      '',
      '',
      'En Proceso',
      formatGfpiStatusLabel(sub.status),
      sub.selectedAlternative,
      formatBogotaTimestamp(sub.updatedAtMs),
    ]);
  }

  // Build Respuestas_GFPI_F_165 rows (34 official columns A..AH)
  const gfpiList = Array.from(gfpiByDoc.values()).sort((a, b) =>
    a.apprenticeName.localeCompare(b.apprenticeName, 'es')
  );

  const gfpiRows: (string | number)[][] = gfpiList.map((sub) => [
    sub.documentCode,
    sub.documentType,
    sub.filingCode,
    formatBogotaTimestamp(sub.updatedAtMs),
    sub.procedureType === 'Selección Inicial (Inducción)' ? 'X' : '',
    sub.procedureType === 'Modificación de Alternativa' ? 'X' : '',
    sub.apprenticeName,
    sub.contactEmail || '',
    sub.contactPhone || '',
    sub.residenceAddress || '',
    sub.regionalCenter,
    sub.fichaCode,
    sub.trainingLevel,
    sub.programName,
    sub.jornada,
    sub.lectivaStartDate,
    sub.lectivaEndDate,
    sub.selectedAlternative === 'Contrato de Aprendizaje Laboral Especial (Dec. 0223/2026)'
      ? 'X'
      : '',
    sub.selectedAlternative === 'Vínculo Formativo o Laboral' ? 'X' : '',
    sub.selectedAlternative === 'Proyecto Productivo / Fondo Emprender' ? 'X' : '',
    sub.selectedAlternative === 'Prácticas Economía Popular / CampeSENA' ? 'X' : '',
    sub.selectedAlternative === 'Monitoría SENA' ? 'X' : '',
    sub.selectedAlternative === 'Pasantía Institucional' ? 'X' : '',
    sub.selectedAlternative,
    sub.companySector,
    sub.companyName || 'Por definir en Etapa Lectiva',
    sub.companyNit || '',
    sub.companyCity || '',
    sub.companyContactName || '',
    sub.productivaStartDate,
    sub.productivaEndDate,
    sub.alternativeJustification || 'Selección proyectada en jornada de inducción SENA.',
    sub.apprenticeSignatureAccepted ? 'Firmado digitalmente · Autoriza Ley 1581/2012' : 'Pendiente',
    formatGfpiStatusLabel(sub.status),
  ]);

  // Build Historial_Evaluaciones rows keyed by attempt ID in Column A
  const sortedEvals = [...evaluations].sort((a, b) => a.createdAtMs - b.createdAtMs);
  const evaluacionesRows: (string | number)[][] = sortedEvals.map((ev) => [
    ev.id,
    formatBogotaTimestamp(ev.createdAtMs),
    ev.fichaCode || ficha.fichaCode,
    ev.apprenticeName,
    ev.score,
    ev.passed ? 'Aprobado (A)' : 'Por Reforzar (D)',
    ev.dimIdentity,
    ev.dimValues,
    ev.dimRights,
    ev.dimDuties,
    ev.correctCount,
    ev.durationSeconds,
  ]);

  // Compute deterministic signature excluding volatile formatting timestamps
  const canonicalPayload = JSON.stringify({
    fichaId: ficha.id,
    c: consolidadoRows.map((r) => r.slice(0, 15)),
    g: gfpiList.map((g) => [
      g.documentCode,
      g.documentType,
      g.filingCode,
      g.procedureType,
      g.apprenticeName,
      g.contactEmail,
      g.contactPhone,
      g.residenceAddress,
      g.regionalCenter,
      g.fichaCode,
      g.trainingLevel,
      g.programName,
      g.jornada,
      g.lectivaStartDate,
      g.lectivaEndDate,
      g.productivaStartDate,
      g.productivaEndDate,
      g.selectedAlternative,
      g.alternativeJustification,
      g.companyName,
      g.companyNit,
      g.companyCity,
      g.companyContactName,
      g.companySector,
      g.apprenticeSignatureAccepted,
      g.status,
    ]),
    e: evaluacionesRows.map((e) => [e[0], e[4], e[10]]),
  });

  return {
    consolidadoRows,
    gfpiRows,
    evaluacionesRows,
    firstGfpiDocCode: gfpiList[0]?.documentCode ?? consolidadoRows[0]?.[0]?.toString() ?? '',
    signature: hashStringDeterministic(canonicalPayload),
  };
}

export function computeCohortSyncSignature(input: CohortSyncInput): CohortSyncSummary {
  const built = buildCohortRows(input);
  return {
    signature: built.signature,
    consolidadoCount: built.consolidadoRows.length,
    gfpiCount: built.gfpiRows.length,
    evaluationsCount: built.evaluacionesRows.length,
    totalRows:
      built.consolidadoRows.length + built.gfpiRows.length + built.evaluacionesRows.length,
  };
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let apiMessage = `Error HTTP ${response.status} al comunicar con Google Sheets.`;
    try {
      const errJson = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      if (errJson?.error?.message) {
        apiMessage = errJson.error.message;
      }
    } catch {
      // Ignore non-JSON error body
    }

    if (response.status === 401 || response.status === 403) {
      throw new WorkspaceAuthError(
        `Tu sesión de Google Drive / Sheets requiere autorización (${apiMessage}). Conecta nuevamente con Google.`,
        response.status
      );
    }

    throw new Error(apiMessage);
  }

  return (await response.json()) as T;
}

function getFormulaSeparatorForLocale(locale?: string): ',' | ';' {
  if (!locale) return ',';
  const normalized = locale.trim();
  if (/^(es|pt|fr|de|it|nl|pl|ru)/i.test(normalized) && !/^(es_MX|es_US|es_PR)/i.test(normalized)) {
    return ';';
  }
  return ',';
}

function buildIndividualGfpiSheetGrid(
  firstDocCode: string,
  sep: ',' | ';'
): (string | number)[][] {
  const vlookup = (colIndex: number): string =>
    `=IFERROR(VLOOKUP($C$4${sep}${SHEET_TABS.GFPI_RESPUESTAS}!$A$2:$AH$500${sep}${colIndex}${sep}FALSE)${sep}IFERROR(VLOOKUP(TO_TEXT($C$4)${sep}${SHEET_TABS.GFPI_RESPUESTAS}!$A$2:$AH$500${sep}${colIndex}${sep}FALSE)${sep}""))`;

  return [
    [
      'SERVICIO NACIONAL DE APRENDIZAJE — SENA · SISTEMA INTEGRADO DE GESTIÓN Y AUTOCONTROL',
      '',
      '',
      '',
      'Código: GFPI-F-165',
      'Versión: 04 · 2026',
    ],
    [
      'PROCESO GESTIÓN DE FORMACIÓN PROFESIONAL INTEGRAL · FORMATO SELECCIÓN Y MODIFICACIÓN DE ALTERNATIVA DE ETAPA PRODUCTIVA',
      '',
      '',
      '',
      'Radicado:',
      vlookup(3),
    ],
    ['', '', '', '', '', ''],
    [
      'SELECCIONAR DOCUMENTO DEL APRENDIZ:',
      '',
      firstDocCode,
      'Estado del Trámite:',
      vlookup(34),
      '',
    ],
    ['', '', '', '', '', ''],
    ['1. DATOS BÁSICOS DEL APRENDIZ Y PROGRAMA DE FORMACIÓN', '', '', '', '', ''],
    [
      'Selección Inicial [X]:',
      vlookup(5),
      'Modificación [X]:',
      vlookup(6),
      'Fecha Registro:',
      vlookup(4),
    ],
    [
      'Nombres y Apellidos:',
      vlookup(7),
      '',
      'Tipo y N.° Documento:',
      vlookup(2),
      `$C$4`,
    ].map((cell, idx) => (idx === 5 ? `=IF($C$4=""${sep}""${sep}$C$4)` : cell)),
    [
      'Correo Electrónico:',
      vlookup(8),
      '',
      'Teléfono / Celular:',
      vlookup(9),
      '',
    ],
    [
      'Dirección y Municipio:',
      vlookup(10),
      '',
      'Jornada Académica:',
      vlookup(15),
      '',
    ],
    [
      'Regional y Centro SENA:',
      vlookup(11),
      '',
      'Número de Ficha:',
      vlookup(12),
      '',
    ],
    [
      'Programa de Formación:',
      vlookup(14),
      '',
      'Nivel de Formación:',
      vlookup(13),
      '',
    ],
    [
      'Inicio Etapa Lectiva:',
      vlookup(16),
      'Fin Etapa Lectiva:',
      vlookup(17),
      'Inicio Productiva:',
      vlookup(30),
    ],
    [
      'Fin Etapa Productiva:',
      vlookup(31),
      'Alternativa Activa:',
      vlookup(24),
      '',
      '',
    ],
    ['', '', '', '', '', ''],
    [
      '2. SELECCIÓN DE ALTERNATIVA DE ETAPA PRODUCTIVA (Acuerdo 009/2024 Art. 26 · Decreto 0223/2026)',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'Marca',
      'Alternativa Reglamentaria SENA',
      '',
      '',
      'Marco Normativo Aplicable',
      '',
    ],
    [
      vlookup(18),
      'Contrato de Aprendizaje Laboral Especial',
      '',
      '',
      'Ley 2466/2025 Art. 21 · Decreto 0223 de 2026',
      '',
    ],
    [
      vlookup(19),
      'Vínculo Formativo o Relación Laboral Vigente',
      '',
      '',
      'Acuerdo 009 de 2024 Art. 26 · Guía GFPI-G-040',
      '',
    ],
    [
      vlookup(20),
      'Proyecto Productivo / Unidad Productiva / Fondo Emprender',
      '',
      '',
      'Acuerdo 009 de 2024 Art. 26 · Ruta Emprendimiento SENA',
      '',
    ],
    [
      vlookup(21),
      'Prácticas en Economía Popular, Comunitaria o CampeSENA',
      '',
      '',
      'Acuerdo 009 de 2024 Art. 26 · Estrategia CampeSENA',
      '',
    ],
    [
      vlookup(22),
      'Monitoría Académica, Tecnológica o Investigativa SENA',
      '',
      '',
      'Acuerdo 009 de 2024 Art. 26 · SENNOVA / Bienestar',
      '',
    ],
    [
      vlookup(23),
      'Pasantía Institucional (Entidad Pública, MIPYME u ONG)',
      '',
      '',
      'Acuerdo 009 de 2024 Art. 26 · Decreto 055 de 2015',
      '',
    ],
    ['', '', '', '', '', ''],
    ['3. ENTIDAD COFORMADORA O PROYECTO Y SUSTENTACIÓN DEL APRENDIZ', '', '', '', '', ''],
    [
      'Entidad / Proyecto:',
      vlookup(26),
      '',
      'NIT / Referencia:',
      vlookup(27),
      '',
    ],
    [
      'Sector Económico:',
      vlookup(25),
      'Ciudad Práctica:',
      vlookup(28),
      'Contacto / Jefe:',
      vlookup(29),
    ],
    [
      'Sustentación / Observaciones:',
      vlookup(32),
      '',
      '',
      '',
      '',
    ],
    ['', '', '', '', '', ''],
    [
      '4. CONSTANCIA DE FIRMA DIGITAL Y AUTORIZACIÓN TRATAMIENTO DE DATOS (LEY 1581 DE 2012)',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'Constancia Aprendiz:',
      vlookup(33),
      '',
      'Espacio Coordinación:',
      'Reservado Coordinación Académica SENA',
      '',
    ],
  ];
}

function buildStylingRequests(sheetIds: {
  consolidado?: number;
  gfpiRespuestas?: number;
  gfpiIndividual?: number;
  evaluaciones?: number;
}): Record<string, unknown>[] {
  const senaGreen = { red: 0.082, green: 0.502, blue: 0.239 };
  const senaSoftGreen = { red: 0.925, green: 0.992, blue: 0.961 };
  const slateHeader = { red: 0.945, green: 0.961, blue: 0.976 };
  const white = { red: 1, green: 1, blue: 1 };

  const requests: Record<string, unknown>[] = [];

  const styleDataTab = (sheetId: number | undefined, colCount: number) => {
    if (sheetId === undefined) return;
    requests.push(
      {
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: senaGreen,
              textFormat: {
                foregroundColor: white,
                bold: true,
                fontSize: 10,
              },
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
        },
      }
    );
  };

  styleDataTab(sheetIds.consolidado, CONSOLIDADO_HEADERS.length);
  styleDataTab(sheetIds.gfpiRespuestas, GFPI_RESPUESTAS_HEADERS.length);
  styleDataTab(sheetIds.evaluaciones, EVALUACIONES_HEADERS.length);

  if (sheetIds.gfpiIndividual !== undefined) {
    const sid = sheetIds.gfpiIndividual;
    // Title banner & section headers (rows 0, 5, 15, 24, 29 are 0-based indices)
    for (const bannerRow of [0, 5, 15, 24, 29]) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: sid,
            startRowIndex: bannerRow,
            endRowIndex: bannerRow + 1,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: senaGreen,
              textFormat: {
                foregroundColor: white,
                bold: true,
                fontSize: 10,
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
    }

    // Sub-banner & table header rows
    for (const subRow of [1, 16]) {
      requests.push({
        repeatCell: {
          range: {
            sheetId: sid,
            startRowIndex: subRow,
            endRowIndex: subRow + 1,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: slateHeader,
              textFormat: { bold: true, fontSize: 9 },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      });
    }

    // Highlight selector cell C4 (rowIndex 3, colIndex 2) and attach dropdown from Respuestas_GFPI_F_165!A2:A500
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId: sid,
            startRowIndex: 3,
            endRowIndex: 4,
            startColumnIndex: 0,
            endColumnIndex: 6,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: senaSoftGreen,
              textFormat: { bold: true, fontSize: 10 },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      },
      {
        setDataValidation: {
          range: {
            sheetId: sid,
            startRowIndex: 3,
            endRowIndex: 4,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          rule: {
            condition: {
              type: 'ONE_OF_RANGE',
              values: [
                {
                  userEnteredValue: `=${SHEET_TABS.GFPI_RESPUESTAS}!$A$2:$A$500`,
                },
              ],
            },
            showCustomUi: true,
            strict: false,
          },
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: sid,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 6,
          },
          properties: { pixelSize: 195 },
          fields: 'pixelSize',
        },
      }
    );
  }

  return requests;
}

async function upsertRowsIntoTabs(params: {
  spreadsheetId: string;
  accessToken: string;
  locale?: string;
  built: ReturnType<typeof buildCohortRows>;
  initializeIndividualSheet: boolean;
}): Promise<number> {
  const { spreadsheetId, accessToken, locale, built, initializeIndividualSheet } = params;
  const sep = getFormulaSeparatorForLocale(locale);

  // Read existing primary keys in Column A for smart upsert without duplicates
  const rangesQuery = [
    `'${SHEET_TABS.CONSOLIDADO}'!A2:A1000`,
    `'${SHEET_TABS.GFPI_RESPUESTAS}'!A2:A1000`,
    `'${SHEET_TABS.EVALUACIONES}'!A2:A2000`,
    `'${SHEET_TABS.GFPI_INDIVIDUAL}'!C4`,
  ]
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const existingBatch = await sheetsFetch<BatchGetValuesResponse>(
    `${SHEETS_BASE_URL}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${rangesQuery}`,
    accessToken
  );

  const mapExistingKeys = (values?: string[][]): Map<string, number> => {
    const keyToRow = new Map<string, number>();
    if (!values) return keyToRow;
    values.forEach((row, index) => {
      const cell = normalizeKey(row?.[0]);
      if (cell && !keyToRow.has(cell)) {
        keyToRow.set(cell, index + 2); // 1-indexed, starting at row 2
      }
    });
    return keyToRow;
  };

  const consolidadoKeyMap = mapExistingKeys(existingBatch.valueRanges?.[0]?.values);
  const gfpiKeyMap = mapExistingKeys(existingBatch.valueRanges?.[1]?.values);
  const evalKeyMap = mapExistingKeys(existingBatch.valueRanges?.[2]?.values);
  const currentSelectorVal = String(
    existingBatch.valueRanges?.[3]?.values?.[0]?.[0] ?? ''
  ).trim();

  const batchUpdateData: { range: string; values: (string | number)[][] }[] = [
    {
      range: `'${SHEET_TABS.CONSOLIDADO}'!A1:P1`,
      values: [[...CONSOLIDADO_HEADERS]],
    },
    {
      range: `'${SHEET_TABS.GFPI_RESPUESTAS}'!A1:AH1`,
      values: [[...GFPI_RESPUESTAS_HEADERS]],
    },
    {
      range: `'${SHEET_TABS.EVALUACIONES}'!A1:L1`,
      values: [[...EVALUACIONES_HEADERS]],
    },
  ];

  if (initializeIndividualSheet) {
    batchUpdateData.push({
      range: `'${SHEET_TABS.GFPI_INDIVIDUAL}'!A1:F31`,
      values: buildIndividualGfpiSheetGrid(built.firstGfpiDocCode, sep),
    });
  } else if (!currentSelectorVal && built.firstGfpiDocCode) {
    batchUpdateData.push({
      range: `'${SHEET_TABS.GFPI_INDIVIDUAL}'!C4`,
      values: [[built.firstGfpiDocCode]],
    });
  }

  const consolidadoAppends: (string | number)[][] = [];
  for (const row of built.consolidadoRows) {
    const key = normalizeKey(row[0]);
    const existingRow = consolidadoKeyMap.get(key);
    if (existingRow) {
      batchUpdateData.push({
        range: `'${SHEET_TABS.CONSOLIDADO}'!A${existingRow}:P${existingRow}`,
        values: [row],
      });
    } else {
      consolidadoAppends.push(row);
    }
  }

  const gfpiAppends: (string | number)[][] = [];
  for (const row of built.gfpiRows) {
    const key = normalizeKey(row[0]);
    const existingRow = gfpiKeyMap.get(key);
    if (existingRow) {
      batchUpdateData.push({
        range: `'${SHEET_TABS.GFPI_RESPUESTAS}'!A${existingRow}:AH${existingRow}`,
        values: [row],
      });
    } else {
      gfpiAppends.push(row);
    }
  }

  const evalAppends: (string | number)[][] = [];
  for (const row of built.evaluacionesRows) {
    const key = normalizeKey(row[0]);
    const existingRow = evalKeyMap.get(key);
    if (existingRow) {
      batchUpdateData.push({
        range: `'${SHEET_TABS.EVALUACIONES}'!A${existingRow}:L${existingRow}`,
        values: [row],
      });
    } else {
      evalAppends.push(row);
    }
  }

  await sheetsFetch(
    `${SHEETS_BASE_URL}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchUpdateData,
      }),
    }
  );

  const appendToTab = async (tabName: string, rows: (string | number)[][]) => {
    if (rows.length === 0) return;
    const range = encodeURIComponent(`'${tabName}'!A1`);
    await sheetsFetch(
      `${SHEETS_BASE_URL}/${encodeURIComponent(
        spreadsheetId
      )}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ values: rows }),
      }
    );
  };

  await appendToTab(SHEET_TABS.CONSOLIDADO, consolidadoAppends);
  await appendToTab(SHEET_TABS.GFPI_RESPUESTAS, gfpiAppends);
  await appendToTab(SHEET_TABS.EVALUACIONES, evalAppends);

  return (
    built.consolidadoRows.length + built.gfpiRows.length + built.evaluacionesRows.length
  );
}

export async function createAndSyncSenaWorkbook(params: {
  accessToken: string;
  customTitle?: string;
  cohort: CohortSyncInput;
}): Promise<SyncedWorkbookResult> {
  const { accessToken, customTitle, cohort } = params;
  const title =
    (customTitle ?? '').trim() ||
    `SENA Inducción y GFPI-F-165 · Ficha ${cohort.ficha.fichaCode} · ${cohort.ficha.programName}`.slice(
      0,
      150
    );

  // Create workbook with explicit tab titles & en_US formula locale + America/Bogota timezone
  const created = await sheetsFetch<SpreadsheetMetadataResponse>(
    SHEETS_BASE_URL,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title,
          locale: 'en_US',
          timeZone: 'America/Bogota',
        },
        sheets: [
          {
            properties: {
              title: SHEET_TABS.CONSOLIDADO,
              gridProperties: { rowCount: 600, columnCount: 18 },
            },
          },
          {
            properties: {
              title: SHEET_TABS.GFPI_RESPUESTAS,
              gridProperties: { rowCount: 600, columnCount: 36 },
            },
          },
          {
            properties: {
              title: SHEET_TABS.GFPI_INDIVIDUAL,
              gridProperties: { rowCount: 45, columnCount: 8 },
            },
          },
          {
            properties: {
              title: SHEET_TABS.EVALUACIONES,
              gridProperties: { rowCount: 1200, columnCount: 14 },
            },
          },
        ],
      }),
    }
  );

  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const spreadsheetTitle = created.properties?.title || title;

  const sheetMap = new Map<string, number>();
  for (const s of created.sheets ?? []) {
    if (s.properties?.title && typeof s.properties.sheetId === 'number') {
      sheetMap.set(s.properties.title, s.properties.sheetId);
    }
  }

  const styleRequests = buildStylingRequests({
    consolidado: sheetMap.get(SHEET_TABS.CONSOLIDADO),
    gfpiRespuestas: sheetMap.get(SHEET_TABS.GFPI_RESPUESTAS),
    gfpiIndividual: sheetMap.get(SHEET_TABS.GFPI_INDIVIDUAL),
    evaluaciones: sheetMap.get(SHEET_TABS.EVALUACIONES),
  });

  if (styleRequests.length > 0) {
    await sheetsFetch(
      `${SHEETS_BASE_URL}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests: styleRequests }),
      }
    );
  }

  const built = buildCohortRows(cohort);
  const syncedRows = await upsertRowsIntoTabs({
    spreadsheetId,
    accessToken,
    locale: created.properties?.locale ?? 'en_US',
    built,
    initializeIndividualSheet: true,
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle,
    syncedRows,
    signature: built.signature,
    tabNames: Object.values(SHEET_TABS),
  };
}

export async function syncCohortToExistingWorkbook(params: {
  accessToken: string;
  spreadsheetId: string;
  cohort: CohortSyncInput;
}): Promise<SyncedWorkbookResult> {
  const { accessToken, spreadsheetId, cohort } = params;

  // Always inspect actual workbook metadata first (NEVER assume 'Sheet1')
  const meta = await sheetsFetch<SpreadsheetMetadataResponse>(
    `${SHEETS_BASE_URL}/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,spreadsheetUrl,properties(title,locale),sheets.properties(sheetId,title)`,
    accessToken
  );

  const existingTitleToId = new Map<string, number>();
  for (const s of meta.sheets ?? []) {
    if (s.properties?.title && typeof s.properties.sheetId === 'number') {
      existingTitleToId.set(s.properties.title, s.properties.sheetId);
    }
  }

  const requiredTabs: { title: string; rowCount: number; columnCount: number }[] = [
    { title: SHEET_TABS.CONSOLIDADO, rowCount: 600, columnCount: 18 },
    { title: SHEET_TABS.GFPI_RESPUESTAS, rowCount: 600, columnCount: 36 },
    { title: SHEET_TABS.GFPI_INDIVIDUAL, rowCount: 45, columnCount: 8 },
    { title: SHEET_TABS.EVALUACIONES, rowCount: 1200, columnCount: 14 },
  ];

  const missingTabs = requiredTabs.filter((t) => !existingTitleToId.has(t.title));
  let addedIndividualTab = false;

  if (missingTabs.length > 0) {
    const addRequests = missingTabs.map((t) => {
      if (t.title === SHEET_TABS.GFPI_INDIVIDUAL) {
        addedIndividualTab = true;
      }
      return {
        addSheet: {
          properties: {
            title: t.title,
            gridProperties: {
              rowCount: t.rowCount,
              columnCount: t.columnCount,
            },
          },
        },
      };
    });

    const addResp = await sheetsFetch<{
      replies?: { addSheet?: { properties?: SpreadsheetSheetProperties } }[];
    }>(
      `${SHEETS_BASE_URL}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests: addRequests }),
      }
    );

    const newlyAddedIds: {
      consolidado?: number;
      gfpiRespuestas?: number;
      gfpiIndividual?: number;
      evaluaciones?: number;
    } = {};

    for (const reply of addResp.replies ?? []) {
      const props = reply.addSheet?.properties;
      if (props?.title && typeof props.sheetId === 'number') {
        existingTitleToId.set(props.title, props.sheetId);
        if (props.title === SHEET_TABS.CONSOLIDADO) newlyAddedIds.consolidado = props.sheetId;
        if (props.title === SHEET_TABS.GFPI_RESPUESTAS)
          newlyAddedIds.gfpiRespuestas = props.sheetId;
        if (props.title === SHEET_TABS.GFPI_INDIVIDUAL)
          newlyAddedIds.gfpiIndividual = props.sheetId;
        if (props.title === SHEET_TABS.EVALUACIONES)
          newlyAddedIds.evaluaciones = props.sheetId;
      }
    }

    const styleReqs = buildStylingRequests(newlyAddedIds);
    if (styleReqs.length > 0) {
      await sheetsFetch(
        `${SHEETS_BASE_URL}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ requests: styleReqs }),
        }
      );
    }
  }

  const built = buildCohortRows(cohort);
  const syncedRows = await upsertRowsIntoTabs({
    spreadsheetId,
    accessToken,
    locale: meta.properties?.locale,
    built,
    initializeIndividualSheet: addedIndividualTab,
  });

  return {
    spreadsheetId: meta.spreadsheetId,
    spreadsheetUrl:
      meta.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}/edit`,
    spreadsheetTitle:
      meta.properties?.title || `Seguimiento Ficha ${cohort.ficha.fichaCode}`,
    syncedRows,
    signature: built.signature,
    tabNames: Array.from(existingTitleToId.keys()),
  };
}

/**
 * Zero-dependency browser inspector for local .xlsx template files
 * (e.g. "GFPI-F-165FormatoSeleccionModificacionAlternativaEtapaProductiva.xlsx").
 * Reads ZIP Central Directory entries xl/workbook.xml and xl/sharedStrings.xml.
 */
async function inflateRawBytes(compressed: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    return '';
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  void writer.write(copy);
  void writer.close();

  const response = new Response(ds.readable);
  const arrayBuf = await response.arrayBuffer();
  return new TextDecoder('utf-8').decode(arrayBuf);
}

export async function inspectLocalXlsxTemplate(
  file: File
): Promise<LocalXlsxInspectionResult> {
  const fallback: LocalXlsxInspectionResult = {
    fileName: file.name,
    sheetNames: [],
    detectedHeaders: [],
    matchesGfpi165: /165|gfpi|etapa\s*productiva/i.test(file.name),
  };

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Locate ZIP End of Central Directory (0x06054b50)
    let eocdOffset = -1;
    const minSearch = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minSearch; i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset < 0) {
      return fallback;
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const decoder = new TextDecoder('utf-8');

    const extractedXml = new Map<string, string>();
    let ptr = cdOffset;

    for (let idx = 0; idx < totalEntries && ptr + 46 <= bytes.length; idx += 1) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;

      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const fileNameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const entryName = decoder.decode(
        bytes.subarray(ptr + 46, ptr + 46 + fileNameLen)
      );

      if (entryName === 'xl/workbook.xml' || entryName === 'xl/sharedStrings.xml') {
        if (
          localHeaderOffset + 30 <= bytes.length &&
          view.getUint32(localHeaderOffset, true) === 0x04034b50
        ) {
          const localNameLen = view.getUint16(localHeaderOffset + 26, true);
          const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
          const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
          const dataEnd = Math.min(bytes.length, dataStart + compressedSize);
          const slice = bytes.subarray(dataStart, dataEnd);

          if (compressionMethod === 0) {
            extractedXml.set(entryName, decoder.decode(slice));
          } else if (compressionMethod === 8) {
            const xml = await inflateRawBytes(slice);
            if (xml) extractedXml.set(entryName, xml);
          }
        }
      }

      ptr += 46 + fileNameLen + extraLen + commentLen;
    }

    const parser = new DOMParser();
    const sheetNames: string[] = [];
    const workbookXml = extractedXml.get('xl/workbook.xml');
    if (workbookXml) {
      const doc = parser.parseFromString(workbookXml, 'application/xml');
      const sheets = Array.from(doc.getElementsByTagName('sheet'));
      for (const s of sheets) {
        const name = s.getAttribute('name');
        if (name) sheetNames.push(name);
      }
    }

    const detectedHeaders: string[] = [];
    const sharedXml = extractedXml.get('xl/sharedStrings.xml');
    if (sharedXml) {
      const doc = parser.parseFromString(sharedXml, 'application/xml');
      const tNodes = Array.from(doc.getElementsByTagName('t'));
      const seen = new Set<string>();
      for (const node of tNodes) {
        const txt = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (
          txt.length >= 4 &&
          txt.length <= 90 &&
          /GFPI|165|Alternativa|Etapa\s*Productiva|Aprendiz|Ficha|Programa|Contrato|Pasant|Proyecto|Monitor|Empresa|Coformadora/i.test(
            txt
          )
        ) {
          const norm = txt.toLowerCase();
          if (!seen.has(norm)) {
            seen.add(norm);
            detectedHeaders.push(txt);
            if (detectedHeaders.length >= 12) break;
          }
        }
      }
    }

    const matchesGfpi165 =
      /165|gfpi|productiva/i.test(file.name) ||
      sheetNames.some((n) => /165|gfpi|productiva|formato/i.test(n)) ||
      detectedHeaders.some((h) => /165|gfpi|etapa\s*productiva/i.test(h));

    return {
      fileName: file.name,
      sheetNames,
      detectedHeaders,
      matchesGfpi165,
    };
  } catch {
    return fallback;
  }
}
