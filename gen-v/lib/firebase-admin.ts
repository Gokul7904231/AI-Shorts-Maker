import * as admin from "firebase-admin";

const hasCredentials = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

if (!admin.apps.length && hasCredentials) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newline characters to parse properly in cloud environments
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    console.error("Firebase admin initialization error:", error.message);
  }
}

// Export safe stubs for build-time compilation when credentials are not available
const mockQuerySnapshot = {
  empty: true,
  docs: [],
  forEach: (cb: any) => {},
};

const mockQuery: any = {
  where: () => mockQuery,
  orderBy: () => mockQuery,
  limit: () => mockQuery,
  get: async () => mockQuerySnapshot,
};

const mockCollection = {
  doc: () => ({
    set: async () => {},
    get: async () => ({ exists: false, data: () => null }),
    update: async () => {},
    delete: async () => {},
  }),
  where: () => mockQuery,
  orderBy: () => mockQuery,
  limit: () => mockQuery,
  get: async () => mockQuerySnapshot,
};

export const db = (admin.apps.length
  ? admin.firestore()
  : {
      collection: () => mockCollection,
      batch: () => ({
        update: () => {},
        commit: async () => {},
      }),
    }) as unknown as admin.firestore.Firestore;

export const bucket = (admin.apps.length
  ? admin.storage().bucket()
  : {
      file: () => ({
        exists: async () => [false],
        delete: async () => {},
      }),
    }) as unknown as any;
