import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
] as const;

export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));

export const BOOTSTRAP_ADMIN_EMAIL = 'enithmenco@gmail.com';

export class MissingWorkspaceScopesError extends Error {
  public readonly code = 'auth/missing-workspace-scopes';

  constructor() {
    super(
      'Iniciaste sesión con Google, pero faltó marcar las casillas de permisos de Google Drive y Google Sheets.'
    );
    this.name = 'MissingWorkspaceScopesError';
  }
}

export interface GoogleAuthErrorDetails {
  code: string;
  isPopupClosed: boolean;
  isPopupBlocked: boolean;
  isMissingWorkspaceScopes: boolean;
  title: string;
  message: string;
}

export function classifyGoogleAuthError(error: unknown): GoogleAuthErrorDetails {
  if (error instanceof MissingWorkspaceScopesError) {
    return {
      code: error.code,
      isPopupClosed: false,
      isPopupBlocked: false,
      isMissingWorkspaceScopes: true,
      title: 'Faltan los permisos de Google Drive y Google Sheets',
      message: error.message,
    };
  }

  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const extractedMatch = rawMessage.match(/auth\/[a-z0-9-]+/i);
  const code = rawCode || (extractedMatch ? extractedMatch[0].toLowerCase() : 'auth/unknown');

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      code,
      isPopupClosed: true,
      isPopupBlocked: false,
      isMissingWorkspaceScopes: false,
      title: 'La ventana de Google se cerró antes de completar la autorización',
      message:
        'No se finalizaron los permisos de Google Drive y Google Sheets porque la ventana emergente se cerró o fue interrumpida.',
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      isPopupBlocked: true,
      isPopupClosed: false,
      isMissingWorkspaceScopes: false,
      title: 'El navegador bloqueó la ventana emergente de Google',
      message:
        'Permite las ventanas emergentes (pop-ups) para este sitio en la barra del navegador o abre la aplicación en una pestaña nueva.',
    };
  }

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      isPopupClosed: false,
      isPopupBlocked: false,
      isMissingWorkspaceScopes: false,
      title: 'Dominio pendiente de autorización en Firebase',
      message:
        'Agrega este dominio en Firebase Console → Authentication → Settings → Authorized domains e intenta nuevamente.',
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      isPopupClosed: false,
      isPopupBlocked: false,
      isMissingWorkspaceScopes: false,
      title: 'Sin conexión con el servicio de autenticación',
      message:
        'Revisa tu conexión a internet o bloqueadores de red e intenta conectar con Google nuevamente.',
    };
  }

  return {
    code,
    isPopupClosed: false,
    isPopupBlocked: false,
    isMissingWorkspaceScopes: false,
    title: 'No se pudo completar la conexión con Google',
    message:
      'Ocurrió un inconveniente al autenticar con Google. Intenta de nuevo o abre la aplicación en una pestaña independiente.',
  };
}

// Strictly in-memory OAuth access token cache (NEVER persisted to localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let inFlightWorkspaceSignIn: Promise<{ user: User; accessToken: string }> | null = null;
let inFlightAccountSignIn: Promise<User> | null = null;
const workspaceTokenListeners = new Set<(token: string | null) => void>();

function notifyWorkspaceTokenListeners(): void {
  workspaceTokenListeners.forEach((listener) => {
    listener(cachedAccessToken);
  });
}

// Clear in-memory Workspace token automatically whenever the user signs out
onAuthStateChanged(auth, (user: User | null) => {
  if (!user) {
    if (cachedAccessToken !== null) {
      cachedAccessToken = null;
      notifyWorkspaceTokenListeners();
    }
  } else if (!isSigningIn && cachedAccessToken === null) {
    notifyWorkspaceTokenListeners();
  }
});

export function captureWorkspaceTokenFromResult(result: UserCredential): string | null {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedAccessToken = credential.accessToken;
    notifyWorkspaceTokenListeners();
    return cachedAccessToken;
  }
  return null;
}

export async function googleWorkspaceSignIn(
  forceConsent = false
): Promise<{ user: User; accessToken: string }> {
  if (inFlightWorkspaceSignIn) {
    return inFlightWorkspaceSignIn;
  }

  const runSignIn = async (): Promise<{ user: User; accessToken: string }> => {
    isSigningIn = true;
    try {
      const provider = new GoogleAuthProvider();
      SCOPES.forEach((scope) => provider.addScope(scope));

      if (forceConsent) {
        provider.setCustomParameters({ prompt: 'consent select_account' });
      } else if (auth.currentUser?.email) {
        provider.setCustomParameters({ login_hint: auth.currentUser.email });
      }

      const result = await signInWithPopup(auth, provider);
      const token = captureWorkspaceTokenFromResult(result);
      if (!token) {
        throw new MissingWorkspaceScopesError();
      }
      return { user: result.user, accessToken: token };
    } finally {
      isSigningIn = false;
      inFlightWorkspaceSignIn = null;
    }
  };

  inFlightWorkspaceSignIn = runSignIn();
  return inFlightWorkspaceSignIn;
}

export async function googleAccountSignIn(): Promise<User> {
  if (inFlightAccountSignIn) {
    return inFlightAccountSignIn;
  }

  const runAccountSignIn = async (): Promise<User> => {
    isSigningIn = true;
    try {
      const basicProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, basicProvider);
      return result.user;
    } finally {
      isSigningIn = false;
      inFlightAccountSignIn = null;
    }
  };

  inFlightAccountSignIn = runAccountSignIn();
  return inFlightAccountSignIn;
}

export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearWorkspaceAccessToken(): void {
  cachedAccessToken = null;
  notifyWorkspaceTokenListeners();
}

export function subscribeWorkspaceToken(
  listener: (token: string | null) => void
): () => void {
  workspaceTokenListeners.add(listener);
  listener(cachedAccessToken);
  return () => {
    workspaceTokenListeners.delete(listener);
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
