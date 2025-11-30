# Firebase Configuration

To complete the Firebase integration, you need to create a `.env.local` file in the root of your project with the following variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# Admin SDK (Optional for client-side auth, required for server-side verification)
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=YOUR_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY="YOUR_PRIVATE_KEY"
```

You can find these values in your Firebase Console under Project Settings.

## Firebase CLI Setup

Since the Firebase CLI requires interactive login, please run the following commands in your terminal:

1.  **Login**:
    ```bash
    npx firebase login
    ```
2.  **Initialize** (if needed):
    ```bash
    npx firebase init
    ```

