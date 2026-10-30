import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  IdCard,
  Save,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import {
  buildDefaultGfpiF165,
  computeSuggestedStageDates,
  generateGfpiFilingCode,
  type ApprenticeProfileData,
  type FichaRecord,
  type GfpiF165Data,
  type GfpiF165Record,
} from '../lib/inductionStore';
import {
  SCHEMA_LIMITS,
  validateGfpiF165Input,
  type GfpiCompanySectorType,
  type GfpiDocumentType,
  type GfpiProcedureType,
  type GfpiStatusType,
  type JornadaType,
  type ProductiveAltType,
  type TrainingLevelType,
} from '../lib/validation';
import {
  SENA_OFFICIAL_ESCUDO_URL,
  SENA_OFFICIAL_LOGO_DATA_URI,
  SenaEscudo,
  SenaLogo,
} from './SenaLogo';

interface GfpiF165FormProps {
  user: User | null;
  profile: ApprenticeProfileData;
  activeFichas: FichaRecord[];
  selectedFicha: FichaRecord | null;
  savedSubmission: GfpiF165Record | null;
  isSaving: boolean;
  onSaveSubmission: (data: GfpiF165Data) => Promise<void>;
  onNavigate: (view: 'derechos' | 'perfil' | 'evaluacion') => void;
  onRequestSignIn: () => void;
}

type FormViewMode = 'diligenciar' | 'documento';

interface ProductiveAlternativeSpec {
  value: ProductiveAltType;
  code: string;
  shortTitle: string;
  normativeBasis: string;
  summary: string;
  arlAndSupport: string;
  requiredDocs: string;
}

export const GFPI_165_ALTERNATIVES_CATALOG: readonly ProductiveAlternativeSpec[] = [
  {
    value: 'Contrato de Aprendizaje Laboral Especial (Dec. 0223/2026)',
    code: 'ALT-01',
    shortTitle: 'Contrato de Aprendizaje Laboral Especial',
    normativeBasis: 'Ley 2466/2025 Art. 21 · Decreto 0223 de 2026 · Acuerdo 009/2024 Art. 26',
    summary:
      'Práctica formativa remunerada en empresa patrocinadora bajo contrato laboral especial a término fijo, ejecutando actividades directamente alineadas con las competencias de tu programa.',
    arlAndSupport:
      'Remuneración legal vigente, afiliación obligatoria a ARL, salud y cotización pensional conforme a la normatividad 2026.',
    requiredDocs:
      'Registro activo en SGVA / Caprendizaje, minuta contractual registrada y formato GFPI-F-165 radicado.',
  },
  {
    value: 'Vínculo Formativo o Laboral',
    code: 'ALT-02',
    shortTitle: 'Vínculo Formativo o Relación Laboral Vigente',
    normativeBasis: 'Acuerdo 009 de 2024 Art. 26 · Guía de Etapa Productiva GFPI-G-040',
    summary:
      'Validación de prácticas cuando el aprendiz ya cuenta con contrato laboral o vinculación formativa y desempeña funciones afines a los resultados de aprendizaje del programa.',
    arlAndSupport:
      'Salario u honorarios y cobertura integral de Seguridad Social y ARL asumidos por la entidad empleadora.',
    requiredDocs:
      'Certificación laboral con funciones específicas, copia de afiliación ARL/EPS y aval previo de Coordinación Académica.',
  },
  {
    value: 'Proyecto Productivo / Fondo Emprender',
    code: 'ALT-03',
    shortTitle: 'Proyecto Productivo, Unidad Productiva o Fondo Emprender',
    normativeBasis: 'Acuerdo 009 de 2024 Art. 26 · Ruta SENA Emprende Rural / SBDC',
    summary:
      'Formulación, puesta en marcha o fortalecimiento de una empresa, prototipo funcional o plan de negocio acompañado por emprendimiento SENA o Fondo Emprender.',
    arlAndSupport:
      'Afiliación a ARL gestionada por el Centro de Formación SENA cuando no exista patrocinio externo.',
    requiredDocs:
      'Plan de trabajo del proyecto productivo validado técnicamente y cronograma de entregables quincenales.',
  },
  {
    value: 'Prácticas Economía Popular / CampeSENA',
    code: 'ALT-04',
    shortTitle: 'Prácticas en Economía Popular, Comunitaria o CampeSENA',
    normativeBasis: 'Acuerdo 009 de 2024 Art. 26 · Estrategia CampeSENA y Economía Popular',
    summary:
      'Transferencia tecnológica, organizativa o productiva en asociaciones campesinas, juntas comunitarias, cooperativas o unidades de la economía popular y solidaria.',
    arlAndSupport:
      'Cobertura de ARL previa al inicio gestionada según lineamiento institucional de prácticas solidarias.',
    requiredDocs:
      'Carta de intención de la organización comunitaria o unidad campesina y plan de actividades concertado.',
  },
  {
    value: 'Monitoría SENA',
    code: 'ALT-05',
    shortTitle: 'Monitoría Académica, Tecnológica o Investigativa SENA',
    normativeBasis: 'Acuerdo 009 de 2024 Art. 26 · Convocatoria Bienestar al Aprendiz / SENNOVA',
    summary:
      'Apoyo formativo en ambientes especializados, semilleros de investigación SENNOVA, Tecnoacademia, Tecnoparque o programas de Bienestar dentro del Centro de Formación.',
    arlAndSupport:
      'Estímulo económico mensual reglamentario por horas de monitoría y cobertura ARL institucional.',
    requiredDocs:
      'Resolución de selección en convocatoria oficial del Centro de Formación y plan de monitoría.',
  },
  {
    value: 'Pasantía Institucional',
    code: 'ALT-06',
    shortTitle: 'Pasantía en Entidad Pública, MIPYME u ONG',
    normativeBasis: 'Acuerdo 009 de 2024 Art. 26 · Decreto 055 de 2015 (ARL Estudiantes)',
    summary:
      'Práctica concertada mediante convenio o carta de entendimiento con alcaldías, entidades estatales, MIPYMES, fundaciones u organizaciones sin ánimo de lucro.',
    arlAndSupport:
      'Afiliación obligatoria a ARL antes del primer día de práctica (por la entidad o por el SENA según convenio).',
    requiredDocs:
      'Carta de aceptación de la entidad coformadora, certificado ARL vigente y formato GFPI-F-165 firmado.',
  },
] as const;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateDisplay(isoOrMs: string | number): string {
  if (typeof isoOrMs === 'number') {
    try {
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(isoOrMs));
    } catch {
      return '2026';
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrMs)) {
    return isoOrMs;
  }
  return '—';
}

function getStatusDisplay(status: GfpiStatusType): {
  label: string;
  toneClass: string;
} {
  switch (status) {
    case 'validado_coordinacion':
      return {
        label: '★ Validado por Coordinación Académica',
        toneClass: 'text-emerald-800 dark:text-emerald-400 font-semibold',
      };
    case 'radicado':
      return {
        label: '✓ Radicado digitalmente en Inducción',
        toneClass: 'text-emerald-800 dark:text-emerald-400 font-semibold',
      };
    default:
      return {
        label: '◐ Borrador en construcción',
        toneClass: 'text-amber-800 dark:text-amber-300 font-semibold',
      };
  }
}

export function GfpiF165Form({
  user,
  profile,
  activeFichas,
  selectedFicha,
  savedSubmission,
  isSaving,
  onSaveSubmission,
  onNavigate,
  onRequestSignIn,
}: GfpiF165FormProps) {
  const [viewMode, setViewMode] = useState<FormViewMode>('diligenciar');
  const [formState, setFormState] = useState<GfpiF165Data>(() => {
    if (savedSubmission) {
      const {
        userId: _u,
        instructorId: _i,
        createdAtMs: _c,
        updatedAtMs: _up,
        ...rest
      } = savedSubmission;
      return rest;
    }
    return buildDefaultGfpiF165(profile, selectedFicha);
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync incoming saved submission or profile defaults when not yet saved
  useEffect(() => {
    if (savedSubmission) {
      const {
        userId: _u,
        instructorId: _i,
        createdAtMs: _c,
        updatedAtMs: _up,
        ...rest
      } = savedSubmission;
      setFormState(rest);
      return;
    }

    setFormState((prev) => ({
      ...prev,
      fichaId: selectedFicha ? selectedFicha.id : profile.selectedFichaId,
      apprenticeName: prev.apprenticeName || profile.apprenticeName,
      documentCode: profile.documentCode || prev.documentCode,
      contactEmail: prev.contactEmail || user?.email || '',
      fichaCode: selectedFicha ? selectedFicha.fichaCode : prev.fichaCode,
      programName: selectedFicha ? selectedFicha.programName : prev.programName,
      trainingLevel: profile.trainingLevel,
      regionalCenter: selectedFicha
        ? selectedFicha.centerName
        : profile.regionalCenter,
      jornada: selectedFicha ? selectedFicha.jornada : prev.jornada,
      selectedAlternative: profile.preferredProductiveAlt,
      filingCode: generateGfpiFilingCode(
        profile.documentCode || prev.documentCode,
        selectedFicha ? selectedFicha.fichaCode : prev.fichaCode
      ),
    }));
  }, [savedSubmission, profile, selectedFicha, user?.email]);

  const activeAltSpec = useMemo(
    () =>
      GFPI_165_ALTERNATIVES_CATALOG.find(
        (item) => item.value === formState.selectedAlternative
      ) ?? GFPI_165_ALTERNATIVES_CATALOG[0],
    [formState.selectedAlternative]
  );

  const isLocked = savedSubmission?.status === 'validado_coordinacion';
  const effectiveStatus: GfpiStatusType = savedSubmission
    ? savedSubmission.status
    : formState.status;
  const statusMeta = getStatusDisplay(effectiveStatus);

  function handleSelectFichaLink(nextFichaId: string) {
    const matched = activeFichas.find((f) => f.id === nextFichaId) ?? null;
    if (!matched) {
      setFormState((prev) => ({
        ...prev,
        fichaId: '',
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      fichaId: matched.id,
      fichaCode: matched.fichaCode,
      programName: matched.programName,
      regionalCenter: matched.centerName,
      jornada: matched.jornada,
      filingCode: generateGfpiFilingCode(prev.documentCode, matched.fichaCode),
    }));
  }

  function handleRecalculateDates() {
    const startRef = /^\d{4}-\d{2}-\d{2}$/.test(formState.lectivaStartDate)
      ? formState.lectivaStartDate
      : '2026-02-02';
    const computed = computeSuggestedStageDates(formState.trainingLevel, startRef);
    setFormState((prev) => ({
      ...prev,
      ...computed,
    }));
    setErrorMsg(null);
    setSuccessMsg(
      `Cronograma estimado recalculado según nivel ${formState.trainingLevel}.`
    );
  }

  async function handlePersist(targetStatus: 'borrador' | 'radicado') {
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextFilingCode = generateGfpiFilingCode(
      formState.documentCode,
      formState.fichaCode
    );

    const candidate: GfpiF165Data = {
      ...formState,
      filingCode: nextFilingCode,
      status: targetStatus,
    };

    const validation = validateGfpiF165Input(candidate);
    if (!validation.valid) {
      setErrorMsg(
        validation.error ?? 'Verifica los campos requeridos del formato GFPI-F-165.'
      );
      return;
    }

    try {
      await onSaveSubmission(candidate);
      setFormState(candidate);
      setSuccessMsg(
        targetStatus === 'radicado'
          ? `Formato GFPI-F-165 radicado exitosamente con código ${nextFilingCode} y sincronizado con tu perfil.`
          : 'Borrador del formato GFPI-F-165 guardado y sincronizado con tu perfil.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No fue posible guardar el formato GFPI-F-165.'
      );
    }
  }

  function handleDownloadOfficialHtml() {
    const safeName =
      formState.apprenticeName.trim() ||
      user?.displayName ||
      'Aprendiz en Inducción';
    const filing =
      formState.filingCode ||
      generateGfpiFilingCode(formState.documentCode, formState.fichaCode);

    const alternativesRowsHtml = GFPI_165_ALTERNATIVES_CATALOG.map((alt) => {
      const checked = alt.value === formState.selectedAlternative;
      return `<tr>
        <td style="text-align:center;font-family:ui-monospace,monospace;font-weight:700;font-size:14px;color:${
          checked ? '#15803d' : '#64748b'
        };">${checked ? '[ X ]' : '[ &nbsp; ]'}</td>
        <td>
          <div style="font-weight:700;color:#0f172a;">${escapeHtml(alt.value)}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">${escapeHtml(
            alt.normativeBasis
          )} — ${escapeHtml(alt.summary)}</div>
        </td>
      </tr>`;
    }).join('');

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Formato GFPI-F-165 - ${escapeHtml(filing)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 28px; }
    .sheet { max-width: 880px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; padding: 28px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
    .sec-title { background: #15803d; color: #ffffff; font-weight: 700; padding: 7px 10px; font-size: 12px; margin: 16px 0 0 0; border: 1px solid #15803d; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .muted { color: #475569; font-size: 11px; }
    @media print { body { background: #ffffff; padding: 0; } .sheet { border: none; padding: 12px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <table>
      <tr>
        <td style="width:18%;text-align:center;vertical-align:middle;">
          <img src="${SENA_OFFICIAL_LOGO_DATA_URI}" alt="Logosímbolo SENA" width="54" height="54" />
        </td>
        <td style="width:54%;text-align:center;vertical-align:middle;">
          <div style="font-weight:700;font-size:13px;">SERVICIO NACIONAL DE APRENDIZAJE — SENA</div>
          <div style="font-size:11px;color:#334155;margin-top:2px;">SISTEMA INTEGRADO DE GESTIÓN Y AUTOCONTROL · PROCESO GESTIÓN DE FORMACIÓN PROFESIONAL INTEGRAL</div>
          <div style="font-weight:700;font-size:13px;color:#15803d;margin-top:6px;">FORMATO DE SELECCIÓN Y MODIFICACIÓN DE ALTERNATIVA DE ETAPA PRODUCTIVA</div>
        </td>
        <td style="width:28%;font-size:11px;">
          <div><strong>Código:</strong> <span class="mono">GFPI-F-165</span></div>
          <div><strong>Versión:</strong> <span class="mono">04 · Vigencia 2026</span></div>
          <div><strong>Radicado:</strong> <span class="mono">${escapeHtml(filing)}</span></div>
          <div><strong>Estado:</strong> ${escapeHtml(
            formState.status === 'radicado' ? 'Radicado' : 'Borrador'
          )}</div>
          <div style="margin-top:6px;text-align:right;">
            <img src="${SENA_OFFICIAL_ESCUDO_URL}" alt="Escudo SENA" width="32" height="32" style="object-fit:contain;" />
          </div>
        </td>
      </tr>
    </table>

    <div class="sec-title">1. DATOS BÁSICOS DEL APRENDIZ Y PROGRAMA DE FORMACIÓN</div>
    <table>
      <tr>
        <th style="width:25%;">Tipo de Trámite</th>
        <td style="width:25%;">${escapeHtml(formState.procedureType)}</td>
        <th style="width:25%;">Fecha de Diligenciamiento</th>
        <td style="width:25%;" class="mono">${escapeHtml(
          new Date().toISOString().slice(0, 10)
        )}</td>
      </tr>
      <tr>
        <th>Nombre Completo del Aprendiz</th>
        <td>${escapeHtml(safeName)}</td>
        <th>Documento / Registro</th>
        <td class="mono">${escapeHtml(formState.documentType)} · ${escapeHtml(
      formState.documentCode
    )}</td>
      </tr>
      <tr>
        <th>Correo Electrónico</th>
        <td>${escapeHtml(formState.contactEmail || 'No registrado')}</td>
        <th>Teléfono / Dirección</th>
        <td>${escapeHtml(formState.contactPhone || '—')}${
      formState.residenceAddress.trim()
        ? ` · ${escapeHtml(formState.residenceAddress)}`
        : ''
    }</td>
      </tr>
      <tr>
        <th>Ficha de Caracterización</th>
        <td class="mono">${escapeHtml(formState.fichaCode)}</td>
        <th>Nivel y Jornada</th>
        <td>${escapeHtml(formState.trainingLevel)} · Jornada ${escapeHtml(
      formState.jornada
    )}</td>
      </tr>
      <tr>
        <th>Programa de Formación</th>
        <td colspan="3">${escapeHtml(formState.programName)}</td>
      </tr>
      <tr>
        <th>Regional y Centro de Formación</th>
        <td colspan="3">${escapeHtml(formState.regionalCenter)}</td>
      </tr>
      <tr>
        <th>Inicio / Fin Etapa Lectiva</th>
        <td class="mono">${escapeHtml(formState.lectivaStartDate)} a ${escapeHtml(
      formState.lectivaEndDate
    )}</td>
        <th>Inicio / Fin Etapa Productiva</th>
        <td class="mono">${escapeHtml(formState.productivaStartDate)} a ${escapeHtml(
      formState.productivaEndDate
    )}</td>
      </tr>
    </table>

    <div class="sec-title">2. SELECCIÓN DE ALTERNATIVA PARA DESARROLLAR LA ETAPA PRODUCTIVA (Acuerdo 009/2024 · Dec. 0223/2026)</div>
    <table>
      <thead>
        <tr>
          <th style="width:12%;text-align:center;">Selección</th>
          <th style="width:88%;">Alternativa Reglamentaria SENA</th>
        </tr>
      </thead>
      <tbody>
        ${alternativesRowsHtml}
      </tbody>
    </table>

    <div class="sec-title">3. PROYECCIÓN DE ENTIDAD COFORMADORA O PROYECTO Y SUSTENTACIÓN</div>
    <table>
      <tr>
        <th style="width:25%;">Sector Económico</th>
        <td style="width:25%;">${escapeHtml(formState.companySector)}</td>
        <th style="width:25%;">NIT / Referencia</th>
        <td style="width:25%;" class="mono">${escapeHtml(
          formState.companyNit || 'Por definir en Etapa Lectiva'
        )}</td>
      </tr>
      <tr>
        <th>Entidad Coformadora o Proyecto</th>
        <td>${escapeHtml(
          formState.companyName || 'Por definir antes del inicio de Etapa Productiva'
        )}</td>
        <th>Ciudad y Contacto Empresarial</th>
        <td>${escapeHtml(formState.companyCity || 'Colombia')}${
      formState.companyContactName.trim()
        ? ` · ${escapeHtml(formState.companyContactName)}`
        : ''
    }</td>
      </tr>
      <tr>
        <th>Sustentación / Observaciones del Aprendiz</th>
        <td colspan="3">${escapeHtml(
          formState.alternativeJustification ||
            'Selección inicial proyectada durante el proceso de Inducción SENA.'
        )}</td>
      </tr>
    </table>

    <div class="sec-title">4. COMPROMISO DEL APRENDIZ Y ESPACIO DE VALIDACIÓN INSTITUCIONAL</div>
    <table>
      <tr>
        <td style="width:50%;">
          <strong>Declaración, Ley 1581/2012 y Firma del Aprendiz:</strong>
          <p class="muted" style="margin:6px 0;">
            Manifiesto conocer el Reglamento del Aprendiz vigente (Acuerdo 009 de 2024, modificado por Acuerdo 002 de 2026, y Decreto 0223 de 2026), autorizo el tratamiento institucional de mis datos personales conforme a la Ley 1581 de 2012 y asumo el deber de gestionar el aval previo y presentar bitácoras quincenales de Etapa Productiva.
          </p>
          <div style="margin-top:14px;padding-top:8px;border-top:1px solid #94a3b8;">
            <strong>${escapeHtml(safeName)}</strong><br/>
            <span class="mono muted">${escapeHtml(
              formState.documentType
            )} ${escapeHtml(formState.documentCode)} · ${
      formState.apprenticeSignatureAccepted
        ? 'Firmado digitalmente por el aprendiz'
        : 'Pendiente de firma'
    }</span>
          </div>
        </td>
        <td style="width:50%;">
          <strong>Validación Institucional Centro de Formación:</strong>
          <p class="muted" style="margin:6px 0;">
            Espacio reservado exclusivamente para revisión y aval formal de Coordinación Académica y el área de Seguimiento a Etapa Productiva del Centro de Formación SENA.
          </p>
          <div style="margin-top:14px;padding-top:8px;border-top:1px solid #94a3b8;">
            <span class="muted">Coordinación Académica · Seguimiento Etapa Productiva</span><br/>
            <span class="mono muted">Código Formato: GFPI-F-165 · V04</span>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `formato-gfpi-f-165-${(
      formState.documentCode || 'aprendiz'
    ).toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Official SENA Document Control Header */}
      <section
        aria-label="Encabezado oficial del formato GFPI-F-165"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Brand Block */}
          <div className="lg:col-span-3 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <SenaLogo className="w-9 h-9" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 flex items-center justify-center shrink-0">
              <SenaEscudo className="w-9 h-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                GFPI-F-165
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SIGA · Versión 04
              </p>
            </div>
          </div>

          {/* Center Title Block */}
          <div className="lg:col-span-6 p-6 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Proceso Gestión de Formación Profesional Integral</span>
              <span aria-hidden="true">·</span>
              <span>Diligenciamiento desde Inducción</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight balance-text">
              Formato de Selección y Modificación de Alternativa de Etapa Productiva
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Registra desde la inducción la alternativa con la que proyectas realizar tus prácticas formativas conforme al Acuerdo 009 de 2024 (Art. 26) y el Decreto 0223 de 2026. Podrás actualizarla o tramitar modificación antes de iniciar tu Etapa Productiva.
            </p>
          </div>

          {/* Right Filing Metadata Block */}
          <div className="lg:col-span-3 p-6 flex flex-col justify-between space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Radicado:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {formState.filingCode}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Trámite:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {formState.procedureType === 'Selección Inicial (Inducción)'
                  ? 'Selección Inicial'
                  : 'Modificación'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className={statusMeta.toneClass}>{statusMeta.label}</span>
            </div>
          </div>
        </div>

        {/* Action & View Switcher Subbar */}
        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Modo de visualización del formato GFPI-F-165"
            className="inline-flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'diligenciar'}
              onClick={() => setViewMode('diligenciar')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'diligenciar'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Diligenciar Formato
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'documento'}
              onClick={() => setViewMode('documento')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'documento'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vista Documento Oficial
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!user && (
              <button
                type="button"
                onClick={onRequestSignIn}
                className="text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Respaldar en nube con Google (opcional)
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadOfficialHtml}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar GFPI-F-165 (.html)
            </button>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FORM MODE */}
      {viewMode === 'diligenciar' && (
        <div className="space-y-8">
          {/* Section 1: Apprentice, Program & Stage Dates */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                  Sección 01 · Identificación Académica
                </p>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Datos del Aprendiz, Ficha y Cronograma de Etapas
                </h2>
              </div>

              <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {SCHEMA_LIMITS.gfpi165.procedureType.allowed.map((proc) => (
                  <button
                    key={proc}
                    type="button"
                    disabled={isLocked}
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        procedureType: proc as GfpiProcedureType,
                      }))
                    }
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      formState.procedureType === proc
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {proc}
                  </button>
                ))}
              </div>
            </div>

            {activeFichas.length > 0 && (
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <label className="space-y-1.5 block max-w-xl">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Autocompletar desde Ficha de Caracterización activa
                  </span>
                  <select
                    disabled={isLocked}
                    value={formState.fichaId}
                    onChange={(e) => handleSelectFichaLink(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Diligenciamiento manual sin Ficha vinculada</option>
                    {activeFichas.map((f) => (
                      <option key={f.id} value={f.id}>
                        Ficha {f.fichaCode} · {f.programName} ({f.jornada})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <label className="space-y-1.5 block md:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre completo del aprendiz
                </span>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  minLength={SCHEMA_LIMITS.apprenticeName.minLength}
                  maxLength={SCHEMA_LIMITS.apprenticeName.maxLength}
                  value={formState.apprenticeName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      apprenticeName: e.target.value,
                    }))
                  }
                  placeholder="Nombres y apellidos completos"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipo de documento
                </span>
                <select
                  disabled={isLocked}
                  value={formState.documentType}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      documentType: e.target.value as GfpiDocumentType,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {SCHEMA_LIMITS.gfpi165.documentType.allowed.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Número documento / Código carné
                </span>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  minLength={SCHEMA_LIMITS.documentCode.minLength}
                  maxLength={SCHEMA_LIMITS.documentCode.maxLength}
                  value={formState.documentCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormState((prev) => ({
                      ...prev,
                      documentCode: val,
                      filingCode: generateGfpiFilingCode(val, prev.fichaCode),
                    }));
                  }}
                  placeholder="Ej. APR-102400 o 1032456789"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>

              <label className="space-y-1.5 block md:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Correo electrónico de contacto
                </span>
                <input
                  type="email"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.contactEmail.maxLength}
                  value={formState.contactEmail}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                  placeholder="aprendiz@soy.sena.edu.co o correo personal"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Teléfono / Celular de contacto
                </span>
                <input
                  type="tel"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.contactPhone.maxLength}
                  value={formState.contactPhone}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      contactPhone: e.target.value,
                    }))
                  }
                  placeholder="Ej. 300 412 8890"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dirección y municipio residencia
                </span>
                <input
                  type="text"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.residenceAddress.maxLength}
                  value={formState.residenceAddress}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      residenceAddress: e.target.value,
                    }))
                  }
                  placeholder="Ej. Cra 45 #12-30 · Medellín"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Número de Ficha
                </span>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  minLength={SCHEMA_LIMITS.fichaCode.minLength}
                  maxLength={SCHEMA_LIMITS.fichaCode.maxLength}
                  value={formState.fichaCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormState((prev) => ({
                      ...prev,
                      fichaCode: val,
                      filingCode: generateGfpiFilingCode(prev.documentCode, val),
                    }));
                  }}
                  placeholder="Ej. 2874590"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nivel de formación
                </span>
                <select
                  disabled={isLocked}
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

              <label className="space-y-1.5 block md:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Programa de Formación
                </span>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  minLength={SCHEMA_LIMITS.programName.minLength}
                  maxLength={SCHEMA_LIMITS.programName.maxLength}
                  value={formState.programName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      programName: e.target.value,
                    }))
                  }
                  placeholder="Ej. Análisis y Desarrollo de Software"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block md:col-span-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Regional y Centro de Formación SENA
                </span>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  minLength={SCHEMA_LIMITS.profile.regionalCenter.minLength}
                  maxLength={SCHEMA_LIMITS.profile.regionalCenter.maxLength}
                  value={formState.regionalCenter}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      regionalCenter: e.target.value,
                    }))
                  }
                  placeholder="Ej. Centro de Servicios y Gestión Empresarial · Regional Antioquia"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jornada académica
                </span>
                <select
                  disabled={isLocked}
                  value={formState.jornada}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      jornada: e.target.value as JornadaType,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {SCHEMA_LIMITS.jornada.allowed.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Stage Dates Sub-grid */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Cronograma Estimado de Etapa Lectiva y Etapa Productiva
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fechas proyectadas de tu programa (6 meses de práctica para Técnico/Tecnólogo; 3 meses para Operario/Auxiliar).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleRecalculateDates}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Calcular fechas sugeridas
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="space-y-1 block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Inicio Etapa Lectiva
                  </span>
                  <input
                    type="date"
                    required
                    disabled={isLocked}
                    value={formState.lectivaStartDate}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        lectivaStartDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fin Etapa Lectiva
                  </span>
                  <input
                    type="date"
                    required
                    disabled={isLocked}
                    value={formState.lectivaEndDate}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        lectivaEndDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Inicio Etapa Productiva
                  </span>
                  <input
                    type="date"
                    required
                    disabled={isLocked}
                    value={formState.productivaStartDate}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        productivaStartDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fin Etapa Productiva
                  </span>
                  <input
                    type="date"
                    required
                    disabled={isLocked}
                    value={formState.productivaEndDate}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        productivaEndDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Section 2: Interactive Selection of the 6 Official Productive Stage Alternatives */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
              <p className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                Sección 02 · Alternativas Reglamentarias SENA (Acuerdo 009/2024 Art. 26 · Dec. 0223/2026)
              </p>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Selecciona una (1) Alternativa para Desarrollar tus Prácticas
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Haz clic sobre la alternativa que deseas registrar en el formato GFPI-F-165. Tu selección actualiza automáticamente la casilla oficial <span className="font-mono font-semibold">[ X ]</span> y la Etapa Productiva proyectada en tu perfil de aprendiz.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Alternativas de Etapa Productiva GFPI-F-165"
              className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800"
            >
              {GFPI_165_ALTERNATIVES_CATALOG.map((alt) => {
                const isSelected = formState.selectedAlternative === alt.value;
                return (
                  <button
                    key={alt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isLocked}
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        selectedAlternative: alt.value,
                      }))
                    }
                    className={`w-full text-left py-4 px-4 sm:px-5 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 max-w-3xl">
                      <span
                        aria-hidden="true"
                        className={`font-mono text-sm font-bold shrink-0 mt-0.5 tabular-nums ${
                          isSelected
                            ? 'text-[#15803d] dark:text-[#4ade80]'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {isSelected ? '[ X ]' : '[   ]'}
                      </span>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                            {alt.code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{alt.normativeBasis}</span>
                        </div>
                        <p className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                          {alt.value}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {alt.summary}
                        </p>
                      </div>
                    </div>

                    <div className="lg:w-72 shrink-0 text-xs text-slate-600 dark:text-slate-300 lg:text-right space-y-1 pl-9 lg:pl-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Condición y cobertura ARL
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        {alt.arlAndSupport}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Alternative Requirements Footnote */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  Soportes requeridos al iniciar {activeAltSpec.shortTitle}:{' '}
                </strong>
                <span>{activeAltSpec.requiredDocs}</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('derechos')}
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                Consultar Art. 26 Reglamento
              </button>
            </div>
          </section>

          {/* Section 3: Co-training Entity / Project Projection & Justification */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
              <p className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400 tabular-nums">
                Sección 03 · Proyección de Escenario de Práctica (Opcional en Inducción)
              </p>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Entidad Coformadora, Unidad Productiva o Sustentación
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Si aún no tienes empresa patrocinadora o proyecto asignado durante la semana de inducción, conserva el sector en &ldquo;Por definir en Etapa Lectiva&rdquo; y describe brevemente tu interés formativo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sector económico proyectado
                </span>
                <select
                  disabled={isLocked}
                  value={formState.companySector}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      companySector: e.target.value as GfpiCompanySectorType,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {SCHEMA_LIMITS.gfpi165.companySector.allowed.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 block md:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre de empresa, entidad o idea de proyecto (opcional)
                </span>
                <input
                  type="text"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.companyName.maxLength}
                  value={formState.companyName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
                  }
                  placeholder="Ej. Empresa patrocinadora, semillero SENNOVA o proyecto propio"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  NIT o código referencia (opcional)
                </span>
                <input
                  type="text"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.companyNit.maxLength}
                  value={formState.companyNit}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      companyNit: e.target.value,
                    }))
                  }
                  placeholder="Ej. 900123456-7"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ciudad o municipio de práctica
                </span>
                <input
                  type="text"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.companyCity.maxLength}
                  value={formState.companyCity}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      companyCity: e.target.value,
                    }))
                  }
                  placeholder="Ej. Bogotá D.C., Medellín, Cali..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contacto o jefe inmediato (opcional)
                </span>
                <input
                  type="text"
                  disabled={isLocked}
                  maxLength={SCHEMA_LIMITS.gfpi165.companyContactName.maxLength}
                  value={formState.companyContactName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      companyContactName: e.target.value,
                    }))
                  }
                  placeholder="Ej. Ing. Coordinador Coformador"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1.5 block md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sustentación de la alternativa o proyección formativa
                  </span>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {formState.alternativeJustification.length} /{' '}
                    {SCHEMA_LIMITS.gfpi165.alternativeJustification.maxLength}
                  </span>
                </div>
                <textarea
                  rows={2}
                  disabled={isLocked}
                  maxLength={
                    SCHEMA_LIMITS.gfpi165.alternativeJustification.maxLength
                  }
                  value={formState.alternativeJustification}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      alternativeJustification: e.target.value,
                    }))
                  }
                  placeholder="Explica brevemente por qué esta alternativa se ajusta a tus metas técnicas, laborales o de emprendimiento..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
          </section>

          {/* Section 4: Apprentice Digital Declaration & Filing Actions */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <FileCheck2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Declaración, Firma Digital del Aprendiz y Radicación
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Para radicar formalmente el formato GFPI-F-165 desde la inducción, confirma la declaración reglamentaria. También puedes guardar borrador en cualquier momento.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={isLocked}
                checked={formState.apprenticeSignatureAccepted}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    apprenticeSignatureAccepted: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#15803d] focus:ring-[#15803d]"
              />
              <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                Declaro como aprendiz SENA que selecciono libremente la alternativa{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {formState.selectedAlternative}
                </strong>
                , autorizo el tratamiento institucional de mis datos personales conforme a la Ley 1581 de 2012, y reconozco mi deber de gestionar el aval previo ante Coordinación Académica antes de iniciar prácticas, verificar mi cobertura de ARL y presentar oportunamente las bitácoras quincenales de seguimiento (Acuerdo 009 de 2024, Acuerdo 002 de 2026 y Decreto 0223 de 2026).
              </span>
            </label>

            {errorMsg && (
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                ▲ {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                ✓ {successMsg}
              </p>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>
                  Sincronización automática con tu Carné Digital y Ficha de Caracterización.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('perfil')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <IdCard className="w-4 h-4" />
                  Ir a Mi Perfil
                </button>

                <button
                  type="button"
                  disabled={isSaving || isLocked}
                  onClick={() => void handlePersist('borrador')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Guardar borrador
                </button>

                <button
                  type="button"
                  disabled={isSaving || isLocked}
                  onClick={() => void handlePersist('radicado')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? 'Radicando...' : 'Radicar Formato GFPI-F-165'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* OFFICIAL SENA DOCUMENT PREVIEW MODE */}
      {viewMode === 'documento' && (
        <section
          aria-label="Vista previa oficial del documento GFPI-F-165"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 space-y-6"
        >
          {/* Official Table 1: Basic Info */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    colSpan={4}
                    className="bg-[#15803d] text-white font-bold py-2.5 px-4 text-left border border-[#15803d]"
                  >
                    1. DATOS BÁSICOS DEL APRENDIZ Y PROGRAMA DE FORMACIÓN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 w-1/4">
                    Tipo de Trámite
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-1/4">
                    {formState.procedureType}
                  </td>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 w-1/4">
                    Código Radicado
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums w-1/4">
                    {formState.filingCode}
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Aprendiz
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                    {formState.apprenticeName.trim() ||
                      user?.displayName ||
                      'Aprendiz en Inducción'}
                  </td>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Identificación / Registro
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {formState.documentType} · {formState.documentCode}
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Correo Electrónico
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    {formState.contactEmail.trim() || 'No registrado'}
                  </td>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Teléfono y Residencia
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <span className="font-mono tabular-nums">
                      {formState.contactPhone.trim() || '—'}
                    </span>
                    {formState.residenceAddress.trim()
                      ? ` · ${formState.residenceAddress}`
                      : ''}
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Número de Ficha
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {formState.fichaCode}
                  </td>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Nivel y Jornada
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    {formState.trainingLevel} · Jornada {formState.jornada}
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Programa de Formación
                  </th>
                  <td
                    colSpan={3}
                    className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {formState.programName}
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Centro y Regional
                  </th>
                  <td
                    colSpan={3}
                    className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {formState.regionalCenter}
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Etapa Lectiva
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatDateDisplay(formState.lectivaStartDate)} a{' '}
                    {formatDateDisplay(formState.lectivaEndDate)}
                  </td>
                  <th className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    Etapa Productiva
                  </th>
                  <td className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatDateDisplay(formState.productivaStartDate)} a{' '}
                    {formatDateDisplay(formState.productivaEndDate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Table 2: Alternatives Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    colSpan={3}
                    className="bg-[#15803d] text-white font-bold py-2.5 px-4 text-left border border-[#15803d]"
                  >
                    2. ALTERNATIVA SELECCIONADA PARA ETAPA PRODUCTIVA (MARQUE CON X)
                  </th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300">
                  <th className="py-2 px-3 border border-slate-200 dark:border-slate-800 w-24 text-center">
                    Selección
                  </th>
                  <th className="py-2 px-3 border border-slate-200 dark:border-slate-800 text-left">
                    Alternativa Reglamentaria
                  </th>
                  <th className="py-2 px-3 border border-slate-200 dark:border-slate-800 text-left">
                    Marco Normativo Vigente
                  </th>
                </tr>
              </thead>
              <tbody>
                {GFPI_165_ALTERNATIVES_CATALOG.map((alt) => {
                  const checked = alt.value === formState.selectedAlternative;
                  return (
                    <tr
                      key={alt.value}
                      className={
                        checked ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                      }
                    >
                      <td className="py-2.5 px-3 border border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-sm tabular-nums text-emerald-800 dark:text-emerald-400">
                        {checked ? '[ X ]' : '[   ]'}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                        {alt.value}
                      </td>
                      <td className="py-2.5 px-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        {alt.normativeBasis}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Table 3: Entity & Signatures */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    className="bg-[#15803d] text-white font-bold py-2.5 px-4 text-left border border-[#15803d]"
                  >
                    3. PROYECCIÓN DE ESCENARIO Y CONSTANCIA DE FIRMA DEL APRENDIZ
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 w-1/2 space-y-1.5 align-top">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Entidad coformadora o proyecto proyectado:
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {formState.companyName.trim() ||
                        'Por definir durante el desarrollo de la Etapa Lectiva'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Sector: {formState.companySector}
                      {formState.companyNit.trim()
                        ? ` · NIT ${formState.companyNit}`
                        : ''}
                      {formState.companyCity.trim()
                        ? ` · ${formState.companyCity}`
                        : ''}
                      {formState.companyContactName.trim()
                        ? ` · Contacto: ${formState.companyContactName}`
                        : ''}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 pt-1">
                      <strong>Sustentación: </strong>
                      {formState.alternativeJustification.trim() ||
                        'Selección inicial proyectada en jornada de inducción SENA.'}
                    </p>
                  </td>
                  <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 w-1/2 space-y-2 align-top">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Firma Digital del Aprendiz y Autorización Ley 1581/2012:
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {formState.apprenticeSignatureAccepted
                        ? '✓ Declaración reglamentaria y autorización de tratamiento de datos (Ley 1581 de 2012) suscritas digitalmente por el aprendiz.'
                        : '○ Pendiente de suscripción digital por parte del aprendiz.'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      Espacio institucional reservado para validación de Coordinación Académica y Seguimiento a Etapa Productiva del Centro de Formación.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setViewMode('diligenciar')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Volver a edición del formato
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadOfficialHtml}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Descargar Formato Oficial (.html)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('evaluacion')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#15803d] hover:bg-emerald-800 dark:bg-[#16a34a] dark:hover:bg-[#15803d] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Continuar a evaluación
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
