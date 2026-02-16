const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
// You must set GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to your service account key file before running this script.
// Example: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS env variable is not set.");
    console.error("Please download your Service Account Key from Firebase Console > Project Settings > Service Accounts");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();
const auth = admin.auth();

async function syncUserClaims() {
    console.log("Starting Custom Claims Synchronization...");

    try {
        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            console.log("No users found in Firestore 'users' collection.");
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const uid = doc.id;

            const role = userData.role || 'GUEST';
            const branchId = userData.branchId || null;

            console.log(`Processing user ${uid} (${userData.email})...`);

            if (!branchId && role !== 'ADMIN') {
                console.warn(`  - WARNING: User ${userData.email} has no branchId and is not ADMIN.`);
            }

            const claims = {
                role: role,
                branchId: branchId
            };

            try {
                await auth.setCustomUserClaims(uid, claims);
                console.log(`  + SUCCESS: Set claims for ${userData.email} -> Role: ${role}, Branch: ${branchId}`);
                updatedCount++;
            } catch (authError) {
                console.error(`  - ERROR setting claims for ${uid}:`, authError.message);
                errorCount++;
            }
        }

        console.log("------------------------------------------------");
        console.log(`Sync Complete. Updated: ${updatedCount}, Errors: ${errorCount}`);
        console.log("NOTE: Users may need to sign out and sign back in for claims to take effect.");

    } catch (error) {
        console.error("Fatal Error during sync:", error);
    }
}

// Execute
syncUserClaims();
