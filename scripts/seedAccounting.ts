import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc } from "firebase/firestore";

// Config (Need to duplicate here or import if module resolution allows, usually scripts need standalone config)
const firebaseConfig = {
    apiKey: "AIzaSyB1Mvre6TiW6eOK0PTQfNn8iLh7riw2ISk",
    authDomain: "posoriental-88648.firebaseapp.com",
    projectId: "posoriental-88648",
    storageBucket: "posoriental-88648.firebasestorage.app",
    messagingSenderId: "485487454134",
    appId: "1:485487454134:web:bc3bf851c588e6d6bec317",
    measurementId: "G-54E1P0Y5D0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Account Types & Nature Mapped
const ASSET = 'ASSET';
const LIABILITY = 'LIABILITY';
const EQUITY = 'EQUITY';
const REVENUE = 'REVENUE';
const EXPENSE = 'EXPENSE';

const DEBIT = 'DEBIT';
const CREDIT = 'CREDIT';

const accounts = [
    // 1. ACTIVOS
    { code: '1', name: 'ACTIVOS', type: ASSET, nature: DEBIT, isGroup: true, level: 1 },
    { code: '1.1', name: 'ACTIVO CIRCULANTE', type: ASSET, nature: DEBIT, isGroup: true, level: 2 },
    { code: '1.1.01', name: 'Efectivo y Equivalentes', type: ASSET, nature: DEBIT, isGroup: true, level: 3 },
    { code: '1.1.01.01', name: 'Caja General', type: ASSET, nature: DEBIT, isGroup: false, level: 4 },
    { code: '1.1.01.02', name: 'Caja Chica', type: ASSET, nature: DEBIT, isGroup: false, level: 4 },
    { code: '1.1.02', name: 'Bancos', type: ASSET, nature: DEBIT, isGroup: true, level: 3 },

    // 1.3 INVENTARIOS
    { code: '1.3', name: 'INVENTARIOS', type: ASSET, nature: DEBIT, isGroup: true, level: 2 },
    { code: '1.3.01', name: 'Inventario de Mercancía', type: ASSET, nature: DEBIT, isGroup: true, level: 3 },
    { code: '1.3.01.01', name: 'Inventario Zapatos', type: ASSET, nature: DEBIT, isGroup: false, level: 4 },

    // 2. PASIVOS
    { code: '2', name: 'PASIVOS', type: LIABILITY, nature: CREDIT, isGroup: true, level: 1 },
    { code: '2.1', name: 'PASIVO CIRCULANTE', type: LIABILITY, nature: CREDIT, isGroup: true, level: 2 },
    { code: '2.1.02', name: 'Impuestos por Pagar', type: LIABILITY, nature: CREDIT, isGroup: true, level: 3 },
    { code: '2.1.02.01', name: 'IVA por Pagar (15%)', type: LIABILITY, nature: CREDIT, isGroup: false, level: 4 },

    // 3. PATRIMONIO
    { code: '3', name: 'PATRIMONIO', type: EQUITY, nature: CREDIT, isGroup: true, level: 1 },
    { code: '3.1', name: 'Capital Social', type: EQUITY, nature: CREDIT, isGroup: true, level: 2 },

    // 4. INGRESOS
    { code: '4', name: 'INGRESOS', type: REVENUE, nature: CREDIT, isGroup: true, level: 1 },
    { code: '4.1', name: 'Ingresos Operativos', type: REVENUE, nature: CREDIT, isGroup: true, level: 2 },
    { code: '4.1.01', name: 'Ventas Netas', type: REVENUE, nature: CREDIT, isGroup: true, level: 3 },
    { code: '4.1.01.01', name: 'Ventas Gravadas', type: REVENUE, nature: CREDIT, isGroup: false, level: 4 },
    { code: '4.1.01.02', name: 'Ventas Exentas', type: REVENUE, nature: CREDIT, isGroup: false, level: 4 },

    // 5. GASTOS
    { code: '5', name: 'COSTOS Y GASTOS', type: EXPENSE, nature: DEBIT, isGroup: true, level: 1 },
    { code: '5.1', name: 'Costo de Ventas', type: EXPENSE, nature: DEBIT, isGroup: true, level: 2 },
    { code: '5.1.01', name: 'Costo de Ventas', type: EXPENSE, nature: DEBIT, isGroup: true, level: 3 },
    { code: '5.1.01.01', name: 'Costo de Ventas Zapatos', type: EXPENSE, nature: DEBIT, isGroup: false, level: 4 },
];

async function seed() {
    console.log("Starting Account Seeding...");
    for (const acc of accounts) {
        const ref = doc(db, 'accounts', acc.code);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, { ...acc, id: acc.code });
            console.log(`Created: ${acc.code} - ${acc.name}`);
        } else {
            console.log(`Skipped: ${acc.code} (Exists)`);
        }
    }
    console.log("Seeding Complete.");
    process.exit(0);
}

seed();
