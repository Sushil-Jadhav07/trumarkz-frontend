import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);
const HUMAN_FLOW_STORAGE_KEY = 'trumarkz_human_verification_flow';

const createEmptyBatchData = () => ({
  batchName: '',
  description: '',
  file: null,
  fileName: '',
  recordCount: 0,
  totalColumns: 0,
  baseFields: [],
  customFields: [],
  uploadResponse: null,
});

const loadStoredHumanFlow = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HUMAN_FLOW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const AppProvider = ({ children }) => {
  const storedFlow = loadStoredHumanFlow();
  const [selectedIndustry, setSelectedIndustry] = useState(storedFlow?.selectedIndustry || []);
  const [selectedVerifications, setSelectedVerifications] = useState(storedFlow?.selectedVerifications || []);
  const [selectedTemplate, setSelectedTemplate] = useState(storedFlow?.selectedTemplate || null);
  const [selectedFields, setSelectedFields] = useState(storedFlow?.selectedFields || []);
  const [batchData, setBatchData] = useState({
    ...createEmptyBatchData(),
    ...(storedFlow?.batchData || {}),
    file: null,
  });
  const [credentialVisibility, setCredentialVisibility] = useState(storedFlow?.credentialVisibility || 'public');
  const [credentialData, setCredentialData] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [cartDocuments, setCartDocuments] = useState([]);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Batch Driver Verification completed', time: '2 min ago', read: false, icon: 'check' },
    { id: 2, title: 'New report generated', time: '1 hour ago', read: false, icon: 'file' },
    { id: 3, title: 'New report generated', time: '3 hours ago', read: false, icon: 'file' },
    { id: 4, title: 'Payment received', time: '1 day ago', read: true, icon: 'wallet' },
    { id: 5, title: 'New agency email sent', time: '2 days ago', read: true, icon: 'user' }
  ]);

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleIndustry = (industry) => {
    setSelectedIndustry((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      return current.some((item) => item.id === industry.id)
        ? current.filter((item) => item.id !== industry.id)
        : [...current, industry];
    });
  };

  const resetHumanVerificationFlow = () => {
    setSelectedVerifications([]);
    setSelectedTemplate(null);
    setSelectedFields([]);
    setCredentialVisibility('public');
    setBatchData(createEmptyBatchData());
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(HUMAN_FLOW_STORAGE_KEY);
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedState = {
      selectedIndustry,
      selectedVerifications,
      selectedTemplate,
      selectedFields,
      credentialVisibility,
      batchData: {
        ...batchData,
        file: null,
      },
    };
    window.localStorage.setItem(HUMAN_FLOW_STORAGE_KEY, JSON.stringify(persistedState));
  }, [
    selectedIndustry,
    selectedVerifications,
    selectedTemplate,
    selectedFields,
    credentialVisibility,
    batchData,
  ]);

  return (
    <AppContext.Provider value={{
      selectedIndustry, setSelectedIndustry, toggleIndustry,
      selectedVerifications, setSelectedVerifications,
      selectedTemplate, setSelectedTemplate,
      selectedFields, setSelectedFields,
      batchData, setBatchData,
      credentialVisibility, setCredentialVisibility,
      resetHumanVerificationFlow,
      credentialData, setCredentialData,
      currentRecord, setCurrentRecord,
      cartDocuments, setCartDocuments,
      notifications, markNotificationRead, markAllRead
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
