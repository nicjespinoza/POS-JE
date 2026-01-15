import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { POS } from './components/POS';
import { AdminDashboard } from './components/AdminDashboard';
import { Role, Transaction, Product, RoleDefinition, TransactionType } from './types';
import { CURRENCIES } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { signInWithPopup, googleProvider, auth, signOut } from './services/firebase';

const AppContent: React.FC = () => {
  const { user, userProfile, isAdmin, isManager, isCashier, loading: authLoading } = useAuth();
  const {
    products,
    transactions,
    categories,
    roles,
    addProduct,
    updateProduct,
    deleteProduct,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    // Add missing category/role update methods to DataContext if needed, 
    // for now we might need to mock them or implement them in DataContext
  } = useData();

  const [currentRole, setCurrentRole] = useState<Role>(Role.GUEST);
  const [isDark, setIsDark] = useState(true);
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  // Tax and Low Stock could also be moved to Firestore Global Settings collection
  const [taxRate, setTaxRate] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    if (userProfile) {
      if (isAdmin) setCurrentRole(Role.ADMIN);
      else if (isCashier) setCurrentRole(Role.CASHIER);
      else setCurrentRole(Role.GUEST);
    } else {
      setCurrentRole(Role.GUEST);
    }
  }, [userProfile, isAdmin, isCashier]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogin = async (requestedRole: Role) => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Role is determined by Firestore profile in AuthContext, 
      // but we could set a transient state if needed.
    } catch (error) {
      console.error("Login failed", error);
      alert("Error al iniciar sesión con Google");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentRole(Role.GUEST);
  };

  // Adapters for DataContext methods to match Props
  const handleAddProduct = (p: Product) => addProduct(p);
  const handleUpdateProduct = (p: Product) => updateProduct(p);
  const handleDeleteProduct = (id: string) => deleteProduct(id);

  const handleTransaction = (t: Transaction) => addTransaction(t);
  const handleEditTransaction = (t: Transaction) => updateTransaction(t);
  const handleDeleteTransaction = (id: string) => deleteTransaction(id);

  // Bulk operations not yet in DataContext, mocking for UI stability
  const handleBulkDeleteTransactions = (ids: string[]) => console.warn("Bulk delete not impl");
  const handleBulkEditTransactions = (ids: string[], u: Partial<Transaction>) => console.warn("Bulk edit not impl");

  // Category/Role updates need implementation in DataContext
  const handleUpdateCategories = (c: any) => console.log("Category update not syncd yet", c);
  const handleUpdateRoles = (r: RoleDefinition[]) => console.log("Role update not syncd yet", r);

  const handleCurrencyChange = (code: string) => {
    const selected = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
    setCurrency(selected);
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-black text-white">Cargando Sistema...</div>;

  return (
    <>
      {currentRole === Role.GUEST && (
        <LandingPage
          onLogin={handleLogin}
          toggleTheme={toggleTheme}
          isDark={isDark}
        />
      )}

      {currentRole === Role.CASHIER && (
        <POS
          products={products}
          transactions={transactions}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onProcessSale={handleTransaction}
          onLogout={handleLogout}
          toggleTheme={toggleTheme}
          isDark={isDark}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          taxRate={taxRate}
          lowStockThreshold={lowStockThreshold}
        />
      )}

      {currentRole === Role.ADMIN && (
        <AdminDashboard
          transactions={transactions}
          products={products}
          onLogout={handleLogout}
          onAddTransaction={handleTransaction}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onBulkDeleteTransactions={handleBulkDeleteTransactions}
          onBulkEditTransactions={handleBulkEditTransactions}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          categories={categories}
          onUpdateCategories={handleUpdateCategories}
          roles={roles}
          onUpdateRoles={handleUpdateRoles}
          toggleTheme={toggleTheme}
          isDark={isDark}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          taxRate={taxRate}
          onUpdateTaxRate={setTaxRate}
          lowStockThreshold={lowStockThreshold}
          onUpdateLowStockThreshold={setLowStockThreshold}
          adminEmail={adminEmail}
          onUpdateAdminEmail={setAdminEmail}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;