
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAWQS6K0KX5v4VcCMkc8wYMcDCy620g5a0",
    authDomain: "pos-zapatos.firebaseapp.com",
    projectId: "pos-zapatos",
    storageBucket: "pos-zapatos.firebasestorage.app",
    messagingSenderId: "717323415083",
    appId: "1:717323415083:web:12e41d5fd205ba2301c46e",
    measurementId: "G-DQTWFD2B83"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seed = async () => {
    console.log("Seeding Access Users...");

    // User list requested
    const users = [
        { email: 'admin@webdesignje.com', role: 'ADMIN', branchId: null },
        { email: 'suc1@webdesignje.com', role: 'SUC1', branchId: 'suc-1' },
        { email: 'suc2@webdesignje.com', role: 'SUC2', branchId: 'suc-2' },
        { email: 'suc3@webdesignje.com', role: 'SUC3', branchId: 'suc-3' },
    ];

    for (const u of users) {
        try {
            await setDoc(doc(db, 'access_users', u.email), {
                email: u.email,
                role: u.role,
                branchId: u.branchId,
                authorized: true,
                createdAt: new Date().toISOString()
            });
            console.log(`+ User ${u.email} [${u.role}] created.`);
        } catch (e) {
            console.error(`! Failed to create ${u.email}:`, e.message);
        }
    }

    console.log("Seeding Authorized IPs...");
    try {
        await setDoc(doc(db, 'authorized_ips', 'central_office'), {
            ip: '190.123.45.67',
            label: 'Sucursal Central',
            branchId: 'admin',
            createdAt: new Date().toISOString()
        });
        console.log("+ IP central_office created.");
    } catch (e) {
        console.error("! Failed to create IP:", e.message);
    }

    console.log("Database Seed Complete. Exiting.");
    process.exit(0);
};

seed();
