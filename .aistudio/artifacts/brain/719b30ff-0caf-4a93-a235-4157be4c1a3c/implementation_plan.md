# Sincronización en Vivo con Google Sheets y Google Drive (Inducción SENA y Formato GFPI-F-165)

Este plan define la arquitectura y experiencia de usuario para crear automáticamente un libro de cálculo en Google Drive y actualizar sus filas a medida que los aprendices registran su matrícula en Ficha, su Evaluación Diagnóstica y el Formato Oficial **GFPI-F-165** (*Selección y Modificación de Alternativa de Etapa Productiva*).

---

## Revisión del Usuario y Decisiones Clave

> [!NOTE]
> **Sobre la plantilla Excel local (`GFPI-F-165FormatoSeleccionModificacionAlternativaEtapaProductiva`)**: Por seguridad del navegador web, la aplicación no puede abrir directamente rutas locales del computador (`C:\Users\SENA\Downloads\...`). Por ello, el sistema incorporará de fábrica **todas las secciones, casillas `"X"` y campos oficiales del formato SENA GFPI-F-165** al crear la hoja en Google Sheets y, adicionalmente, incluirá un botón opcional **Importar referencia `.xlsx` desde mi equipo** en el panel del instructor por si deseas cargar tu archivo local para verificar o adaptar encabezados personalizados.

> [!IMPORTANT]
> Revisa las siguientes decisiones recomendadas antes de iniciar la construcción. Si estás de acuerdo, pulsa **Proceed**; si prefieres cambiar alguna opción, indícalo en el chat:

- **Estructura del libro en Google Drive (Recomendado)**: Un libro de Google Sheets por Ficha o cohorte activa con **4 pestañas estructuradas**:
  1. `Consolidado_Induccion`: Estado integral de cada aprendiz (progreso en las 4 dimensiones, puntaje evaluativo, estado de apropiación y alternativa elegida).
  2. `Respuestas_GFPI_F_165`: Base de datos tabular con todos los campos oficiales del formato GFPI-F-165 y marcación automática con `"X"` en la alternativa seleccionada.
  3. `Formato_GFPI_F_165_Individual`: Maquetación oficial en cuadrícula SENA lista para consultar o exportar en PDF seleccionando el documento de cualquier aprendiz registrado.
  4. `Historial_Evaluaciones`: Registro cronológico de cada intento presentado en la evaluación de inducción.
- **Cuenta que aloja y sincroniza el archivo (Recomendado)**: El archivo se crea y actualiza en el **Google Drive del Instructor** mediante conexión con Google desde su panel de gestión. Los aprendices **no** necesitan permisos sobre el Google Drive del instructor: sus respuestas se guardan al instante en la base de datos de la plataforma y se reflejan automáticamente en la hoja vinculada.
- **Modo de actualización al responder (Recomendado)**: **Actualización inteligente por documento del aprendiz (sin duplicar filas)** en las pestañas consolidadas y de GFPI-F-165 cuando un aprendiz guarda borrador o radica una modificación, anexando únicamente filas nuevas en `Historial_Evaluaciones`.
- **Restricciones institucionales preservadas**:
  - El ingreso a la vista **Instructor** continúa siendo **directo y sin contraseña**; conectar Google Drive / Google Sheets es una acción explícita dentro del panel.
  - En **Mi Perfil** del aprendiz y en la vista del aprendiz del formato **GFPI-F-165** no aparecerá ningún dato del instructor ni metadatos de la hoja de Google Drive.

---

## 1. Visión General y Concepto Central

- **Qué hace**: Permite al instructor generar con un clic una hoja de cálculo oficial en su Google Drive (o vincular una ya creada por la aplicación) y mantenerla sincronizada conforme cada aprendiz diligencia sus datos personales/académicos, presenta la evaluación del Reglamento (Acuerdo 009 de 2024, Acuerdo 002 de 2026 y Decreto 0223 de 2026) y radica su formato **GFPI-F-165**.
- **Usuarios objetivo**:
  - **Aprendices en Inducción**: Diligencian su perfil, su formato GFPI-F-165 (con datos de contacto, ficha, fechas de etapa lectiva/productiva, alternativa marcada y firma de autorización Ley 1581 de 2012) y su evaluación sin fricciones adicionales.
  - **Instructores y Coordinación Académica**: Centralizan en tiempo real la trazabilidad de la ficha directamente en Google Sheets dentro de su Google Drive, lista para seguimiento, filtros o impresión oficial.
- **Valor principal**: Elimina la digitación manual y la consolidación dispersa de archivos Excel individuales, asegurando que cada respuesta o actualización del aprendiz quede estructurada en Google Drive con formato institucional SENA.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujos Clave Paso a Paso

1. **Diligenciamiento por parte del Aprendiz (Transparencia Total)**:
   - El aprendiz completa el **Formato GFPI-F-165** incluyendo los campos oficiales del documento SENA: tipo de trámite (*Selección* o *Modificación*), identificación, correo electrónico, teléfono de contacto, ciudad/dirección de residencia, programa, ficha, centro/regional, fechas de etapa lectiva y productiva, alternativa elegida entre las 6 opciones vigentes, datos de la empresa o unidad coformadora (cuando aplique) y autorización de tratamiento de datos (Ley 1581 de 2012).
   - Al guardar borrador o radicar el formato, el registro queda almacenado inmediatamente en la base en tiempo real de la aplicación sin mostrar información del instructor.

2. **Conexión con Google Drive y Creación de la Hoja (Panel del Instructor)**:
   - El instructor entra directamente a su panel sin contraseña y ubica el nuevo bloque **Sincronización con Google Drive · Google Sheets**.
   - Si aún no ha otorgado acceso a Google Workspace en la sesión actual, visualiza el botón oficial **Sign in with Google** para autorizar permisos mínimos de creación y edición sobre hojas generadas por la aplicación.
   - Opcionalmente, puede cargar su archivo Excel local `GFPI-F-165` como referencia de columnas adicionales, o usar directamente la estructura oficial SENA integrada.
   - Al pulsar **Crear hoja de cálculo en Google Drive**, se abre un modal de confirmación claro indicando el nombre del archivo a crear (ej. `SENA Inducción · Ficha 2874590 · GFPI-F-165`), las 4 pestañas que se configurarán y la cantidad inicial de aprendices a sincronizar.

3. **Sincronización a Medida que los Aprendices Responden**:
   - Una vez creada y confirmada la hoja activa para la sesión, el panel escucha en vivo cada nueva respuesta o modificación de los aprendices de la Ficha seleccionada.
   - Cuando llega una respuesta nueva, el indicador de sincronización detecta el cambio y actualiza la fila correspondiente del aprendiz (previa autorización explícita de escritura confirmada por el instructor en el modal de control, evitando mutaciones silenciosas no autorizadas).
   - El panel muestra el enlace directo **Abrir en Google Sheets**, la marca de tiempo de la última sincronización y el conteo exacto de filas sincronizadas vs. pendientes.

### Identidad Visual y Tema

- **Dirección Estética**: Consola institucional limpia de alta densidad informativa, coherente con la identidad oficial del SENA y el modo Claro/Oscuro con transición suave existente en la barra superior.
- **Paleta y Distribución 60-30-10**:
  - **60% Lienzo Neutro**: Superficies blancas limpias en modo claro y pizarra profunda en modo oscuro.
  - **30% Superficies Estructurales**: Contenedores de un solo nivel de elevación con bordes finos de `1px` y divisores sutiles (sin tarjetas anidadas ni bordes laterales gruesos).
  - **10% Acento Institucional**: Verde SENA (`#39A900`) para acciones primarias y estados confirmados, acompañado siempre de etiquetas textuales explícitas para accesibilidad cromática.
- **Tipografía y Disciplina Tabular**:
  - Jerarquía limpia en encabezados y cuerpo legible para formularios densos.
  - Uso estricto de cifras tabulares (`tabular-nums`) y fuente monoespaciada para códigos de ficha, números de documento, radicados `GFPI-F-165`, conteos de filas sincronizadas y marcas de tiempo.
- **Estados Completos de Interfaz**:
  - *Sin conectar*: Explicación concisa del beneficio y botón oficial **Sign in with Google**.
  - *Conectado sin hoja creada*: Selector de configuración y acción primaria **Crear hoja en Google Drive**.
  - *Sincronizando / Activo*: Conteo tabular de aprendices sincronizados, estado textual claro (`Sincronizado`, `Cambios pendientes`, `Error de permisos`), botón manual **Sincronizar cambios** y enlace externo seguro a Google Sheets.
  - *Modal de Confirmación*: Cuadro de diálogo propio de la interfaz (nunca alertas nativas del navegador) detallando el nombre de la hoja y el número exacto de registros antes de escribir o actualizar celdas en Google Sheets.

---

## 3. Decisiones de Producto y Compensaciones

- **Decisión 1: Permisos de Mínimo Privilegio en Google Workspace**
  - *Enfoque elegido*: Solicitar únicamente permisos sobre archivos creados por la aplicación en Google Drive (`drive.file`) y gestión de hojas de cálculo (`spreadsheets`).
  - *Por qué*: Protege la privacidad del usuario evitando solicitar acceso de lectura o escritura a todo el resto de archivos personales de su Google Drive, cumpliendo estrictamente el principio de mínimo privilegio.
  - *Alternativas descartadas*: Permiso amplio sobre todo Google Drive (`drive`), descartado por ser innecesariamente invasivo para crear y actualizar la matriz de inducción.

- **Decisión 2: Sincronización Centralizada vía Base en Tiempo Real + Panel del Instructor**
  - *Enfoque elegido*: Los aprendices guardan sus respuestas en la base de datos en la nube/local de la aplicación y el panel conectado del instructor sincroniza esos registros hacia la hoja de Google Sheets en su Google Drive, tanto en tiempo real mientras la sesión está activa como al reabrir el panel (reconciliando respuestas recibidas mientras estaba desconectado).
  - *Por qué*: Los tokens de acceso de Google Workspace pertenecen a cada usuario individual; exigir que cada aprendiz tenga permisos de edición directa sobre el archivo Excel/Sheets del instructor expondría los datos personales de toda la ficha entre aprendices y generaría errores de permisos.
  - *Alternativas descartadas*: Compartir una hoja pública editable por cualquier aprendiz, descartado por riesgo de borrado accidental y exposición de datos personales protegidos por la Ley 1581 de 2012.

- **Decisión 3: Seguridad de Credenciales en Memoria y Confirmación Explícita**
  - *Enfoque elegido*: Conservar el token de acceso de Google exclusivamente en memoria durante la sesión activa (limpiándolo al cerrar sesión) y exigir confirmación explícita del usuario en un modal antes de ejecutar escrituras sobre una hoja existente en Google Drive.
  - *Por qué*: Impide filtraciones de credenciales en almacenamiento local del navegador y garantiza control transparente sobre cualquier modificación en archivos del usuario.

---

## 4. Arquitectura Técnica y Estrategia de Datos

### Diagrama de Arquitectura y Flujo de Datos

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                        EXPERIENCIA DEL APRENDIZ                              │
│  ┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │  Perfil y Ficha     │  │  Formato GFPI-F-165  │  │ Evaluación 4 Dim.   │  │
│  │ (Sin datos instr.)  │  │ (6 Alternativas + X) │  │ (Reglamento 2026)   │  │
│  └──────────┬──────────┘  └──────────┬───────────┘  └──────────┬──────────┘  │
└─────────────┼────────────────────────┼─────────────────────────┼─────────────┘
              │                        │                         │
              ▼                        ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               CAPA DE PERSISTENCIA Y ESCUCHA EN TIEMPO REAL                  │
│   • Colecciones seguras por Ficha, Perfiles, Evaluaciones y GFPI-F-165       │
│   • Almacén local de respaldo para pruebas inmediatas en el mismo equipo     │
│   • Suscripción reactiva de cambios nuevos o actualizados por documento      │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Flujo en vivo de respuestas
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│             PANEL DEL INSTRUCTOR (INGRESO DIRECTO SIN CONTRASEÑA)            │
│                                                                              │
│  ┌────────────────────────────┐      ┌────────────────────────────────────┐  │
│  │ Autenticación Google OAuth │─────▶│ Modal de Confirmación de Escritura │  │
│  │ (Token solo en memoria)    │      │ (Archivo destino + N° de filas)    │  │
│  └────────────────────────────┘      └─────────────────┬──────────────────┘  │
│                                                        │ Confirmado          │
│                                                        ▼                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │          MOTOR DE CONSTRUCCIÓN Y UPSERT EN GOOGLE SHEETS               │  │
│  │  1. Consulta metadatos reales de pestañas (sin asumir nombres fijos)   │  │
│  │  2. Empareja por Tipo/Número de Documento para actualizar o insertar   │  │
│  │  3. Aplica formato institucional SENA y casillas "X" de GFPI-F-165     │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │ Solicitudes HTTPS autenticadas (Bearer)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     GOOGLE DRIVE & GOOGLE SHEETS API                         │
│  ┌───────────────────────┬───────────────────────┬────────────────────────┐  │
│  │ Consolidado_Induccion │ Respuestas_GFPI_F_165 │ Formato_GFPI_Individual│  │
│  └───────────────────────┴───────────────────────┴────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Historial_Evaluaciones (Trazabilidad completa de intentos por fecha)   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Datos y Estructura de Pestañas en Google Sheets

1. **Ampliación Fiel del Formato GFPI-F-165**:
   - Se complementa el registro `GFPI-F-165` con los datos de contacto habituales de la planilla oficial SENA (*Correo electrónico*, *Teléfono celular*, *Dirección y municipio de residencia*, *Contacto/Jefe inmediato en empresa coformadora* opcional), manteniendo validación estricta de longitud y aislamiento de datos personales en las reglas de seguridad.

2. **Esquema de las 4 Pestañas Generadas en Google Sheets**:
   - **Pestaña 1 · `Consolidado_Induccion`**:
     - Columnas: `Tipo Doc`, `Número Documento`, `Nombres y Apellidos`, `Ficha`, `Programa de Formación`, `Jornada`, `Módulos Completados (4)`, `Puntaje Evaluación (%)`, `Identidad (%)`, `Valores (%)`, `Derechos (%)`, `Deberes (%)`, `Estado Apropiación`, `Estado GFPI-F-165`, `Alternativa Etapa Productiva`, `Última Actualización`.
   - **Pestaña 2 · `Respuestas_GFPI_F_165`**:
     - Columnas alineadas con el formato oficial: `Radicado`, `Fecha Diligenciamiento`, `Trámite: Selección [X]`, `Trámite: Modificación [X]`, `Tipo Doc`, `Número Documento`, `Nombres y Apellidos`, `Correo Electrónico`, `Teléfono Contacto`, `Dirección / Municipio`, `Regional y Centro`, `Ficha`, `Nivel`, `Programa`, `Inicio Etapa Lectiva`, `Fin Etapa Lectiva`, casillas individuales `[X]` para cada una de las **6 Alternativas Reglamentarias** (*Contrato de Aprendizaje*, *Vínculo Formativo/Laboral*, *Proyecto Productivo*, *Economía Popular / CampeSENA*, *Monitoría*, *Pasantía*), `Empresa / Entidad Coformadora`, `NIT`, `Ciudad Empresa`, `Contacto Empresa`, `Inicio Etapa Productiva`, `Fin Etapa Productiva`, `Justificación / Sustento`, `Autorización Ley 1581 [Sí/No]`, `Firma Aprendiz`, `Estado Trámite`.
   - **Pestaña 3 · `Formato_GFPI_F_165_Individual`**:
     - Diseño visual en celdas combinadas y bordes institucionales que replica la planilla oficial `GFPI-F-165` del SENA. Incluye una celda selectora de **Número de Documento** en la parte superior que rellena automáticamente con fórmulas nativas de Google Sheets (`INDEX`/`MATCH` o `XLOOKUP` sobre `Respuestas_GFPI_F_165`) todas las casillas y las `"X"` del aprendiz elegido para descarga inmediata en PDF o impresión.
   - **Pestaña 4 · `Historial_Evaluaciones`**:
     - Columnas: `ID Intento`, `Fecha y Hora`, `Ficha`, `Aprendiz`, `Puntaje Global (%)`, `Resultado`, `Identidad (%)`, `Valores (%)`, `Derechos (%)`, `Deberes (%)`, `Aciertos`, `Duración (s)`.

3. **Vínculo Persistente de Hoja por Ficha**:
   - Cada Ficha guarda la referencia de su `spreadsheetId`, `spreadsheetUrl`, título del archivo y marca de última sincronización para que el instructor no tenga que recrear el archivo cada vez que ingrese al panel.

### Mapeo de Componentes Interactivos y Estado

- **Tarjeta de Conexión y Sincronización (Panel del Instructor)**:
  - *Conectar cuenta Google*: Inicia el flujo emergente con los permisos de Google Sheets y Google Drive; guarda el token únicamente en memoria y actualiza el estado de conexión.
  - *Importar referencia `.xlsx` opcional*: Lee en el navegador las hojas y encabezados de un archivo Excel seleccionado localmente para mostrar correspondencia con las columnas del formato `GFPI-F-165`.
  - *Crear nueva hoja en Google Drive*: Abre el modal de confirmación; al confirmar, crea el archivo mediante la API de Google Sheets, aplica formato de encabezados institucionales, congela filas superiores, configura las fórmulas de la pestaña individual `Formato_GFPI_F_165_Individual` y escribe el lote inicial de aprendices.
  - *Modo de sincronización automática en sesión*: Permite al instructor autorizar explícitamente en un modal que las respuestas entrantes de la Ficha activa durante la sesión abierta actualicen la hoja vinculada a medida que llegan, con opción de pausar en cualquier momento o ejecutar sincronización manual con vista previa de cambios pendientes.
  - *Recuperación ante expiración de sesión*: Si el token en memoria expira o la página se recarga, las respuestas de los aprendices siguen acumulándose sin pérdida en la base de datos y la interfaz muestra un aviso claro para reconectar con un clic y sincronizar las filas pendientes.
