import { jsPDF } from 'jspdf';
import type { EvaluationSummaryPayload } from '../components/InteractiveEvaluation';
import { SENA_OFFICIAL_LOGO_DATA_URI } from '../components/SenaLogo';
import type {
  ApprenticeProfileData,
  EnrollmentRecord,
  EvaluationAttemptRecord,
  FichaRecord,
  GfpiF165Record,
} from './inductionStore';
import type { AppropriationState, InductionModuleId } from './validation';

export interface ApprenticeTrajectoryPdfInput {
  profile: ApprenticeProfileData;
  userDisplayName?: string | null;
  selectedFicha: Pick<
    FichaRecord,
    'fichaCode' | 'programName' | 'centerName' | 'jornada'
  > | null;
  currentEnrollment: Pick<
    EnrollmentRecord,
    | 'appropriationState'
    | 'evalScore'
    | 'dimIdentity'
    | 'dimValues'
    | 'dimRights'
    | 'dimDuties'
    | 'attemptsCount'
  > | null;
  gfpiSubmission: Pick<
    GfpiF165Record,
    | 'selectedAlternative'
    | 'procedureType'
    | 'status'
    | 'filingCode'
    | 'productivaStartDate'
    | 'productivaEndDate'
  > | null;
  completedModules: InductionModuleId[];
  latestSummary: EvaluationSummaryPayload | null;
  evaluationHistory: Pick<
    EvaluationAttemptRecord,
    | 'id'
    | 'fichaCode'
    | 'score'
    | 'passed'
    | 'dimIdentity'
    | 'dimValues'
    | 'dimRights'
    | 'dimDuties'
    | 'createdAtMs'
  >[];
}

function sanitizePdfText(raw: string): string {
  return raw
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2192/g, '->')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildVerificationData(seed: string): { code: string; bits: boolean[] } {
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

function formatShortDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    return '2026';
  }
}

function formatDateTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '2026';
  }
}

async function rasterizeSenaLogoPng(): Promise<string | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = window.setTimeout(() => resolve(null), 1500);

    img.onload = () => {
      window.clearTimeout(timeoutId);
      try {
        const size = 192;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 12, 12, size - 24, size - 24);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timeoutId);
      resolve(null);
    };

    img.src = SENA_OFFICIAL_LOGO_DATA_URI;
  });
}

function fitLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const clean = sanitizePdfText(text) || '-';
  const lines = doc.splitTextToSize(clean, maxWidth) as string[];
  if (lines.length <= maxLines) {
    return lines;
  }
  const sliced = lines.slice(0, maxLines);
  const last = sliced[maxLines - 1];
  sliced[maxLines - 1] =
    last.length > 3 ? `${last.slice(0, last.length - 3).trimEnd()}...` : last;
  return sliced;
}

function resolveGlobalJudgment(state: AppropriationState): {
  shortLabel: string;
  detailLabel: string;
  rgb: [number, number, number];
  bgRgb: [number, number, number];
} {
  switch (state) {
    case 'certificado':
      return {
        shortLabel: 'CERTIFICADO (A)',
        detailLabel: 'Certificado en Inducción SENA',
        rgb: [21, 128, 61],
        bgRgb: [236, 253, 245],
      };
    case 'apropiado':
      return {
        shortLabel: 'APROBADO (A)',
        detailLabel: 'Proceso de inducción apropiado (>= 70%)',
        rgb: [21, 128, 61],
        bgRgb: [236, 253, 245],
      };
    case 'plan_mejoramiento':
      return {
        shortLabel: 'POR REFORZAR (D)',
        detailLabel: 'En Plan de Mejoramiento (< 70%)',
        rgb: [180, 83, 9],
        bgRgb: [255, 251, 235],
      };
    default:
      return {
        shortLabel: 'EN PROCESO',
        detailLabel: 'Recorrido formativo en curso',
        rgb: [51, 65, 85],
        bgRgb: [241, 245, 249],
      };
  }
}

export async function downloadApprenticeTrajectoryPdf(
  input: ApprenticeTrajectoryPdfInput
): Promise<void> {
  const {
    profile,
    userDisplayName,
    selectedFicha,
    currentEnrollment,
    gfpiSubmission,
    completedModules,
    latestSummary,
    evaluationHistory,
  } = input;

  const effectiveName =
    profile.apprenticeName.trim() || userDisplayName?.trim() || 'Aprendiz en Inducción';
  const effectiveCode = profile.documentCode.trim() || 'APR-102400';
  const effectiveFichaLabel = selectedFicha
    ? `Ficha ${selectedFicha.fichaCode}`
    : 'Exploración autónoma (sin Ficha vinculada)';
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

  const judgment = resolveGlobalJudgment(derivedState);
  const currentScore =
    currentEnrollment && currentEnrollment.attemptsCount > 0
      ? currentEnrollment.evalScore
      : latestSummary?.score ?? null;

  const moduleRows: Array<{
    code: string;
    id: InductionModuleId;
    title: string;
    studied: boolean;
    score: number | null;
  }> = [
    {
      code: '01',
      id: 'identidad',
      title: 'Identidad e Imagen Institucional SENA',
      studied: completedModules.includes('identidad'),
      score:
        currentEnrollment && currentEnrollment.attemptsCount > 0
          ? currentEnrollment.dimIdentity
          : latestSummary?.dimIdentity ?? null,
    },
    {
      code: '02',
      id: 'valores',
      title: 'Valores y Código de Integridad',
      studied: completedModules.includes('valores'),
      score:
        currentEnrollment && currentEnrollment.attemptsCount > 0
          ? currentEnrollment.dimValues
          : latestSummary?.dimValues ?? null,
    },
    {
      code: '03',
      id: 'derechos',
      title: 'Derechos del Aprendiz (Cap. II · Acuerdo 009/2024)',
      studied: completedModules.includes('derechos'),
      score:
        currentEnrollment && currentEnrollment.attemptsCount > 0
          ? currentEnrollment.dimRights
          : latestSummary?.dimRights ?? null,
    },
    {
      code: '04',
      id: 'deberes',
      title: 'Deberes, Convivencia y SST (Cap. III · Acuerdo 009/2024)',
      studied: completedModules.includes('deberes'),
      score:
        currentEnrollment && currentEnrollment.attemptsCount > 0
          ? currentEnrollment.dimDuties
          : latestSummary?.dimDuties ?? null,
    },
  ];

  const approvedModulesCount = moduleRows.filter(
    (m) => m.score !== null && m.score >= 70
  ).length;
  const studiedPct = Math.round((completedModules.length / 4) * 100);

  const historyList =
    evaluationHistory.length > 0
      ? evaluationHistory.slice(0, 3)
      : latestSummary
      ? [
          {
            id: 'local_latest',
            fichaCode: selectedFicha?.fichaCode ?? 'Local',
            score: latestSummary.score,
            passed: latestSummary.passed,
            dimIdentity: latestSummary.dimIdentity,
            dimValues: latestSummary.dimValues,
            dimRights: latestSummary.dimRights,
            dimDuties: latestSummary.dimDuties,
            createdAtMs: Date.now(),
          },
        ]
      : [];

  const totalAttempts =
    currentEnrollment?.attemptsCount ??
    (evaluationHistory.length > 0 ? evaluationHistory.length : historyList.length);

  const verification = buildVerificationData(
    `${effectiveCode}|${selectedFicha?.fichaCode ?? 'LIBRE'}|${derivedState}|${completedModules.length}`
  );

  const logoPngDataUrl = await rasterizeSenaLogoPng();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const marginX = 14;
  const contentWidth = 182;

  // =========================================================================
  // HEADER BAND
  // =========================================================================
  doc.setFillColor(21, 128, 61);
  doc.roundedRect(marginX, 12, contentWidth, 26, 2.5, 2.5, 'F');

  doc.setFillColor(57, 169, 0);
  doc.rect(marginX, 36.4, contentWidth, 1.6, 'F');

  // Logo container
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + 4, 15.5, 17, 17, 2, 2, 'F');
  if (logoPngDataUrl) {
    doc.addImage(logoPngDataUrl, 'PNG', marginX + 5.2, 16.7, 14.6, 14.6);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61);
    doc.text('SENA', marginX + 12.5, 25.2, { align: 'center' });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SERVICIO NACIONAL DE APRENDIZAJE - SENA', marginX + 25, 19.5);

  doc.setFontSize(13.5);
  doc.text(
    sanitizePdfText('Resumen de Trayectoria de Inducción del Aprendiz'),
    marginX + 25,
    26.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(220, 252, 231);
  doc.text(
    sanitizePdfText(
      'Reglamento del Aprendiz: Acuerdo 009 de 2024 · Acuerdo 002 de 2026 · Decreto 0223 de 2026'
    ),
    marginX + 25,
    32
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text(verification.code, marginX + contentWidth - 4, 19.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 252, 231);
  doc.text(
    sanitizePdfText(`Emisión: ${formatDateTime(Date.now())}`),
    marginX + contentWidth - 4,
    25.2,
    { align: 'right' }
  );

  // =========================================================================
  // SECTION 01: APPRENTICE & FICHA IDENTIFICATION (Zero Instructor Data)
  // =========================================================================
  let cursorY = 45;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText('01. Identificación del Aprendiz y Vinculación a Ficha'),
    marginX,
    cursorY
  );

  cursorY += 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cursorY, contentWidth, 35, 2, 2, 'FD');

  // Vertical divider between left & right columns
  const midX = marginX + 91;
  doc.setDrawColor(226, 232, 240);
  doc.line(midX, cursorY + 3.5, midX, cursorY + 31.5);

  const leftX = marginX + 4.5;
  const rightX = midX + 4.5;
  const colWidth = 82;

  // Left Column: Apprentice Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NOMBRE COMPLETO DEL APRENDIZ', leftX, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const nameLines = fitLines(doc, effectiveName, colWidth, 1);
  doc.text(nameLines, leftX, cursorY + 10.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText('DOCUMENTO / CÓDIGO CARNÉ'), leftX, cursorY + 17);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(effectiveCode), leftX, cursorY + 21.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GRUPO RH (SST)', leftX + 48, cursorY + 17);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(profile.bloodType), leftX + 48, cursorY + 21.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NIVEL FORMATIVO Y ROL', leftX, cursorY + 27.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(30, 41, 59);
  doc.text(
    fitLines(
      doc,
      `${profile.trainingLevel} · ${profile.representationRole}`,
      colWidth,
      1
    ),
    leftX,
    cursorY + 31.4
  );

  // Right Column: Ficha & Academic Program Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText('FICHA DE CARACTERIZACIÓN'), rightX, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text(fitLines(doc, effectiveFichaLabel, colWidth, 1), rightX, cursorY + 10.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText('PROGRAMA DE FORMACIÓN Y JORNADA'), rightX, cursorY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.setTextColor(15, 23, 42);
  doc.text(
    fitLines(
      doc,
      `${effectiveProgram} (${profile.modality} · ${effectiveJornada})`,
      colWidth,
      1
    ),
    rightX,
    cursorY + 21.3
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText('CENTRO DE FORMACIÓN Y REGIONAL'), rightX, cursorY + 27.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.text(fitLines(doc, effectiveCenter, colWidth, 1), rightX, cursorY + 31.4);

  // =========================================================================
  // KPI STRIP (4 SUMMARY CARDS)
  // =========================================================================
  cursorY += 40;
  const kpiGap = 3.6;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 20;

  const kpiCards: Array<{
    label: string;
    value: string;
    sub: string;
    valueRgb: [number, number, number];
    bgRgb: [number, number, number];
  }> = [
    {
      label: 'ESTADO GLOBAL INDUCCIÓN',
      value: judgment.shortLabel,
      sub: judgment.detailLabel,
      valueRgb: judgment.rgb,
      bgRgb: judgment.bgRgb,
    },
    {
      label: 'MÓDULOS ESTUDIADOS',
      value: `${completedModules.length} / 4 (${studiedPct}%)`,
      sub: 'Lectura interactiva completada',
      valueRgb: [15, 23, 42],
      bgRgb: [255, 255, 255],
    },
    {
      label: 'MÓDULOS APROBADOS',
      value: `${approvedModulesCount} / 4`,
      sub: 'Con calificación >= 70%',
      valueRgb:
        approvedModulesCount === 4
          ? [21, 128, 61]
          : currentScore !== null
          ? [180, 83, 9]
          : [51, 65, 85],
      bgRgb: [255, 255, 255],
    },
    {
      label: 'PUNTAJE DIAGNÓSTICO',
      value: currentScore !== null ? `${currentScore}%` : 'Pendiente',
      sub: `Intentos: ${totalAttempts} · Meta >= 70%`,
      valueRgb:
        currentScore === null
          ? [71, 85, 105]
          : currentScore >= 70
          ? [21, 128, 61]
          : [180, 83, 9],
      bgRgb: [255, 255, 255],
    },
  ];

  kpiCards.forEach((card, idx) => {
    const x = marginX + idx * (kpiWidth + kpiGap);
    doc.setFillColor(card.bgRgb[0], card.bgRgb[1], card.bgRgb[2]);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.28);
    doc.roundedRect(x, cursorY, kpiWidth, kpiHeight, 1.8, 1.8, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizePdfText(card.label), x + 3, cursorY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(card.valueRgb[0], card.valueRgb[1], card.valueRgb[2]);
    doc.text(fitLines(doc, card.value, kpiWidth - 6, 1), x + 3, cursorY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(fitLines(doc, card.sub, kpiWidth - 6, 1), x + 3, cursorY + 16.8);
  });

  // =========================================================================
  // SECTION 02: MODULE-BY-MODULE APPROVAL STATUS TABLE
  // =========================================================================
  cursorY += 27;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText('02. Estado de Aprobación de los Módulos de Inducción'),
    marginX,
    cursorY
  );

  cursorY += 3;
  const colCodeW = 12;
  const colTitleW = 73;
  const colStudyW = 28;
  const colScoreW = 24;
  const colApprovalW = contentWidth - colCodeW - colTitleW - colStudyW - colScoreW; // 45mm

  const xCode = marginX;
  const xTitle = xCode + colCodeW;
  const xStudy = xTitle + colTitleW;
  const xScore = xStudy + colStudyW;
  const xApproval = xScore + colScoreW;

  // Table Header
  const headerH = 8.5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(marginX, cursorY, contentWidth, headerH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(sanitizePdfText('Cód.'), xCode + 2.5, cursorY + 5.5);
  doc.text(sanitizePdfText('Módulo / Dimensión Formativa'), xTitle + 2, cursorY + 5.5);
  doc.text('Estudio', xStudy + 2, cursorY + 5.5);
  doc.text('Puntaje', xScore + 2, cursorY + 5.5);
  doc.text(sanitizePdfText('Estado de Aprobación'), xApproval + 2, cursorY + 5.5);

  cursorY += headerH;
  const rowH = 12.5;

  moduleRows.forEach((mod, index) => {
    const rowY = cursorY + index * rowH;
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.rect(marginX, rowY, contentWidth, rowH, 'FD');

    // Module Code
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text(mod.code, xCode + 3, rowY + 7.4);

    // Module Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.3);
    doc.setTextColor(15, 23, 42);
    doc.text(fitLines(doc, mod.title, colTitleW - 4, 1), xTitle + 2, rowY + 7.4);

    // Study Completion Indicator (Vector indicator + text)
    if (mod.studied) {
      doc.setFillColor(21, 128, 61);
      doc.circle(xStudy + 3.5, rowY + 6.4, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(21, 128, 61);
      doc.text('Completado', xStudy + 6.8, rowY + 7.4);
    } else {
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.circle(xStudy + 3.5, rowY + 6.4, 1.4, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text('Pendiente', xStudy + 6.8, rowY + 7.4);
    }

    // Score + Vector Progress Bar
    if (mod.score !== null) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${mod.score}%`, xScore + 2, rowY + 5.8);

      const barW = 17;
      const barH = 1.7;
      const barX = xScore + 2;
      const barY = rowY + 7.6;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, barY, barW, barH, 0.8, 0.8, 'F');

      const fillW = Math.max(1.2, (Math.min(100, Math.max(0, mod.score)) / 100) * barW);
      if (mod.score >= 70) {
        doc.setFillColor(21, 128, 61);
      } else {
        doc.setFillColor(217, 119, 6);
      }
      doc.roundedRect(barX, barY, fillW, barH, 0.8, 0.8, 'F');
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(100, 116, 139);
      doc.text('Sin evaluar', xScore + 2, rowY + 7.4);
    }

    // Approval State Cell
    let approvalText = 'PENDIENTE';
    let textRgb: [number, number, number] = [100, 116, 139];
    let badgeBg: [number, number, number] = [241, 245, 249];

    if (mod.score !== null && mod.score >= 70) {
      approvalText = 'APROBADO (>= 70%)';
      textRgb = [21, 128, 61];
      badgeBg = [236, 253, 245];
    } else if (mod.score !== null && mod.score < 70) {
      approvalText = 'POR REFORZAR (< 70%)';
      textRgb = [180, 83, 9];
      badgeBg = [255, 251, 235];
    } else if (mod.studied) {
      approvalText = 'ESTUDIADO · FALTA PRUEBA';
      textRgb = [51, 65, 85];
      badgeBg = [241, 245, 249];
    }

    doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
    doc.roundedRect(xApproval + 1.5, rowY + 3.2, colApprovalW - 3.5, 6.1, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.1);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    doc.text(sanitizePdfText(approvalText), xApproval + 3.2, rowY + 7.2);
  });

  cursorY += moduleRows.length * rowH + 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText(
      'Criterio institucional: Cada módulo se registra como APROBADO al alcanzar un puntaje diagnóstico >= 70% bajo el Reglamento del Aprendiz SENA.'
    ),
    marginX,
    cursorY
  );

  // =========================================================================
  // SECTION 03: ETAPA PRODUCTIVA (GFPI-F-165), COMMITMENT & HISTORY
  // =========================================================================
  cursorY += 7.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText('03. Etapa Productiva (GFPI-F-165), Compromiso y Trazabilidad'),
    marginX,
    cursorY
  );

  cursorY += 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.28);
  doc.roundedRect(marginX, cursorY, contentWidth, 24, 2, 2, 'FD');

  const selectedAltText = gfpiSubmission
    ? gfpiSubmission.selectedAlternative
    : profile.preferredProductiveAlt;
  const gfpiStatusText = gfpiSubmission
    ? gfpiSubmission.status === 'radicado' ||
      gfpiSubmission.status === 'validado_coordinacion'
      ? `Radicado digitalmente (${gfpiSubmission.filingCode}) · Prácticas: ${gfpiSubmission.productivaStartDate} a ${gfpiSubmission.productivaEndDate}`
      : `Borrador en edición (${gfpiSubmission.filingCode})`
    : 'Pendiente de radicar desde el módulo GFPI-F-165';

  const commitmentText = profile.commitmentAccepted
    ? 'Suscrita por el aprendiz (Cap. III · Art. 8 · Numeral 01)'
    : 'Pendiente de suscripción en Mi Perfil';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(51, 65, 85);
  doc.text('Alternativa de Etapa Productiva:', marginX + 4, cursorY + 6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    fitLines(doc, selectedAltText, contentWidth - 52, 1),
    marginX + 48,
    cursorY + 6.2
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Estado Formato GFPI-F-165:', marginX + 4, cursorY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(
    fitLines(doc, gfpiStatusText, contentWidth - 52, 1),
    marginX + 48,
    cursorY + 13
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Acta de Compromiso SENA:', marginX + 4, cursorY + 19.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(
    profile.commitmentAccepted ? 21 : 180,
    profile.commitmentAccepted ? 128 : 83,
    profile.commitmentAccepted ? 61 : 9
  );
  doc.text(
    fitLines(doc, commitmentText, contentWidth - 52, 1),
    marginX + 48,
    cursorY + 19.8
  );

  // Recent Evaluation History Mini-Table
  cursorY += 29;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.text(
    sanitizePdfText('Últimos intentos registrados en la Evaluación Diagnóstica:'),
    marginX,
    cursorY
  );

  cursorY += 2.5;
  if (historyList.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, cursorY, contentWidth, 10, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText(
        'Aún no se registran intentos en la evaluación interactiva de 10 escenarios. Preséntala en la sección Evaluación para consolidar la aprobación.'
      ),
      marginX + 3.5,
      cursorY + 6.2
    );
  } else {
    const hHeader = 6.8;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(marginX, cursorY, contentWidth, hHeader, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Fecha', marginX + 3, cursorY + 4.6);
    doc.text('Ficha', marginX + 28, cursorY + 4.6);
    doc.text('Global', marginX + 54, cursorY + 4.6);
    doc.text('Identidad', marginX + 75, cursorY + 4.6);
    doc.text('Valores', marginX + 98, cursorY + 4.6);
    doc.text('Derechos', marginX + 119, cursorY + 4.6);
    doc.text('Deberes', marginX + 141, cursorY + 4.6);
    doc.text('Juicio', marginX + 161, cursorY + 4.6);

    const hRow = 6.5;
    historyList.forEach((attempt, idx) => {
      const y = cursorY + hHeader + idx * hRow;
      doc.setFillColor(idx % 2 === 1 ? 248 : 255, idx % 2 === 1 ? 250 : 255, idx % 2 === 1 ? 252 : 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, contentWidth, hRow, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      doc.text(sanitizePdfText(formatShortDate(attempt.createdAtMs)), marginX + 3, y + 4.4);

      doc.setFont('courier', 'normal');
      doc.text(sanitizePdfText(attempt.fichaCode), marginX + 28, y + 4.4);

      doc.setFont('courier', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${attempt.score}%`, marginX + 54, y + 4.4);

      doc.setFont('courier', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${attempt.dimIdentity}%`, marginX + 75, y + 4.4);
      doc.text(`${attempt.dimValues}%`, marginX + 98, y + 4.4);
      doc.text(`${attempt.dimRights}%`, marginX + 119, y + 4.4);
      doc.text(`${attempt.dimDuties}%`, marginX + 141, y + 4.4);

      doc.setFont('helvetica', 'bold');
      if (attempt.passed) {
        doc.setTextColor(21, 128, 61);
        doc.text('Aprobado (A)', marginX + 161, y + 4.4);
      } else {
        doc.setTextColor(180, 83, 9);
        doc.text('Refuerzo (D)', marginX + 161, y + 4.4);
      }
    });
  }

  // =========================================================================
  // INSTITUTIONAL FOOTER & VECTOR VERIFICATION MATRIX
  // =========================================================================
  const footerY = 266;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY, marginX + contentWidth, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizePdfText(
      'Servicio Nacional de Aprendizaje SENA · Resumen Personal de Trayectoria de Inducción'
    ),
    marginX,
    footerY + 5.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText(
      'Soporte académico personal del aprendiz. Formación Profesional Integral Gratuita — Colombia.'
    ),
    marginX,
    footerY + 10.2
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text(
    sanitizePdfText(`Código de verificación digital: ${verification.code}`),
    marginX,
    footerY + 15.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(sanitizePdfText('Página 1 de 1'), marginX, footerY + 19.6);

  // 7x7 Vector Verification Matrix (matches digital credential)
  const matrixSize = 16.5;
  const matrixX = marginX + contentWidth - matrixSize;
  const matrixY = footerY + 3.2;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(matrixX, matrixY, matrixSize, matrixSize, 1.5, 1.5, 'F');

  const cellStep = 2.0;
  const cellBox = 1.55;
  const pad = 1.45;
  verification.bits.forEach((active, i) => {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const isCornerAnchor =
      (col <= 1 && row <= 1) || (col >= 5 && row <= 1) || (col <= 1 && row >= 5);
    if (!active && !isCornerAnchor) return;
    if (isCornerAnchor) {
      doc.setFillColor(21, 128, 61);
    } else {
      doc.setFillColor(15, 23, 42);
    }
    doc.rect(
      matrixX + pad + col * cellStep,
      matrixY + pad + row * cellStep,
      cellBox,
      cellBox,
      'F'
    );
  });

  const safeCodeSlug = effectiveCode
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'aprendiz';

  doc.save(`resumen-trayectoria-induccion-sena-${safeCodeSlug}.pdf`);
}
