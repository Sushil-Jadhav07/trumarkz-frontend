import React, { createContext, useContext, useEffect, useState } from 'react';

const AppContext = createContext(null);
const STORAGE_KEY = 'trumarkz_app_state';

const readStoredState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const AppProvider = ({ children }) => {
  const persistedState = readStoredState();

  const [batchEntityType, setBatchEntityType]   = useState(persistedState.batchEntityType ?? 'human');
  const [selectedIndustry, setSelectedIndustry] = useState(persistedState.selectedIndustry ?? null);
  const [selectedVerifications, setSelectedVerifications] = useState(persistedState.selectedVerifications ?? []);
  const [selectedPermission, setSelectedPermission] = useState(persistedState.selectedPermission ?? 'private');
  const [selectedHumanTemplate, setSelectedHumanTemplate] = useState(persistedState.selectedHumanTemplate ?? 'classic-blue');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [batchData, setBatchData] = useState(null);
  const [credentialData, setCredentialData] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [cartDocuments, setCartDocuments] = useState([]);

  // Product verification flow state
  const [selectedProductSector, setSelectedProductSector] = useState(persistedState.selectedProductSector ?? null);
  const [selectedProductVerifications, setSelectedProductVerifications] = useState(persistedState.selectedProductVerifications ?? []);
  const [selectedProductService, setSelectedProductService] = useState(persistedState.selectedProductService ?? null);
  const [selectedProductTemplate, setSelectedProductTemplate] = useState(persistedState.selectedProductTemplate ?? 'product-classic');
  const [productBatchData, setProductBatchData] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Batch Driver Verification completed', time: '2 min ago', read: false, icon: 'check' },
    { id: 2, title: 'New report generated', time: '1 hour ago', read: false, icon: 'file' },
    { id: 3, title: 'New report generated', time: '3 hours ago', read: false, icon: 'file' },
    { id: 4, title: 'Payment received', time: '1 day ago', read: true, icon: 'wallet' },
    { id: 5, title: 'New agency email sent', time: '2 days ago', read: true, icon: 'user' }
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          batchEntityType,
          selectedIndustry,
          selectedVerifications,
          selectedPermission,
          selectedHumanTemplate,
          selectedProductSector,
          selectedProductVerifications,
          selectedProductService,
          selectedProductTemplate,
        })
      );
    } catch {
      // Ignore persistence failures.
    }
  }, [batchEntityType, selectedIndustry, selectedVerifications, selectedPermission, selectedHumanTemplate, selectedProductSector, selectedProductVerifications, selectedProductService, selectedProductTemplate]);

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider value={{
      batchEntityType, setBatchEntityType,
      selectedIndustry, setSelectedIndustry,
      selectedVerifications, setSelectedVerifications,
      selectedPermission, setSelectedPermission,
      selectedHumanTemplate, setSelectedHumanTemplate,
      selectedTemplate, setSelectedTemplate,
      selectedFields, setSelectedFields,
      batchData, setBatchData,
      credentialData, setCredentialData,
      currentRecord, setCurrentRecord,
      cartDocuments, setCartDocuments,
      notifications, markNotificationRead, markAllRead,
      selectedProductSector, setSelectedProductSector,
      selectedProductVerifications, setSelectedProductVerifications,
      selectedProductService, setSelectedProductService,
      selectedProductTemplate, setSelectedProductTemplate,
      productBatchData, setProductBatchData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
