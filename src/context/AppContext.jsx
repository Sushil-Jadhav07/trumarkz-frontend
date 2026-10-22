import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrganizationNotifications } from '@/hooks/useOrganizationNotifications';
import { isConsentPage } from '@/utils/consent';

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
  const { user, role, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const notificationState = useOrganizationNotifications(isAuthenticated && role === 'organization' && user?.id && !isConsentPage(pathname) ? `${user.id}:${user.organizationId || ''}` : null);

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
      ...notificationState,
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
