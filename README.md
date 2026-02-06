<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1L1TO6qcYMORCGd0cTacpTktnsnBdT2F0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_FIREBASE_API_KEY=AIzaSyB1Mvre6TiW6eOK0PTQfNn8iLh7riw2ISk
VITE_FIREBASE_AUTH_DOMAIN=posoriental-88648.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=posoriental-88648
VITE_FIREBASE_STORAGE_BUCKET=posoriental-88648.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=485487454134
VITE_FIREBASE_APP_ID=1:485487454134:web:bc3bf851c588e6d6bec317
VITE_FIREBASE_MESSAGING_SENDER_ID=485487454134
VITE_FIREBASE_APP_ID=1:485487454134:web:bc3bf851c588e6d6bec317
VITE_FIREBASE_MEASUREMENT_ID=G-54E1P0Y5D0
```

> **Note**: The application validates these variables at startup. If any are missing, it will show an alert and fail to initialize.

## Firestore Indexes

The application requires Composite Indexes for performance and sorting. We have provided a `firebase.indexes.json` file which you can deploy using `firebase deploy --only firestore:indexes`.

Required Indexes:
- Collection: `inventory_movements`
  - Fields: `branchId` (Ascending) + `createdAt` (Descending)
- Collection: `inventory_movements`
  - Fields: `createdAt` (Descending)

- `inventory_movements`: `branchId` ASC, `createdAt` DESC
- `inventory_movements`: `createdAt` DESC

## Development Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint analysis
- `npm run typecheck`: Run TypeScript type checking
- `npm run test`: Run automated tests
