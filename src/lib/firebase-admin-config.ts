
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `
[CONFIG_WARNING] Firebase Admin environment variables are not set.
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

Server-side Firebase features will not work. This is expected for client-side development.
If you are developing server-side features, please set these environment variables.
`
    );
  } else {
    throw new Error('Firebase Admin environment variables are not set.');
  }
}

export const adminConfig = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
