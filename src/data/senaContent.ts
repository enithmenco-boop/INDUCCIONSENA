import type { InductionModuleId } from '../lib/validation';
import heroCampusImg from '../assets/images/hero_sena_campus_1793115521436.jpg';
import identityCampusImg from '../assets/images/module_institutional_identity_1793115522861.jpg';
import rightsLibraryImg from '../assets/images/module_rights_duties_1793115523851.jpg';
import workshopSafetyImg from '../assets/images/module_safety_workshop_1793115525020.jpg';

export interface SymbolHotspot {
  id: 'piñon' | 'caduceo' | 'cafeto' | 'logosimbolo';
  title: string;
  sector: string;
  summary: string;
  pedagogicalMeaning: string;
  historicalContext: string;
  verificationQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export interface HymnStanza {
  id: string;
  label: string;
  title: string;
  lines: string[];
  meaning: string;
}

export interface InstitutionalValue {
  id: string;
  name: string;
  essence: string;
  doAction: string;
  avoidAction: string;
  scenarioQuestion: string;
  options: { label: string; isAligned: boolean; feedback: string }[];
}

export type RegulationAxis =
  | 'academico'
  | 'bienestar_inclusion'
  | 'participacion_debido_proceso'
  | 'seguridad_recursos'
  | 'etapa_productiva_certificacion';

export interface RegulationItem {
  id: string;
  numeral?: number;
  code: string;
  category: 'derechos' | 'deberes' | 'etapa_productiva';
  axis: RegulationAxis;
  axisLabel: string;
  title: string;
  description: string;
  practicalApplication: string;
  institutionalRoute: string;
}

export interface RegulationCase {
  id: string;
  title: string;
  context: string;
  categoryLabel: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    rationale: string;
  }[];
  institutionalRoute: string;
}

export interface EvaluationQuestion {
  id: string;
  number: number;
  dimension: InductionModuleId;
  dimensionLabel: string;
  scenario: string;
  question: string;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId: string;
  explanation: string;
}

export const HERO_IMAGE_PATH = heroCampusImg;
export const IDENTITY_IMAGE_PATH = identityCampusImg;
export const RIGHTS_IMAGE_PATH = rightsLibraryImg;
export const WORKSHOP_IMAGE_PATH = workshopSafetyImg;

export const SYMBOL_HOTSPOTS: SymbolHotspot[] = [
  {
    id: 'logosimbolo',
    title: 'El Logosímbolo Institucional',
    sector: 'Eje Humano y Horizonte de Vida',
    summary:
      'Representa simultáneamente la silueta del aprendiz como sujeto activo de su proyecto de vida y los caminos que conducen hacia el horizonte del conocimiento y el trabajo digno.',
    pedagogicalMeaning:
      'En la Formación Profesional Integral (FPI), el aprendiz no es un receptor pasivo: asume autonomía para aprender a aprender, aprender a hacer y aprender a ser.',
    historicalContext:
      'Adoptado para proyectar una institución pública cercana, moderna y centrada en el desarrollo humano y productivo de todas las regiones de Colombia.',
    verificationQuestion: {
      prompt: '¿Qué dualidad visual integra el Logosímbolo del SENA?',
      options: [
        'Al ser humano (aprendiz) y los senderos hacia el horizonte de oportunidades',
        'Únicamente las máquinas industriales y las carreteras nacionales',
        'Tres edificios administrativos del orden nacional',
      ],
      correctIndex: 0,
      explanation:
        'Las líneas convergentes conforman al mismo tiempo una figura humana con brazos abiertos y un camino proyectado hacia el futuro.',
    },
  },
  {
    id: 'piñon',
    title: 'El Piñón o Rueda Dentada',
    sector: 'Sector Industria y Construcción',
    summary:
      'Rueda dentada circular que enmarca el cuerpo del escudo y la bandera institucional; simboliza la transformación tecnológica, la manufactura, la infraestructura y el ingenio mecánico y digital.',
    pedagogicalMeaning:
      'Conecta a los programas industriales, de tecnologías de la información, mecatrónica, energías y construcción con los estándares globales de productividad y calidad.',
    historicalContext:
      'Desde la creación del SENA el 21 de junio de 1957 mediante el Decreto-Ley 118 impulsado por Rodolfo Martínez Tono, la cualificación técnica industrial fue pilar fundacional.',
    verificationQuestion: {
      prompt: 'Dentro del escudo del SENA, ¿qué sector económico representa el piñón?',
      options: [
        'El sector agropecuario y cafetero',
        'El sector de la industria y la construcción',
        'El sector financiero exclusivamente',
      ],
      correctIndex: 1,
      explanation:
        'La rueda dentada o piñón representa la fuerza transformadora del sector industrial, manufacturero y de la construcción.',
    },
  },
  {
    id: 'caduceo',
    title: 'El Caduceo',
    sector: 'Sector Comercio y Servicios',
    summary:
      'Vara vertical coronada por alas doradas y entrelazada por dos serpientes en el eje central del escudo; simboliza el intercambio comercial ético, la logística, la salud, el turismo y los servicios empresariales.',
    pedagogicalMeaning:
      'Recuerda el equilibrio, la comunicación asertiva y la transparencia en los servicios que articulan el tejido empresarial y social del país.',
    historicalContext:
      'Refleja la participación tripartita de trabajadores, empleadores y Gobierno en la consolidación del comercio formal y de los servicios de valor agregado.',
    verificationQuestion: {
      prompt: '¿Con cuál sector productivo del país se asocia el Caduceo en el escudo institucional?',
      options: [
        'Sector comercio y servicios',
        'Sector minero-energético',
        'Sector forestal y pesquero',
      ],
      correctIndex: 0,
      explanation:
        'El caduceo es el emblema clásico del intercambio dinámico, representando al sector de comercio y servicios.',
    },
  },
  {
    id: 'cafeto',
    title: 'La Rama de Cafeto',
    sector: 'Sector Primario y Extractivo',
    summary:
      'Ramas de cafeto dispuestas en el arco inferior sobre el piñón del escudo; honran el campo colombiano, la soberanía alimentaria, la agroindustria sostenible y el aprovechamiento responsable de recursos naturales.',
    pedagogicalMeaning:
      'Destaca el compromiso del SENA con el desarrollo rural, SENA Emprende Rural (SER), el campesinado y la innovación ambiental en todo el territorio nacional.',
    historicalContext:
      'El café fue históricamente el motor exportador de Colombia y emblema de la riqueza agrícola y biodiversa de nuestras regiones.',
    verificationQuestion: {
      prompt: '¿Qué simboliza la rama de cafeto presente en el escudo y la bandera del SENA?',
      options: [
        'Únicamente las tiendas de café urbanas',
        'El sector primario, agropecuario y extractivo del país',
        'Las actividades culturales de bienestar',
      ],
      correctIndex: 1,
      explanation:
        'La rama de cafeto vincula al SENA con las raíces agrarias, ambientales y extractivas del sector primario colombiano.',
    },
  },
];

export const HYMN_STANZAS: HymnStanza[] = [
  {
    id: 'coro',
    label: 'Coro',
    title: 'Vocación transformadora de la juventud colombiana',
    lines: [
      'Estudiantes del SENA, adelante,',
      'por Colombia luchad con amor,',
      'con el ánimo noble y radiante',
      'transformémosla en mundo mejor.',
    ],
    meaning:
      'Convoca a cada aprendiz a asumir su formación técnica y tecnológica como un acto de servicio al país, uniendo excelencia técnica y compromiso ciudadano.',
  },
  {
    id: 'estrofa_1',
    label: 'Estrofa I',
    title: 'Superación mediante el estudio y el trabajo digno',
    lines: [
      'De la patria el futuro destino,',
      'en las manos del joven está;',
      'el trabajo es seguro camino,',
      'que el progreso a Colombia dará.',
    ],
    meaning:
      'Reconoce el trabajo decente y productivo como motor legítimo de movilidad social, autonomía económica y desarrollo regional.',
  },
  {
    id: 'estrofa_2',
    label: 'Estrofa II',
    title: 'Formación Profesional Integral y fraternidad',
    lines: [
      'En la forja del SENA se forman,',
      'hombres libres que anhelan triunfar;',
      'con la ciencia y la técnica unidas,',
      'nuevos rumbos de paz trazarán.',
    ],
    meaning:
      'Articula ciencia, técnica y libertad humana: aprender no solo un oficio, sino criterios éticos para construir convivencia pacífica.',
  },
  {
    id: 'estrofa_3',
    label: 'Estrofa III · IV',
    title: 'Unidad de los tres sectores y gratitud nacional',
    lines: [
      'Hoy la patria nos grita sentida:',
      '¡Estudiantes del SENA, triunfad!',
      'Solo así lograréis en la vida,',
      'más justicia, mayor libertad.',
    ],
    meaning:
      'Letra de Luis Alfredo Sarmiento y música de Daniel Marlés: sintetiza la gratuidad pública del SENA como inversión social para lograr equidad y libertad.',
  },
];

export const INSTITUTIONAL_VALUES: InstitutionalValue[] = [
  {
    id: 'honestidad',
    name: 'Honestidad',
    essence: 'Actuar siempre con fundamento en la verdad, cumpliendo los deberes con transparencia y rectitud.',
    doAction: 'Presento evidencias de mi propia autoría, cito las fuentes consultadas y cuido los bienes públicos del ambiente.',
    avoidAction: 'Plagiar código, planos o informes de otros aprendices o alterar registros de asistencia.',
    scenarioQuestion:
      'Un compañero te ofrece enviarte el proyecto integrador ya resuelto de otra ficha para subirlo con tu nombre antes del cierre en plataforma.',
    options: [
      {
        label: 'Lo subo modificando solo la portada para no perder el resultado de aprendizaje.',
        isAligned: false,
        feedback:
          'Constituye fraude académico y vulnera el valor de la Honestidad y el Reglamento del Aprendiz vigente (Acuerdo 009 de 2024).',
      },
      {
        label: 'Rechazo la copia, solicito orientación técnica al instructor y entrego mi avance genuino.',
        isAligned: true,
        feedback:
          'Correcto. La honestidad protege tu aprendizaje real, tu credibilidad profesional y el debido proceso formativo.',
      },
    ],
  },
  {
    id: 'respeto',
    name: 'Respeto',
    essence: 'Reconocer, valorar y tratar de manera digna a todas las personas con sus virtudes y diferencias.',
    doAction: 'Escucho activamente las ideas de mi equipo, valoro la diversidad cultural, regional y de género en mi ficha.',
    avoidAction: 'Usar apodos despectivos, burlarme de dudas académicas o excluir compañeros en proyectos colaborativos.',
    scenarioQuestion:
      'Durante una sustentación, un aprendiz de otra región se pone nervioso al exponer su prototipo y algunos asistentes hacen comentarios burlones.',
    options: [
      {
        label: 'Intervengo con actitud respetuosa, presto atención a su propuesta y formulo preguntas constructivas.',
        isAligned: true,
        feedback:
          'Excelente. El ambiente SENA es territorio de paz, enfoque diferencial y trato digno entre pares e instructores.',
      },
      {
        label: 'Guardo silencio y comparto un meme en el grupo de mensajería de la ficha.',
        isAligned: false,
        feedback:
          'El acoso escolar (bullying), hostigamiento (mobbing) o burla digital está expresamente tipificado y prohibido en el Acuerdo 009 de 2024.',
      },
    ],
  },
  {
    id: 'compromiso',
    name: 'Compromiso',
    essence: 'Ser consciente de la importancia de mi rol como aprendiz y estar en disposición permanente para comprender y resolver retos.',
    doAction: 'Asisto puntualmente, preparo mis prácticas y asumo mi proyecto formativo con impacto real en mi comunidad.',
    avoidAction: 'Dejar toda la carga del trabajo colaborativo en manos del vocero o de un solo integrante.',
    scenarioQuestion:
      'Tu equipo de proyecto formativo tiene una entrega técnica mañana y la parte de documentación aún está incompleta.',
    options: [
      {
        label: 'Coordino con mi equipo una sesión breve de apoyo para completar y verificar juntos los criterios de evaluación.',
        isAligned: true,
        feedback:
          'Correcto. El aprendizaje por proyectos del SENA exige corresponsabilidad real con los resultados del equipo.',
      },
      {
        label: 'Indico al instructor que solo respondí por mis dos páginas y me desentiendo del entregable común.',
        isAligned: false,
        feedback:
          'El trabajo colaborativo requiere articulación integral, no entregas fragmentadas sin cohesión.',
      },
    ],
  },
  {
    id: 'diligencia',
    name: 'Diligencia',
    essence: 'Cumplir con los deberes, funciones y responsabilidades asignadas con atención, prontitud, destreza y eficiencia.',
    doAction: 'Aplico rigurosamente los protocolos de Seguridad y Salud en el Trabajo (SST), orden y aseo al finalizar el taller.',
    avoidAction: 'Dejar equipos energizados, herramientas descalibradas o residuos sin clasificar en el laboratorio.',
    scenarioQuestion:
      'Faltan 5 minutos para terminar la jornada en el taller de automatización y quedan herramientas fuera del gabinete y viruta en el banco.',
    options: [
      {
        label: 'Aplico el protocolo de desconexión segura, entrego las herramientas inventariadas y dejo el puesto limpio.',
        isAligned: true,
        feedback:
          'Exacto. La diligencia cuida los recursos públicos que también usarán las fichas de la siguiente jornada.',
      },
      {
        label: 'Salgo rápido porque el personal de apoyo o la siguiente ficha organizará el banco.',
        isAligned: false,
        feedback:
          'Conservar y restituir en buen estado los ambientes y equipos es un deber expreso del aprendiz (Art. 8, Acuerdo 009 de 2024).',
      },
    ],
  },
  {
    id: 'justicia',
    name: 'Justicia y Solidaridad',
    essence: 'Actuar con imparcialidad garantizando los derechos de todas las personas y apoyando solidariamente a quien enfrenta dificultades.',
    doAction: 'Participo democráticamente en la elección del vocero de ficha y apoyo el aprendizaje colaborativo.',
    avoidAction: 'Solicitar privilegios indebidos o ignorar el conducto regular ante un conflicto.',
    scenarioQuestion:
      'Un integrante de tu ficha faltó dos días por incapacidad médica comprobada y no comprende el nuevo procedimiento de laboratorio.',
    options: [
      {
        label: 'Comparto los apuntes de la sesión y practicamos juntos el protocolo antes de su evidencia.',
        isAligned: true,
        feedback:
          'Alineado con la Solidaridad y el trabajo colaborativo propios de la cultura SENA.',
      },
      {
        label: 'Le niego información para mantener el mejor promedio individual del grupo.',
        isAligned: false,
        feedback:
          'En el SENA la evaluación es por competencias frente a estándares de calidad, nunca una competencia desleal contra tus pares.',
      },
    ],
  },
];

export const REGULATION_ITEMS: RegulationItem[] = [
  // =========================================================================
  // CAPÍTULO II — TODOS LOS DERECHOS DEL APRENDIZ SENA (24 NUMERALES)
  // Acuerdo 009 de 2024 (Art. 5, 6 y 7) · Mod. Acuerdo 002 de 2026 · Dec. 0223/2026
  // =========================================================================
  {
    id: 'der_01',
    numeral: 1,
    code: 'Cap. II · Numeral 01',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Recibir inducción institucional completa',
    description:
      'Recibir al iniciar el programa una inducción integral que le permita conocer el Reglamento del Aprendiz, el Plan Nacional Integral de Bienestar, el modelo pedagógico, las plataformas digitales y los requisitos para culminar su formación y certificarse.',
    practicalApplication:
      'Participa activamente en todas las jornadas y actividades diagnósticas de bienvenida de tu Ficha.',
    institutionalRoute: 'Equipo Ejecutor de Inducción · Coordinación Académica',
  },
  {
    id: 'der_02',
    numeral: 2,
    code: 'Cap. II · Numeral 02',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Recibir Formación Profesional Integral gratuita y de calidad',
    description:
      'Acceder a Formación Profesional Integral pública, gratuita y sin intermediarios, consecuente con el diseño curricular del programa, contando oportunamente con talento humano calificado y recursos técnicos y pedagógicos suficientes.',
    practicalApplication:
      'Ningún trámite de inscripción, matrícula, formación o certificación en el SENA tiene costo económico.',
    institutionalRoute: 'Dirección del Centro de Formación · Atención al Ciudadano',
  },
  {
    id: 'der_03',
    numeral: 3,
    code: 'Cap. II · Numeral 03',
    category: 'derechos',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Ser acreditado oficialmente como aprendiz SENA',
    description:
      'Ser reconocido e identificado con el carné institucional vigente (físico o digital) y recibir acreditación oficial como aprendiz matriculado ante dependencias internas y entidades externas cuando su proceso formativo lo requiera.',
    practicalApplication:
      'Descarga o tramita tu carné digital institucional desde las plataformas oficiales del SENA.',
    institutionalRoute: 'Administración Educativa · Sistemas de Gestión Académica',
  },
  {
    id: 'der_04',
    numeral: 4,
    code: 'Cap. II · Numeral 04',
    category: 'derechos',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Utilizar la infraestructura, ambientes y recursos tecnológicos',
    description:
      'Disponer de los ambientes de aprendizaje, laboratorios, talleres, bibliotecas, herramientas, conectividad y plataformas virtuales (LMS Zajuna y SOFIA Plus) requeridos según la modalidad presencial, virtual o a distancia.',
    practicalApplication:
      'Consulta los horarios de préstamo de ambientes, equipos de cómputo y Sistema Nacional de Bibliotecas (SBS).',
    institutionalRoute: 'Coordinación Académica · Biblioteca y Recursos TIC',
  },
  {
    id: 'der_05',
    numeral: 5,
    code: 'Cap. II · Numeral 05',
    category: 'derechos',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Recibir oportunamente Elementos de Protección Personal (EPP)',
    description:
      'Recibir por parte del Centro de Formación o entidad correspondiente, cuando las actividades prácticas del programa así lo exijan conforme a la normatividad, los elementos de protección personal para salvaguardar su integridad física.',
    practicalApplication:
      'Verifica antes de cada práctica de taller o laboratorio los EPP certificados requeridos para la actividad.',
    institutionalRoute: 'Seguridad y Salud en el Trabajo (SST) · Subdirección de Centro',
  },
  {
    id: 'der_06',
    numeral: 6,
    code: 'Cap. II · Numeral 06',
    category: 'derechos',
    axis: 'bienestar_inclusion',
    axisLabel: 'Bienestar e Inclusión',
    title: 'Acceder a los programas y apoyos de Bienestar al Aprendiz',
    description:
      'Disfrutar de los planes, servicios y beneficios del Plan Nacional Integral de Bienestar al Aprendiz (salud integral, cultura, deporte, habilidades socioemocionales y convocatorias de apoyos socioeconómicos o alimentación).',
    practicalApplication:
      'Atiende las convocatorias oficiales de apoyos de sostenimiento regular, FIC, transporte o alimentación.',
    institutionalRoute: 'Líder de Bienestar al Aprendiz del Centro',
  },
  {
    id: 'der_07',
    numeral: 7,
    code: 'Cap. II · Numeral 07',
    category: 'derechos',
    axis: 'bienestar_inclusion',
    axisLabel: 'Bienestar e Inclusión',
    title: 'Recibir orientación académica, personal y ocupacional',
    description:
      'Contar con acompañamiento pedagógico, actitudinal, psicosocial y de orientación ocupacional durante todo su proceso formativo a través del equipo ejecutor, Bienestar al Aprendiz y la Agencia Pública de Empleo.',
    practicalApplication:
      'Solicita acompañamiento temprano si enfrentas dificultades emocionales, familiares o de adaptación académica.',
    institutionalRoute: 'Equipo de Bienestar al Aprendiz · Instructor Gestor',
  },
  {
    id: 'der_08',
    numeral: 8,
    code: 'Cap. II · Numeral 08',
    category: 'derechos',
    axis: 'bienestar_inclusion',
    axisLabel: 'Bienestar e Inclusión',
    title: 'Solicitar y recibir ajustes razonables por discapacidad',
    description:
      'Solicitar y contar con los ajustes razonables pedagógicos, comunicativos, físicos o evaluativos pertinentes en caso de presentar alguna condición de discapacidad, garantizando su participación y certificación en igualdad de condiciones.',
    practicalApplication:
      'Registra tu caracterización y concierta el plan de ajustes razonables con Bienestar e instructores.',
    institutionalRoute: 'Bienestar al Aprendiz · Coordinación Académica',
  },
  {
    id: 'der_09',
    numeral: 9,
    code: 'Cap. II · Numeral 09',
    category: 'derechos',
    axis: 'bienestar_inclusion',
    axisLabel: 'Bienestar e Inclusión',
    title: 'Reconocimiento de enfoque diferencial y especial protección',
    description:
      'Ser reconocido e incluido bajo enfoque diferencial (étnico, territorial, campesino, de género, diversidad sexual LGBTIQ+, víctimas del conflicto o condición socioeconómica), respetando su identidad y autorreconocimiento.',
    practicalApplication:
      'El Acuerdo 009 de 2024 incorpora atención diferencial transversal en todos los Centros de Formación del país.',
    institutionalRoute: 'Bienestar al Aprendiz · Vocerías de Enfoque Diferencial',
  },
  {
    id: 'der_10',
    numeral: 10,
    code: 'Cap. II · Numeral 10',
    category: 'derechos',
    axis: 'bienestar_inclusion',
    axisLabel: 'Bienestar e Inclusión',
    title: 'Ser tratado con dignidad, igualdad y respeto',
    description:
      'Recibir un trato digno, cordial, equitativo y libre de cualquier forma de estigmatización o discriminación por parte de directivos, instructores, personal administrativo, contratistas y compañeros.',
    practicalApplication:
      'Todo ambiente físico o virtual del SENA se rige por el respeto mutuo y los Derechos Humanos.',
    institutionalRoute: 'Comunidad Educativa · Coordinación de Formación',
  },
  {
    id: 'der_11',
    numeral: 11,
    code: 'Cap. II · Numeral 11 · Mod. Acuerdo 002 de 2026',
    category: 'derechos',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Participación y Debido Proceso',
    title: 'Gozar plenamente del debido proceso y derecho a la defensa',
    description:
      'Contar con todas las garantías del debido proceso, presunción de inocencia, notificación formal, contradicción de pruebas, defensa y principio de favorabilidad. Optimizado en 2026 mediante el Acuerdo 002 de 2026 (Art. 48) sobre actuación del Equipo Ejecutor y el Comité de Evaluación y Seguimiento.',
    practicalApplication:
      'Ninguna sanción o cancelación de matrícula puede aplicarse de plano sin citación previa y descargos.',
    institutionalRoute: 'Equipo Ejecutor · Comité de Evaluación y Seguimiento',
  },
  {
    id: 'der_12',
    numeral: 12,
    code: 'Cap. II · Numeral 12',
    category: 'derechos',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Participación y Debido Proceso',
    title: 'Ser escuchado y atendido en peticiones, quejas y recursos',
    description:
      'Presentar de manera respetuosa peticiones, solicitudes, reclamos, quejas o recursos legales ante las instancias competentes del SENA y obtener respuesta oportuna, clara y de fondo.',
    practicalApplication:
      'Radica tus solicitudes formales por escrito o mediante la Oficina Virtual de PQRS del SENA.',
    institutionalRoute: 'Coordinación Académica · Atención al Ciudadano (PQRS)',
  },
  {
    id: 'der_13',
    numeral: 13,
    code: 'Cap. II · Numeral 13 · Ley 2365 de 2024',
    category: 'derechos',
    axis: 'bienestar_inclusion',
    axisLabel: 'Bienestar e Inclusión',
    title: 'Asesoría y protección frente al acoso y violencias basadas en género',
    description:
      'Recibir orientación inmediata y activar las rutas institucionales para denunciar cualquier vulneración de derechos, maltrato, acoso escolar (bullying), hostigamiento (mobbing) o acoso sexual (Ley 2365 de 2024) en entornos físicos o digitales.',
    practicalApplication:
      'Ante cualquier conducta de acoso o violencia, se activan medidas preventivas y confidenciales de protección.',
    institutionalRoute: 'Protocolo de Prevención de Violencias · Bienestar · Subdirección',
  },
  {
    id: 'der_14',
    numeral: 14,
    code: 'Cap. II · Numeral 14',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Participar en el mejoramiento continuo y contar con instructores idóneos',
    description:
      'Participar objetivamente en los procesos de autoevaluación y mejora continua del programa y contar con instructores de probada idoneidad técnica, tecnológica y pedagógica.',
    practicalApplication:
      'Diligencia con criterio constructivo las encuestas institucionales de evaluación pedagógica.',
    institutionalRoute: 'Coordinación Académica · Gestión de Calidad',
  },
  {
    id: 'der_15',
    numeral: 15,
    code: 'Cap. II · Numeral 15',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Ser evaluado objetivamente y conocer resultados oportunamente',
    description:
      'Ser evaluado de forma integral y objetiva según los criterios de evaluación y la ruta de aprendizaje, conociendo los resultados y juicios evaluativos dentro de los plazos reglamentarios (hasta 8 días hábiles siguientes a la presentación).',
    practicalApplication:
      'Revisa periódicamente tus juicios evaluativos y retroalimentaciones registradas en el LMS Zajuna y SOFIA Plus.',
    institutionalRoute: 'Instructor Evaluador · Plataforma LMS Zajuna',
  },
  {
    id: 'der_16',
    numeral: 16,
    code: 'Cap. II · Numeral 16',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Solicitar respetuosamente la revisión de evaluaciones',
    description:
      'Pedir de forma sustentada y respetuosa la revisión de sus evidencias o calificaciones cuando considere que el resultado no fue objetivo, acudiendo primero al instructor y, en segunda instancia, a la Coordinación Académica.',
    practicalApplication:
      'Conserva copia de las evidencias entregadas y sustenta tu solicitud frente a los criterios de la guía.',
    institutionalRoute: '1. Instructor Evaluador → 2. Coordinación Académica',
  },
  {
    id: 'der_17',
    numeral: 17,
    code: 'Cap. II · Numeral 17 y Art. 7',
    category: 'derechos',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Participación y Debido Proceso',
    title: 'Elegir y ser elegido en los mecanismos de Representatividad',
    description:
      'Participar democráticamente para elegir y ser elegido en las tres rutas del Art. 7: Representantes de Centro (por jornada y modalidad presencial, virtual o distancia), Voceros de Ficha y Voceros con Enfoque Diferencial.',
    practicalApplication:
      'Postúlate o vota en las jornadas democráticas convocadas por Bienestar al Aprendiz en tu Centro.',
    institutionalRoute: 'Bienestar al Aprendiz · Subdirección de Centro',
  },
  {
    id: 'der_18',
    numeral: 18,
    code: 'Cap. II · Numeral 18',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Justificar inasistencias soportadas y concertar actividades',
    description:
      'Presentar excusas debidamente soportadas por incapacidad médica, licencia de maternidad/paternidad, calamidad doméstica o representación institucional, teniendo derecho a concertar la entrega de las actividades de aprendizaje.',
    practicalApplication:
      'Radica los soportes oficiales dentro de los términos reglamentarios para proteger tu estado En Formación.',
    institutionalRoute: 'Instructor de Ficha · Coordinación Académica',
  },
  {
    id: 'der_19',
    numeral: 19,
    code: 'Cap. II · Numeral 19 · Decreto 0223 de 2026',
    category: 'derechos',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Etapa Productiva y Certificación',
    title: 'Recibir orientación oportuna sobre alternativas de Etapa Productiva',
    description:
      'Conocer con claridad las modalidades vigentes del Art. 26 (contrato de aprendizaje laboral especial bajo Ley 2466/2025 y Decreto 0223 de 2026, vínculo formativo, vínculo laboral, proyecto productivo, monitoría, pasantía y economía popular/campesina).',
    practicalApplication:
      'Asiste a las charlas previas a finalizar etapa lectiva para elegir y registrar a tiempo tu alternativa.',
    institutionalRoute: 'Coordinación de Etapa Productiva · Relaciones Corporativas',
  },
  {
    id: 'der_20',
    numeral: 20,
    code: 'Cap. II · Numeral 20 · Decreto 0223 de 2026',
    category: 'derechos',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Contar con afiliación y cobertura en Riesgos Laborales (ARL)',
    description:
      'Tener garantizada la gestión oportuna de afiliación y cobertura en el Sistema General de Riesgos Laborales (ARL) durante las prácticas y la etapa productiva conforme a la normatividad laboral y educativa vigente en 2026.',
    practicalApplication:
      'Verifica que tu afiliación a ARL esté activa antes de iniciar actividades en empresa o escenario práctico.',
    institutionalRoute: 'Empresa Patrocinadora / Centro de Formación · Etapa Productiva',
  },
  {
    id: 'der_21',
    numeral: 21,
    code: 'Cap. II · Numeral 21 y Art. 6',
    category: 'derechos',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Participación y Debido Proceso',
    title: 'Postularse y recibir Reconocimientos Formativos e incentivos',
    description:
      'Recibir distinciones conferidas por el Subdirector de Centro (Art. 6) por desempeño sobresaliente académico, investigativo, deportivo, cultural o liderazgo: mención de honor, representación en certámenes (WorldSkills/SENASoft), intercambios o monitorías.',
    practicalApplication:
      'Los reconocimientos formativos no son excluyentes entre sí y fortalecen tu hoja de vida profesional.',
    institutionalRoute: 'Subdirección de Centro · SENNOVA · Bienestar al Aprendiz',
  },
  {
    id: 'der_22',
    numeral: 22,
    code: 'Cap. II · Numeral 22',
    category: 'derechos',
    axis: 'academico',
    axisLabel: 'Académicos y Evaluación',
    title: 'Realizar trámites académicos reglamentados con respuesta oportuna',
    description:
      'Solicitar trámites académicos y administrativos previstos en el reglamento (traslado de jornada o centro, aplazamiento de formación, reingreso o retiro voluntario) recibiendo respuesta formal dentro de los plazos establecidos.',
    practicalApplication:
      'Si enfrentas fuerza mayor prolongada, tramita formalmente un aplazamiento en lugar de ausentarte sin aviso.',
    institutionalRoute: 'Coordinación Académica · Administración Educativa',
  },
  {
    id: 'der_23',
    numeral: 23,
    code: 'Cap. II · Numeral 23',
    category: 'derechos',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Participación y Debido Proceso',
    title: 'Libre expresión, conciencia y acceso previo a planeación académica',
    description:
      'Expresar con libertad su pensamiento, ideas, culto o convicciones en el marco del respeto a la comunidad educativa, así como conocer anticipadamente los cronogramas, guías de aprendizaje y criterios de su programa.',
    practicalApplication:
      'Consulta desde el inicio de cada fase el cronograma y proyecto formativo publicados en el LMS.',
    institutionalRoute: 'Equipo Ejecutor de la Formación · Vocero de Ficha',
  },
  {
    id: 'der_24',
    numeral: 24,
    code: 'Cap. II · Numeral 24',
    category: 'derechos',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Etapa Productiva y Certificación',
    title: 'Obtener oportunamente el título, certificado o constancia',
    description:
      'Recibir el título (en programas tecnológicos), certificado de aptitud ocupacional o constancia académica correspondiente una vez apruebe la totalidad de resultados de aprendizaje de las etapas lectiva y productiva y cumpla los requisitos administrativos.',
    practicalApplication:
      'Mantén al día tus documentos de identidad y requisitos de grado en la plataforma institucional.',
    institutionalRoute: 'Administración Educativa y Certificación · Centro de Formación',
  },

  // =========================================================================
  // CAPÍTULO III — TODOS LOS DEBERES DEL APRENDIZ SENA (25 NUMERALES)
  // Acuerdo 009 de 2024 (Art. 8 y concordantes Art. 9 y Art. 30)
  // =========================================================================
  {
    id: 'deb_01',
    numeral: 1,
    code: 'Cap. III · Art. 8 · Numeral 01',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Suscribir el acta de compromiso y cumplir el Reglamento',
    description:
      'Firmar el acta de compromiso al momento de asentar la matrícula y conocer, acatar y cumplir la Constitución Política de Colombia, las leyes vigentes y todas las disposiciones del Reglamento del Aprendiz SENA.',
    practicalApplication:
      'Conocer este reglamento desde la inducción evita incurrir por desconocimiento en faltas académicas o disciplinarias.',
    institutionalRoute: 'Administración Educativa · Inducción SENA',
  },
  {
    id: 'deb_02',
    numeral: 2,
    code: 'Cap. III · Art. 8 · Numeral 02',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Respetar los derechos ajenos y no abusar de los propios',
    description:
      'Ejercer sus derechos de manera responsable, reconociendo los límites de la convivencia armónica y respetando íntegramente los derechos de sus compañeros, instructores y demás miembros de la comunidad.',
    practicalApplication:
      'Promueve acuerdos respetuosos en el trabajo por equipos y en el uso compartido de talleres y laboratorios.',
    institutionalRoute: 'Comunidad Educativa · Vocero de Ficha',
  },
  {
    id: 'deb_03',
    numeral: 3,
    code: 'Cap. III · Art. 8 · Numeral 03',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Obrar conforme a los principios y valores institucionales',
    description:
      'Actuar permanentemente bajo los valores del Código de Integridad SENA (honestidad, respeto, compromiso, diligencia, justicia y solidaridad), demostrando sentido de pertenencia dentro y fuera del Centro de Formación.',
    practicalApplication:
      'Cuando portas el uniforme o representas al SENA en escenarios externos, proyectas la imagen pública de la entidad.',
    institutionalRoute: 'Bienestar al Aprendiz · Equipo Ejecutor',
  },
  {
    id: 'deb_04',
    numeral: 4,
    code: 'Cap. III · Art. 8 · Numeral 04',
    category: 'deberes',
    axis: 'academico',
    axisLabel: 'Compromiso Académico',
    title: 'Registrar y mantener actualizados sus datos en plataformas oficiales',
    description:
      'Verificar, registrar y actualizar oportunamente sus datos básicos, documento de identidad, correo, teléfono y ubicación en SOFIA Plus, Zajuna, SGVA y la Agencia Pública de Empleo, garantizando su veracidad.',
    practicalApplication:
      'Las notificaciones oficiales y los certificados se emiten con los datos registrados en el sistema; verifica que no tengan errores.',
    institutionalRoute: 'SOFIA Plus · SGVA · Administración Educativa',
  },
  {
    id: 'deb_05',
    numeral: 5,
    code: 'Cap. III · Art. 8 · Numeral 05',
    category: 'deberes',
    axis: 'academico',
    axisLabel: 'Compromiso Académico',
    title: 'Asistir con puntualidad y participar activamente en la formación',
    description:
      'Cumplir rigurosamente los horarios y asistir puntualmente a todas las sesiones presenciales, encuentros sincrónicos virtuales, visitas técnicas y jornadas institucionales convocadas por el Centro.',
    practicalApplication:
      'En modalidad virtual ingresa regularmente al LMS Zajuna; superar 20 días consecutivos sin ingreso configura causal de deserción (Art. 30).',
    institutionalRoute: 'Instructor de Ficha · Plataforma LMS Zajuna',
  },
  {
    id: 'deb_06',
    numeral: 6,
    code: 'Cap. III · Art. 8 · Numeral 06',
    category: 'deberes',
    axis: 'academico',
    axisLabel: 'Compromiso Académico',
    title: 'Cumplir las actividades formativas y planes de mejoramiento',
    description:
      'Desarrollar y entregar dentro de los cronogramas establecidos todas las evidencias de conocimiento, desempeño y producto de su etapa lectiva y productiva, así como los planes de mejoramiento concertados.',
    practicalApplication:
      'Organiza tus entregas semanales conforme a la guía de aprendizaje y criterios de evaluación.',
    institutionalRoute: 'Equipo Ejecutor del Programa · Coordinación Académica',
  },
  {
    id: 'deb_07',
    numeral: 7,
    code: 'Cap. III · Art. 8 · Numeral 07',
    category: 'deberes',
    axis: 'academico',
    axisLabel: 'Compromiso Académico',
    title: 'Respetar los derechos de autor y la propiedad intelectual',
    description:
      'Garantizar el respeto por la propiedad intelectual y los derechos morales y patrimoniales de autor en todos los informes, código fuente, planos, diseños, prototipos e investigaciones.',
    practicalApplication:
      'Cita adecuadamente las normas técnicas, bibliografía, repositorios y recursos externos consultados.',
    institutionalRoute: 'Instructor Evaluador · Sistema de Bibliotecas SENA',
  },
  {
    id: 'deb_08',
    numeral: 8,
    code: 'Cap. III · Art. 8 · Numeral 08 y Art. 9',
    category: 'deberes',
    axis: 'academico',
    axisLabel: 'Compromiso Académico',
    title: 'Presentar evaluaciones y evidencias con total honestidad académica',
    description:
      'Realizar personalmente sus pruebas, sustentaciones y proyectos con autoría genuina, absteniéndose de plagio, fraude, adulteración de registros o suplantación de identidad (expresamente prohibidos en el Art. 9).',
    practicalApplication:
      'El plagio anula la evidencia y da apertura a medidas formativas o disciplinarias ante el Comité.',
    institutionalRoute: 'Equipo Ejecutor · Comité de Evaluación y Seguimiento',
  },
  {
    id: 'deb_09',
    numeral: 9,
    code: 'Cap. III · Art. 8 · Numeral 09',
    category: 'deberes',
    axis: 'bienestar_inclusion',
    axisLabel: 'Salud y Bienestar',
    title: 'Informar oportunamente condiciones de salud, maternidad o fuerza mayor',
    description:
      'Comunicar de manera oportuna al Centro de Formación condiciones médicas, restricciones de salud, embarazo/lactancia o situaciones de fuerza mayor que requieran acompañamiento o incidan en el desarrollo seguro de prácticas.',
    practicalApplication:
      'Permite activar medidas preventivas de seguridad ocupacional, bienestar o ajustes razonables a tiempo.',
    institutionalRoute: 'Bienestar al Aprendiz · Coordinación Académica · SST',
  },
  {
    id: 'deb_10',
    numeral: 10,
    code: 'Cap. III · Art. 8 · Numeral 10 y Art. 30',
    category: 'deberes',
    axis: 'academico',
    axisLabel: 'Compromiso Académico',
    title: 'Justificar debidamente las inasistencias dentro de los plazos',
    description:
      'Presentar oportunamente los soportes válidos ante ausencias. Conforme al Art. 30, 3 días continuos o 5 no continuos injustificados en presencial (o 3 días seguidos en etapa productiva) activan reporte de deserción, frente al cual existen 5 días hábiles de descargos.',
    practicalApplication:
      'Entrega incapacidades expedidas por EPS o soportes verificables de calamidad tan pronto ocurra la novedad.',
    institutionalRoute: 'Instructor de Ficha · Coordinación Académica',
  },
  {
    id: 'deb_11',
    numeral: 11,
    code: 'Cap. III · Art. 8 · Numeral 11',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Acatar el conducto regular para trámites, novedades y conflictos',
    description:
      'Seguir el orden institucional de instancias (Instructor → Vocero/Bienestar → Coordinación Académica → Subdirección/Comité) para gestionar solicitudes, resolver desacuerdos o reportar anomalías.',
    practicalApplication:
      'Agotar la primera instancia con tu instructor resuelve de manera ágil y directa la mayoría de inquietudes.',
    institutionalRoute: 'Instructor → Coordinación Académica → Subdirección',
  },
  {
    id: 'deb_12',
    numeral: 12,
    code: 'Cap. III · Art. 8 · Numeral 12',
    category: 'deberes',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Cuidar y hacer uso racional de ambientes, maquinaria y recursos',
    description:
      'Conservar en óptimo estado la infraestructura pública, aulas, talleres, instrumentos de medición, insumos, mobiliario y colecciones bibliográficas dispuestos por el SENA o entidades aliadas.',
    practicalApplication:
      'Reporta de inmediato al instructor cualquier falla técnica o deterioro detectado al recibir tu puesto de trabajo.',
    institutionalRoute: 'Instructor Técnico · Almacén e Inventarios',
  },
  {
    id: 'deb_13',
    numeral: 13,
    code: 'Cap. III · Art. 8 · Numeral 13 y Art. 9',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Entregar documentación veraz, legal y auténtica',
    description:
      'Aportar únicamente documentos e información auténticos, verificables y fidedignos en todo proceso de ingreso, matrícula, excusas médicas, apoyos de bienestar, etapa productiva o certificación.',
    practicalApplication:
      'Aportar certificados o incapacidades adulteradas constituye falta gravísima y causal de cancelación de matrícula.',
    institutionalRoute: 'Administración Educativa · Comité de Evaluación y Seguimiento',
  },
  {
    id: 'deb_14',
    numeral: 14,
    code: 'Cap. III · Art. 8 · Numeral 14',
    category: 'deberes',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Portar permanentemente y en lugar visible el carné institucional',
    description:
      'Portar de manera personal, visible e intransferible el carné institucional (físico o digital) al ingresar, desplazarse y permanecer en las sedes del SENA o escenarios externos de formación.',
    practicalApplication:
      'Nunca prestes tu carné ni código QR de acceso a terceros; es un documento de seguridad institucional.',
    institutionalRoute: 'Control de Acceso · Vigilancia y Seguridad Institucional',
  },
  {
    id: 'deb_15',
    numeral: 15,
    code: 'Cap. III · Art. 8 · Numeral 15',
    category: 'deberes',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Usar apropiadamente los Elementos de Protección Personal (EPP) y uniforme',
    description:
      'Utilizar de forma permanente y adecuada el uniforme o indumentaria requerida y todos los EPP acordes con los riesgos específicos de su especialidad técnica o tecnológica.',
    practicalApplication:
      'Recoge el cabello, retira accesorios metálicos en talleres mecánicos/eléctricos y usa calzado de seguridad certificado.',
    institutionalRoute: 'Instructor del Ambiente · Seguridad y Salud en el Trabajo (SST)',
  },
  {
    id: 'deb_16',
    numeral: 16,
    code: 'Cap. III · Art. 8 · Numeral 16',
    category: 'deberes',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Cumplir protocolos de SST, bioseguridad y gestión ambiental',
    description:
      'Acatar las normas de Seguridad y Salud en el Trabajo, rutas de evacuación, protocolos de bioseguridad y lineamientos de manejo ambiental para proteger la vida y prevenir accidentes o emergencias.',
    practicalApplication:
      'Identifica los puntos de encuentro, extintores y botiquines de tu Centro de Formación desde la primera semana.',
    institutionalRoute: 'Brigada de Emergencias · Gestión Ambiental y SST',
  },
  {
    id: 'deb_17',
    numeral: 17,
    code: 'Cap. III · Art. 8 · Numeral 17 y Art. 30',
    category: 'deberes',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Etapa Productiva y TIC',
    title: 'Seleccionar, registrar y planear a tiempo su Etapa Productiva',
    description:
      'Elegir con anticipación su alternativa de Etapa Productiva, tramitar el aval correspondiente y presentar la planeación formal dentro del plazo límite establecido para evitar incumplimiento o deserción.',
    practicalApplication:
      'Inicia la gestión de tu alternativa antes de concluir la etapa lectiva junto al área de Etapa Productiva.',
    institutionalRoute: 'Coordinación de Etapa Productiva · Instructor de Seguimiento',
  },
  {
    id: 'deb_18',
    numeral: 18,
    code: 'Cap. III · Art. 8 · Numeral 18',
    category: 'deberes',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Etapa Productiva y TIC',
    title: 'Cumplir las obligaciones de Etapa Productiva y entregar bitácoras',
    description:
      'Desempeñar con ética, puntualidad y calidad su contrato de aprendizaje laboral especial o alternativa seleccionada, entregando cumplidamente las bitácoras y evidencias periódicas al instructor de seguimiento.',
    practicalApplication:
      'Registra quincenalmente tus bitácoras firmadas y atiende las visitas o reuniones de seguimiento.',
    institutionalRoute: 'Instructor de Seguimiento de Etapa Productiva · Empresa / Entidad',
  },
  {
    id: 'deb_19',
    numeral: 19,
    code: 'Cap. III · Art. 8 · Numeral 19',
    category: 'deberes',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Etapa Productiva y TIC',
    title: 'Informar consecución directa de práctica o novedades en empresa',
    description:
      'Reportar de inmediato al Centro de Formación cuando gestione directamente un contrato o alternativa de práctica, así como cualquier suspensión, cambio de funciones o anomalía durante su ejecución.',
    practicalApplication:
      'Ningún cambio de empresa o suspensión es válido académicamente sin registro y autorización previa del Centro.',
    institutionalRoute: 'SGVA · Coordinación de Relaciones Corporativas y Etapa Productiva',
  },
  {
    id: 'deb_20',
    numeral: 20,
    code: 'Cap. III · Art. 8 · Numeral 20 y Art. 9',
    category: 'deberes',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Etapa Productiva y TIC',
    title: 'Hacer uso responsable y seguro de plataformas virtuales y TIC',
    description:
      'Utilizar las redes de datos, equipos informáticos, licencias de software, correo `@soy.sena.edu.co` y plataforma Zajuna exclusivamente para fines formativos, custodiando sus contraseñas personales.',
    practicalApplication:
      'Cierra siempre tu sesión en equipos compartidos y abstente de instalar software no autorizado.',
    institutionalRoute: 'Mesa de Ayuda TIC · Administración LMS Zajuna',
  },
  {
    id: 'deb_21',
    numeral: 21,
    code: 'Cap. III · Art. 8 · Numeral 21 y Art. 9',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Abstenerse de agresiones, discriminación o acoso físico y digital',
    description:
      'Evitar toda conducta de violencia física o verbal, matoneo (bullying), hostigamiento (mobbing), acoso sexual, ciberacoso o difusión de mensajes ofensivos, discriminatorios o ilegales en medios físicos o digitales.',
    practicalApplication:
      'Los grupos de mensajería y foros virtuales de la ficha también hacen parte del entorno de respeto institucional.',
    institutionalRoute: 'Bienestar al Aprendiz · Comité de Evaluación y Seguimiento',
  },
  {
    id: 'deb_22',
    numeral: 22,
    code: 'Cap. III · Art. 8 · Numeral 22',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Mantener trato digno, cordial e inclusivo con toda la comunidad',
    description:
      'Dirigirse con respeto, tolerancia y consideración hacia compañeros, instructores, coordinadores, personal administrativo, guardas de seguridad y personal de aseo y cafetería.',
    practicalApplication:
      'Reconoce la diversidad regional, étnica, generacional y de capacidades como riqueza de tu ficha.',
    institutionalRoute: 'Comunidad Educativa SENA',
  },
  {
    id: 'deb_23',
    numeral: 23,
    code: 'Cap. III · Art. 8 · Numeral 23',
    category: 'deberes',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Cumplir protocolos de orden, aseo y clasificación de residuos',
    description:
      'Entregar limpio, organizado y desconectado de manera segura su banco o puesto de aprendizaje al finalizar la sesión, disponiendo los residuos sólidos o peligrosos en los puntos ecológicos correspondientes.',
    practicalApplication:
      'Aplica las 5S de orden y limpieza industrial al cierre de cada práctica de taller o laboratorio.',
    institutionalRoute: 'Instructor del Ambiente · Sistema de Gestión Ambiental (SIGA)',
  },
  {
    id: 'deb_24',
    numeral: 24,
    code: 'Cap. III · Art. 8 · Numeral 24',
    category: 'deberes',
    axis: 'seguridad_recursos',
    axisLabel: 'Identificación, SST y Recursos',
    title: 'Conservar y restituir los bienes públicos asumiendo responsabilidad',
    description:
      'Devolver oportunamente los equipos, herramientas o libros recibidos en préstamo y responder por la reposición o reparación de daños o pérdidas ocasionados de manera intencional o por negligencia.',
    practicalApplication:
      'Verifica el inventario al recibir y entregar herramientas en el almacén técnico del Centro.',
    institutionalRoute: 'Almacén Técnico · Biblioteca · Subdirección de Centro',
  },
  {
    id: 'deb_25',
    numeral: 25,
    code: 'Cap. III · Art. 8 · Numeral 25',
    category: 'deberes',
    axis: 'participacion_debido_proceso',
    axisLabel: 'Normatividad y Convivencia',
    title: 'Atender las demás obligaciones legales y lineamientos del SENA',
    description:
      'Cumplir oportunamente los requisitos administrativos de grado, paz y salvo institucional y demás directrices legales o reglamentarias vigentes necesarias para el buen término de su Formación Profesional Integral.',
    practicalApplication:
      'Revisa con anticipación los requisitos de certificación al acercarse el cierre de tu etapa productiva.',
    institutionalRoute: 'Coordinación Académica · Administración Educativa',
  },

  // =========================================================================
  // ETAPA PRODUCTIVA — ALTERNATIVAS VIGENTES 2026
  // =========================================================================
  {
    id: 'ep_01',
    code: 'Acuerdo 009/2024 · Ley 2466/2025 y Decreto 0223 de 2026',
    category: 'etapa_productiva',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Alternativa Laboral y Formativa',
    title: 'Contrato de Aprendizaje Laboral Especial (Régimen 2026) y Vínculo Laboral',
    description:
      'Conforme a la Ley 2466 de 2025 y el Decreto 0223 de 2026, el Contrato de Aprendizaje opera como contrato laboral especial a término fijo: otorga mínimo 75% del SMMLV más EPS y ARL en etapa lectiva, y 100% del SMMLV con seguridad social integral (Salud, Pensión y ARL) y prestaciones sociales en etapa productiva. También aplica homologación por Vínculo Laboral o Vínculo Formativo.',
    practicalApplication:
      'Gestiona tu postulación mediante el SGVA y la Agencia Pública de Empleo del SENA, verificando la afiliación completa según tu etapa.',
    institutionalRoute: 'SGVA · Agencia Pública de Empleo SENA · Relaciones Corporativas',
  },
  {
    id: 'ep_02',
    code: 'Acuerdo 009 de 2024 · Art. 26',
    category: 'etapa_productiva',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Emprendimiento, I+D+i y Monitoría',
    title: 'Proyecto Productivo (Emprendimiento, I+D+i) y Monitoría',
    description:
      'Formulación y ejecución de un proyecto productivo enfocado en emprendimiento, innovación o desarrollo tecnológico (acompañado por Centros de Desarrollo Empresarial SBDC / Fondo Emprender), o participación seleccionada como Monitor académico o administrativo en el Centro.',
    practicalApplication:
      'Ideal para consolidar tu propia unidad productiva o fortalecer capacidades técnicas y pedagógicas dentro de los ambientes del SENA.',
    institutionalRoute: 'Centro de Desarrollo Empresarial SENA · Instructor de Seguimiento',
  },
  {
    id: 'ep_03',
    code: 'Acuerdo 009 de 2024 · Art. 26',
    category: 'etapa_productiva',
    axis: 'etapa_productiva_certificacion',
    axisLabel: 'Economía Popular, Campesina y Pasantías',
    title: 'Prácticas en la Economía Popular y/o Campesina y Pasantías',
    description:
      'Modalidad actualizada por el Acuerdo 009 de 2024 que permite desarrollar la etapa productiva apoyando y fortaleciendo unidades de la economía popular, comunitaria, asociativa o campesina (CampeSENA / SER), así como pasantías en entidades estatales u organizaciones sociales.',
    practicalApplication:
      'Toda alternativa exige presentar oportunamente la planeación avalada y reportar las bitácoras e informes al instructor de seguimiento para evitar causales de incumplimiento.',
    institutionalRoute: 'Coordinación Académica · Estrategia CampeSENA / Economía Popular',
  },
];

export const REGULATION_CASES: RegulationCase[] = [
  {
    id: 'caso_1',
    title: 'Inconformidad con calificación de evidencia práctica',
    categoryLabel: 'Derechos y Revisión Evaluativa · Acuerdo 009 de 2024',
    context:
      'Camila entregó a tiempo su evidencia de base de datos, pero aparece con juicio "D (No Aprobado)" sin observaciones detalladas sobre los criterios incumplidos.',
    options: [
      {
        id: 'a',
        text: 'Publicar ataques personales en redes sociales contra el instructor sin agotar primero las instancias institucionales.',
        isCorrect: false,
        rationale:
          'Omite el conducto regular previsto en el Acuerdo 009 de 2024 y puede vulnerar los deberes de respeto en entornos digitales.',
      },
      {
        id: 'b',
        text: 'Solicitar respetuosamente y por escrito la revisión al instructor evaluador; si persiste el desacuerdo, escalar ante Coordinación Académica dentro de los plazos reglamentarios.',
        isCorrect: true,
        rationale:
          'Exacto. El Capítulo II (Art. 5) del Acuerdo 009 de 2024 garantiza evaluación objetiva, entrega oportuna de resultados y derecho a solicitar revisión siguiendo el conducto regular.',
      },
      {
        id: 'c',
        text: 'Abandonar el programa asumiendo que ningún juicio evaluativo puede revisarse.',
        isCorrect: false,
        rationale:
          'El reglamento vigente respalda la revisión objetiva de evaluaciones y los planes de mejoramiento concertados.',
      },
    ],
    institutionalRoute: 'Instructor Evaluador → Vocero de Ficha (apoyo opcional) → Coordinación Académica',
  },
  {
    id: 'caso_2',
    title: 'Inasistencia médica y debido proceso ante posible deserción',
    categoryLabel: 'Art. 30 y Art. 48 (Mod. Acuerdo 002 de 2026)',
    context:
      'Mateo tuvo una urgencia médica con incapacidad de tres días hábiles y no pudo asistir a las sesiones presenciales de su ficha diurna.',
    options: [
      {
        id: 'a',
        text: 'Esperar hasta el final del trimestre sin reportar nada, creyendo que solo se configura deserción al faltar un mes completo.',
        isCorrect: false,
        rationale:
          'Bajo el Art. 30 del Acuerdo 009 de 2024, acumular 3 días continuos (o 5 días no continuos) de inasistencia injustificada en modalidad presencial activa el trámite de presunta deserción.',
      },
      {
        id: 'b',
        text: 'Informar oportunamente al instructor y radicar el soporte médico válido (o dentro de los 5 días hábiles de descargos si recibe notificación) para concertar las evidencias pendientes.',
        isCorrect: true,
        rationale:
          'Correcto. El Acuerdo 009 de 2024 y la modificación de su Art. 48 (Acuerdo 002 de 2026) refuerzan el debido proceso ante el Equipo Ejecutor y el Comité: justificar con soportes válidos evita la deserción.',
      },
      {
        id: 'c',
        text: 'Pedirle a un compañero que firme o registre asistencia en su nombre.',
        isCorrect: false,
        rationale:
          'Suplantar asistencia vulnera la Honestidad y constituye falta disciplinaria según el Reglamento del Aprendiz vigente.',
      },
    ],
    institutionalRoute: 'Aprendiz → Equipo Ejecutor de Ficha / Coordinación → Concertación de actividades',
  },
  {
    id: 'caso_3',
    title: 'Ingreso a laboratorio técnico sin Elementos de Protección Personal',
    categoryLabel: 'Deberes SST y Autocuidado · Acuerdo 009 de 2024',
    context:
      'Durante una práctica de mecanizado, Julián olvida sus gafas de seguridad y botas dieléctricas, pero desea encender el torno para adelantar su pieza.',
    options: [
      {
        id: 'a',
        text: 'Operar el torno rápido mientras el instructor revisa otro banco de trabajo.',
        isCorrect: false,
        rationale:
          'Pone en riesgo grave su integridad física e incumple los deberes expresos de SST establecidos en el Art. 8 del Acuerdo 009 de 2024.',
      },
      {
        id: 'b',
        text: 'Informar al instructor, abstenerse de operar maquinaria sin EPP y gestionar el elemento certificado según el protocolo del ambiente.',
        isCorrect: true,
        rationale:
          'Muy bien. En el SENA ninguna entrega está por encima de la vida ni del cumplimiento riguroso de las normas de Seguridad y Salud en el Trabajo.',
      },
      {
        id: 'c',
        text: 'Usar gafas oscuras de sol no certificadas para disimular.',
        isCorrect: false,
        rationale:
          'Los lentes no certificados pueden astillarse ante un impacto mecánico y agravar una lesión ocular.',
      },
    ],
    institutionalRoute: 'Protocolo SST del Ambiente → Instructor Técnico → Brigada / Coordinación',
  },
  {
    id: 'caso_4',
    title: 'Alternativas vigentes para desarrollar la Etapa Productiva',
    categoryLabel: 'Art. 26 Etapa Productiva · Acuerdo 009 de 2024',
    context:
      'Valentina está próxima a culminar su etapa lectiva y lidera junto a una asociación veredal de su municipio una iniciativa productiva agroecológica y digital.',
    options: [
      {
        id: 'a',
        text: 'Formalizar ante Coordinación la planeación de Etapa Productiva en Proyecto Productivo o en Prácticas de la Economía Popular y/o Campesina, con instructor de seguimiento asignado.',
        isCorrect: true,
        rationale:
          'Correcto. El Acuerdo 009 de 2024 reconoce tanto el Proyecto Productivo como las Prácticas en la Economía Popular y/o Campesina, exigiendo planeación avalada y seguimiento por bitácoras.',
      },
      {
        id: 'b',
        text: 'Ejecutar las actividades por su cuenta sin presentar formato de planeación ni registrar bitácoras ante el centro.',
        isCorrect: false,
        rationale:
          'Según el Art. 30 del Acuerdo 009 de 2024, no presentar la planeación avalada de etapa productiva dentro del plazo límite configura causal de deserción por incumplimiento.',
      },
      {
        id: 'c',
        text: 'Esperar indefinidamente porque en el SENA solo existe el contrato de aprendizaje empresarial.',
        isCorrect: false,
        rationale:
          'Además del contrato de aprendizaje laboral especial (Decreto 0223 de 2026), existen vínculo formativo, vínculo laboral, proyecto productivo, monitoría, pasantía y prácticas en la economía popular y/o campesina.',
      },
    ],
    institutionalRoute: 'Aprendiz → Coordinación de Etapa Productiva → Instructor de Seguimiento',
  },
];

export const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  {
    id: 'q1',
    number: 1,
    dimension: 'identidad',
    dimensionLabel: 'Identidad Institucional',
    scenario:
      'Durante el recorrido inaugural por el Centro de Formación, el equipo pedagógico presenta el escudo y la bandera del SENA explicando su relación con el aparato productivo colombiano.',
    question:
      '¿Cuál es la correspondencia correcta entre los tres elementos del escudo del SENA y los sectores económicos que representan?',
    options: [
      {
        id: 'q1_a',
        text: 'Piñón: Industria y construcción · Caduceo: Comercio y servicios · Rama de cafeto: Sector primario y extractivo',
      },
      {
        id: 'q1_b',
        text: 'Piñón: Transporte terrestre · Caduceo: Sector agropecuario · Rama de cafeto: Comercio internacional',
      },
      {
        id: 'q1_c',
        text: 'Piñón: Sector financiero · Caduceo: Industria pesada · Rama de cafeto: Turismo urbano',
      },
      {
        id: 'q1_d',
        text: 'Los tres símbolos representan únicamente las regiones Andina, Caribe y Pacífica sin relación con sectores económicos',
      },
    ],
    correctOptionId: 'q1_a',
    explanation:
      'El escudo integra los tres grandes renglones económicos donde el SENA forma talento: Industria y Construcción (piñón), Comercio y Servicios (caduceo) y Sector Primario y Extractivo (rama de cafeto).',
  },
  {
    id: 'q2',
    number: 2,
    dimension: 'identidad',
    dimensionLabel: 'Identidad Institucional',
    scenario:
      'Al analizar el Logosímbolo verde institucional, el instructor pregunta por qué su diseño sintetiza el modelo pedagógico del SENA.',
    question: '¿Qué simboliza de manera simultánea el Logosímbolo del SENA?',
    options: [
      {
        id: 'q2_a',
        text: 'Únicamente la letra inicial de las regionales fundadoras de 1957',
      },
      {
        id: 'q2_b',
        text: 'El camino hacia el horizonte de posibilidades y, al mismo tiempo, la figura del ser humano (el aprendiz) como centro del proceso formativo',
      },
      {
        id: 'q2_c',
        text: 'Una pirámide jerárquica de cargos directivos del Ministerio del Trabajo',
      },
      {
        id: 'q2_d',
        text: 'Una estructura arquitectónica exclusiva de los centros industriales',
      },
    ],
    correctOptionId: 'q2_b',
    explanation:
      'El Logosímbolo une al ser humano con los caminos que se abren hacia el horizonte, reflejando autonomía, proyecto de vida y Formación Profesional Integral.',
  },
  {
    id: 'q3',
    number: 3,
    dimension: 'identidad',
    dimensionLabel: 'Identidad Institucional',
    scenario:
      'En tu programa de formación no solo desarrollas destrezas técnicas en software o maquinaria, sino también trabajo en equipo, ética ciudadana y resolución de problemas reales.',
    question:
      '¿Cuáles son los tres saberes fundamentales que articula la Formación Profesional Integral (FPI) del SENA?',
    options: [
      {
        id: 'q3_a',
        text: 'Memorizar manuales, presentar exámenes escritos y pagar derechos de grado',
      },
      {
        id: 'q3_b',
        text: 'Aprender a aprender (conocimiento), aprender a hacer (desempeño práctico) y aprender a ser (convivencia y valores)',
      },
      {
        id: 'q3_c',
        text: 'Competir individualmente, aprobar solo teoría y omitir la etapa productiva',
      },
      {
        id: 'q3_d',
        text: 'Estudiar únicamente herramientas ofimáticas sin proyecto formativo',
      },
    ],
    correctOptionId: 'q3_b',
    explanation:
      'La Formación Profesional Integral equilibra el saber (aprender a aprender), el saber hacer (desempeño y producto) y el saber ser (actitud ética y ciudadana).',
  },
  {
    id: 'q4',
    number: 4,
    dimension: 'valores',
    dimensionLabel: 'Valores e Integridad',
    scenario:
      'Faltando dos horas para cerrar el envío de una evidencia individual en la plataforma LMS Zajuna, un compañero descarga un trabajo de internet, cambia el nombre del autor y te sugiere hacer lo mismo.',
    question:
      'Desde el Código de Integridad y el Reglamento del Aprendiz vigente (Acuerdo 009 de 2024), ¿cuál es la actuación coherente?',
    options: [
      {
        id: 'q4_a',
        text: 'Entregar el archivo descargado traduciendo algunos párrafos para evitar detección automática',
      },
      {
        id: 'q4_b',
        text: 'Actuar con Honestidad entregando tu desarrollo propio, citando las fuentes de referencia y solicitando orientación o plan de mejoramiento si requieres apoyo técnico',
      },
      {
        id: 'q4_c',
        text: 'Subir un archivo vacío dañado para ganar varios días adicionales sin informar al instructor',
      },
      {
        id: 'q4_d',
        text: 'Pagarle a un tercero externo para que elabore todas las evidencias del trimestre',
      },
    ],
    correctOptionId: 'q4_b',
    explanation:
      'La Honestidad y el respeto por la propiedad intelectual son deberes expresos del Acuerdo 009 de 2024; el plagio o fraude invalida la evidencia y activa medidas formativas o disciplinarias.',
  },
  {
    id: 'q5',
    number: 5,
    dimension: 'valores',
    dimensionLabel: 'Valores e Integridad',
    scenario:
      'En tu ficha confluyen aprendices campesinos, integrantes de comunidades étnicas (indígenas y NARP), personas con discapacidad y jóvenes de distintas regiones.',
    question:
      '¿Qué combinación de valores y principios del Acuerdo 009 de 2024 fortalece la convivencia en esta diversidad?',
    options: [
      {
        id: 'q5_a',
        text: 'Respeto, Solidaridad y enfoque diferencial: garantizar trato digno, inclusión participativa y ambientes libres de acoso (bullying o mobbing)',
      },
      {
        id: 'q5_b',
        text: 'Trabajar siempre en solitario para no adaptar el ritmo a ningún compañero',
      },
      {
        id: 'q5_c',
        text: 'Asignar únicamente tareas operativas menores a quienes provienen de zonas rurales',
      },
      {
        id: 'q5_d',
        text: 'Priorizar la rapidez de entrega aunque se excluya la participación de la mitad del equipo',
      },
    ],
    correctOptionId: 'q5_a',
    explanation:
      'El Código de Integridad y el Acuerdo 009 de 2024 incorporan explícitamente el enfoque diferencial, la representatividad plural y la prevención del bullying y mobbing.',
  },
  {
    id: 'q6',
    number: 6,
    dimension: 'derechos',
    dimensionLabel: 'Derechos del Aprendiz',
    scenario:
      'Una persona externa contacta por mensajería a los aspirantes admitidos asegurando que deben consignar dinero para "legalizar la matrícula bajo el nuevo reglamento y activar el carné".',
    question: '¿Cómo debes proceder frente a este cobro según tus derechos en el SENA?',
    options: [
      {
        id: 'q6_a',
        text: 'Pagar la mitad mientras inicia la primera semana de inducción',
      },
      {
        id: 'q6_b',
        text: 'Rechazar el pago y denunciarlo en los canales oficiales, pues todos los procesos formativos y trámites del SENA son públicos, gratuitos y sin intermediarios',
      },
      {
        id: 'q6_c',
        text: 'Reunir el dinero con el vocero de la ficha para agilizar la inscripción',
      },
      {
        id: 'q6_d',
        text: 'Entregar tus credenciales personales de Zajuna y SOFIA Plus al tramitador',
      },
    ],
    correctOptionId: 'q6_b',
    explanation:
      'La gratuidad integral es principio fundacional y derecho del aprendiz (Art. 5, Acuerdo 009 de 2024): ningún servicio o trámite del SENA tiene costo.',
  },
  {
    id: 'q7',
    number: 7,
    dimension: 'derechos',
    dimensionLabel: 'Derechos del Aprendiz',
    scenario:
      'En la inducción 2026 se socializa el marco normativo que reemplazó al derogado Acuerdo 0007 de 2012, incluyendo el ajuste expedido en marzo de 2026 sobre garantías procesales y revisión de casos.',
    question:
      '¿Cuál es la normativa vigente del Reglamento del Aprendiz SENA en 2026 y qué actualización incorporó?',
    options: [
      {
        id: 'q7_a',
        text: 'El Acuerdo 009 de 2024, modificado en su Art. 48 por el Acuerdo 002 de 2026 para fortalecer el debido proceso ante el Equipo Ejecutor y el Comité de Evaluación y Seguimiento',
      },
      {
        id: 'q7_b',
        text: 'Sigue vigente el Acuerdo 0007 de 2012 sin modificaciones ni derecho a revisión evaluativa',
      },
      {
        id: 'q7_c',
        text: 'No existe reglamento aplicable a programas virtuales ni a distancia',
      },
      {
        id: 'q7_d',
        text: 'El Comité puede cancelar la matrícula sin notificación previa ni descargos',
      },
    ],
    correctOptionId: 'q7_a',
    explanation:
      'El Reglamento vigente fue adoptado por el Acuerdo 009 de 2024 (derogando el 0007 de 2012) y actualizado por el Acuerdo 002 de 2026, que optimizó el Art. 48 sobre equipos y garantías del debido proceso.',
  },
  {
    id: 'q8',
    number: 8,
    dimension: 'derechos',
    dimensionLabel: 'Derechos del Aprendiz',
    scenario:
      'La Coordinación explica las alternativas de Etapa Productiva del Acuerdo 009 de 2024 (Art. 26) junto con las condiciones vigentes en 2026 para el Contrato de Aprendizaje según la Ley 2466 de 2025 y el Decreto 0223 de 2026.',
    question: '¿Qué caracteriza correctamente las alternativas y el Contrato de Aprendizaje en 2026?',
    options: [
      {
        id: 'q8_a',
        text: 'Solo existe contrato de aprendizaje sin afiliación a riesgos laborales ni prestaciones',
      },
      {
        id: 'q8_b',
        text: 'El contrato de aprendizaje es laboral especial (75% SMMLV + EPS/ARL en lectiva; 100% SMMLV + salud, pensión, ARL y prestaciones en productiva) y coexiste con proyecto productivo, vínculo laboral/formativo, monitoría, pasantía y economía popular/campesina',
      },
      {
        id: 'q8_c',
        text: 'Toda la etapa productiva se homologa con un examen teórico de 20 minutos',
      },
      {
        id: 'q8_d',
        text: 'Las prácticas pueden ejecutarse sin planeación avalada ni instructor de seguimiento',
      },
    ],
    correctOptionId: 'q8_b',
    explanation:
      'En 2026 convergen las alternativas del Art. 26 del Acuerdo 009 de 2024 (incluida economía popular/campesina) y la laboralización del contrato de aprendizaje reglamentada por el Decreto 0223 de 2026.',
  },
  {
    id: 'q9',
    number: 9,
    dimension: 'deberes',
    dimensionLabel: 'Deberes y Convivencia',
    scenario:
      'Para ingresar al Centro de Formación y desarrollar una práctica en el ambiente especializado de electricidad y mecatrónica, se verifica el cumplimiento del Artículo 8 del Acuerdo 009 de 2024.',
    question: '¿Qué deberes reglamentarios son de cumplimiento permanente en este escenario?',
    options: [
      {
        id: 'q9_a',
        text: 'Portar el carné institucional únicamente el primer día del año',
      },
      {
        id: 'q9_b',
        text: 'Portar visiblemente el carné institucional, utilizar los EPP exigidos por SST y hacer uso responsable de los equipos y herramientas del ambiente',
      },
      {
        id: 'q9_c',
        text: 'Usar los EPP solo cuando haya visitas de auditoría externa',
      },
      {
        id: 'q9_d',
        text: 'Prestar tu carné personal a terceros externos para que ingresen al taller',
      },
    ],
    correctOptionId: 'q9_b',
    explanation:
      'La identificación institucional intransferible, el acatamiento estricto de normas SST/EPP y el cuidado de bienes públicos son deberes esenciales en el Acuerdo 009 de 2024.',
  },
  {
    id: 'q10',
    number: 10,
    dimension: 'deberes',
    dimensionLabel: 'Deberes y Convivencia',
    scenario:
      'Según el Artículo 30 del Acuerdo 009 de 2024, acumular 3 días continuos o 5 no continuos de inasistencia injustificada en etapa lectiva presencial (o 20 días consecutivos sin ingreso en virtual) configura causal de deserción.',
    question:
      'Si enfrentas una incapacidad o fuerza mayor comprobable, ¿cómo opera el deber de justificación y el debido proceso?',
    options: [
      {
        id: 'q10_a',
        text: 'La matrícula se cancela automáticamente al tercer día sin posibilidad de presentar descargos ni soportes',
      },
      {
        id: 'q10_b',
        text: 'Debes informar oportunamente aportando los soportes válidos (contando con el plazo de debido proceso de 5 días hábiles tras notificación) y concertar tu plan de actividades',
      },
      {
        id: 'q10_c',
        text: 'Solicitar a un compañero que registre su huella o firma en las listas de asistencia',
      },
      {
        id: 'q10_d',
        text: 'Abandonar el proceso sin solicitar orientación de Bienestar al Aprendiz ni aplazamiento formal',
      },
    ],
    correctOptionId: 'q10_b',
    explanation:
      'En el Acuerdo 009 de 2024 la deserción no es automática: el SENA garantiza el debido proceso notificando al aprendiz y otorgando plazo para aportar excusas válidas antes de acudir a Comité.',
  },
];

export const DEMO_COHORT_TEMPLATES = [
  {
    suffix: '01',
    apprenticeName: 'Valentina Ríos Montoya',
    documentCode: 'APR-108421',
    completedModules: ['identidad', 'valores', 'derechos', 'deberes'] as InductionModuleId[],
    evalScore: 90,
    dimIdentity: 100,
    dimValues: 100,
    dimRights: 67,
    dimDuties: 100,
    attemptsCount: 1,
    appropriationState: 'apropiado' as const,
    instructorObservation: 'Excelente apropiación simbólica y ética. Reforzar régimen 2026 de etapa productiva (Decreto 0223 de 2026).',
  },
  {
    suffix: '02',
    apprenticeName: 'Sebastián Córdoba Mena',
    documentCode: 'APR-109534',
    completedModules: ['identidad', 'valores', 'derechos', 'deberes'] as InductionModuleId[],
    evalScore: 80,
    dimIdentity: 67,
    dimValues: 100,
    dimRights: 100,
    dimDuties: 50,
    attemptsCount: 2,
    appropriationState: 'apropiado' as const,
    instructorObservation: 'Buen dominio del Acuerdo 009/2024 y Acuerdo 002/2026; reforzar plazos de justificación de inasistencias.',
  },
  {
    suffix: '03',
    apprenticeName: 'Laura Daniela Quintero',
    documentCode: 'APR-104892',
    completedModules: ['identidad', 'valores'] as InductionModuleId[],
    evalScore: 60,
    dimIdentity: 67,
    dimValues: 100,
    dimRights: 33,
    dimDuties: 50,
    attemptsCount: 1,
    appropriationState: 'plan_mejoramiento' as const,
    instructorObservation: 'Concertado taller sobre Acuerdo 009/2024 y Acuerdo 002 de 2026 (debido proceso, derechos y SST).',
  },
  {
    suffix: '04',
    apprenticeName: 'Andrés Felipe Pabón',
    documentCode: 'APR-112047',
    completedModules: ['identidad', 'valores', 'derechos', 'deberes'] as InductionModuleId[],
    evalScore: 100,
    dimIdentity: 100,
    dimValues: 100,
    dimRights: 100,
    dimDuties: 100,
    attemptsCount: 1,
    appropriationState: 'apropiado' as const,
    instructorObservation: 'Apropiación integral sobresaliente; postulado como vocero de ficha bajo Acuerdo 009 de 2024.',
  },
  {
    suffix: '05',
    apprenticeName: 'Natalia Gómez Herrera',
    documentCode: 'APR-107319',
    completedModules: ['identidad'] as InductionModuleId[],
    evalScore: 0,
    dimIdentity: 0,
    dimValues: 0,
    dimRights: 0,
    dimDuties: 0,
    attemptsCount: 0,
    appropriationState: 'en_proceso' as const,
    instructorObservation: 'En recorrido inicial de módulos de inducción.',
  },
];
