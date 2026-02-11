import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  initializeTestEnvironment, 
  assertFails, 
  assertSucceeds 
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// SECURITY TESTS FOR FIRESTORE RULES
// Run with: npm run test:security
// Requires: Firebase Emulators running (npm run emulators:start)

describe('Firestore Security Rules', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'pos-tienda-zapatos-test',
      firestore: {
        rules: './firestore.rules'
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('Authentication & Authorization', () => {
    it('should deny access to unauthenticated users', async () => {
      const unauthenticated = testEnv.unauthenticatedContext();
      const ref = doc(unauthenticated.firestore(), 'transactions/test123');
      await assertFails(getDoc(ref));
    });

    it('should allow authenticated users to read their own profile', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'users/user123');
      await assertSucceeds(getDoc(ref));
    });

    it('should deny users from reading other user profiles', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'users/otherUser456');
      await assertFails(getDoc(ref));
    });

    it('should allow managers to read all user profiles', async () => {
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-1' });
      const ref = doc(manager.firestore(), 'users/anyUser789');
      await assertSucceeds(getDoc(ref));
    });
  });

  describe('Transactions - INCOME/EXPENSE Validation', () => {
    const validTransaction = {
      amount: 100.50,
      type: 'INCOME',
      branchId: 'suc-1',
      date: new Date().toISOString(),
      description: 'Test sale',
      createdBy: 'user123',
      items: []
    };

    it('should allow CASHIER to create INCOME transaction for their branch', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'transactions/txn123');
      await assertSucceeds(setDoc(ref, validTransaction));
    });

    it('should allow CASHIER to create EXPENSE transaction for their branch', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'transactions/txn456');
      await assertSucceeds(setDoc(ref, { ...validTransaction, type: 'EXPENSE', amount: 50.00 }));
    });

    it('should deny CASHIER from creating transaction for different branch', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'transactions/txn789');
      await assertFails(setDoc(ref, { ...validTransaction, branchId: 'suc-2' }));
    });

    it('should deny transaction with invalid type', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'transactions/txn000');
      await assertFails(setDoc(ref, { ...validTransaction, type: 'INVALID_TYPE' }));
    });

    it('should deny transaction with negative amount', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'transactions/txn111');
      await assertFails(setDoc(ref, { ...validTransaction, amount: -100 }));
    });

    it('should deny transaction without required fields', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'transactions/txn222');
      await assertFails(setDoc(ref, { amount: 100, type: 'INCOME' }));
    });

    it('should only allow MANAGER+ to update transactions', async () => {
      // Setup: Create transaction as manager
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-1' });
      const ref = doc(manager.firestore(), 'transactions/txnUpdate');
      await setDoc(ref, validTransaction);

      // Test: CASHIER cannot update
      const cashier = testEnv.authenticatedContext('cashier123', { role: 'CASHIER', branchId: 'suc-1' });
      const cashierRef = doc(cashier.firestore(), 'transactions/txnUpdate');
      await assertFails(updateDoc(cashierRef, { amount: 200 }));

      // Test: MANAGER can update
      await assertSucceeds(updateDoc(ref, { amount: 200 }));
    });

    it('should prevent changing branchId on update', async () => {
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-1' });
      const ref = doc(manager.firestore(), 'transactions/txnBranch');
      await setDoc(ref, validTransaction);
      
      await assertFails(updateDoc(ref, { branchId: 'suc-2' }));
    });
  });

  describe('Branch Isolation', () => {
    it('should only allow reading transactions from own branch', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      
      // Setup: Create transaction in suc-1
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-1' });
      await setDoc(doc(manager.firestore(), 'transactions/txnBranch1'), {
        amount: 100,
        type: 'INCOME',
        branchId: 'suc-1',
        date: new Date().toISOString(),
        description: 'Branch 1 sale',
        createdBy: 'user123'
      });

      // Can read own branch transaction
      await assertSucceeds(getDoc(doc(user.firestore(), 'transactions/txnBranch1')));
    });

    it('should deny reading transactions from other branches', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      
      // Setup: Create transaction in suc-2
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-2' });
      await setDoc(doc(manager.firestore(), 'transactions/txnBranch2'), {
        amount: 100,
        type: 'INCOME',
        branchId: 'suc-2',
        date: new Date().toISOString(),
        description: 'Branch 2 sale',
        createdBy: 'otherUser'
      });

      // Cannot read other branch transaction
      await assertFails(getDoc(doc(user.firestore(), 'transactions/txnBranch2')));
    });

    it('should allow ADMIN to read all transactions', async () => {
      const admin = testEnv.authenticatedContext('admin123', { role: 'ADMIN', branchId: 'suc-1' });
      await assertSucceeds(getDoc(doc(admin.firestore(), 'transactions/anyTransaction')));
    });
  });

  describe('Admin Privileges', () => {
    it('should allow ADMIN to modify roles', async () => {
      const admin = testEnv.authenticatedContext('admin123', { role: 'ADMIN', branchId: 'suc-1' });
      const ref = doc(admin.firestore(), 'roles/newRole');
      await assertSucceeds(setDoc(ref, { name: 'TEST_ROLE', permissions: [] }));
    });

    it('should allow ADMIN to modify access_users', async () => {
      const admin = testEnv.authenticatedContext('admin123', { role: 'ADMIN', branchId: 'suc-1' });
      const ref = doc(admin.firestore(), 'access_users/test@example.com');
      await assertSucceeds(setDoc(ref, { email: 'test@example.com', role: 'CASHIER' }));
    });

    it('should deny MANAGER from modifying roles', async () => {
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-1' });
      const ref = doc(manager.firestore(), 'roles/newRole');
      await assertFails(setDoc(ref, { name: 'TEST_ROLE', permissions: [] }));
    });
  });

  describe('Products & Inventory', () => {
    it('should allow authenticated users to read products', async () => {
      const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(user.firestore(), 'products/product123');
      await assertSucceeds(getDoc(ref));
    });

    it('should allow MANAGER+ to write products', async () => {
      const manager = testEnv.authenticatedContext('manager123', { role: 'MANAGER', branchId: 'suc-1' });
      const ref = doc(manager.firestore(), 'products/product123');
      await assertSucceeds(setDoc(ref, { name: 'Test Product', price: 100 }));
    });

    it('should deny CASHIER from writing products', async () => {
      const cashier = testEnv.authenticatedContext('cashier123', { role: 'CASHIER', branchId: 'suc-1' });
      const ref = doc(cashier.firestore(), 'products/product456');
      await assertFails(setDoc(ref, { name: 'Test Product', price: 100 }));
    });
  });
});

describe('Security Hardening', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'pos-tienda-zapatos-test',
      firestore: {
        rules: './firestore.rules'
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('should deny access to undefined collections', async () => {
    const user = testEnv.authenticatedContext('user123', { role: 'CASHIER', branchId: 'suc-1' });
    const ref = doc(user.firestore(), 'undefinedCollection/test123');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { test: 'data' }));
  });

  it('should enforce audit log immutability', async () => {
    const admin = testEnv.authenticatedContext('admin123', { role: 'ADMIN', branchId: 'suc-1' });
    const ref = doc(admin.firestore(), 'audit_logs/log123');
    await assertFails(setDoc(ref, { action: 'test' }));
    await assertFails(deleteDoc(ref));
  });
});
