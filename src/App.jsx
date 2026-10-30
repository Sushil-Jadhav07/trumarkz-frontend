import OrganizationDetail from '@/pages/admin/OrganizationDetail';
import React from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const AuthLoadingScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    className="fixed inset-0 overflow-y-auto bg-brand-bg"
  >
    <LoadingSkeleton variant="workspace" label="Loading your workspace" />
  </motion.div>
);
import { AppProvider } from '@/context/AppContext';
import LoginRegister from '@/pages/public/LoginRegister';
import ForgotPassword from '@/pages/public/ForgotPassword';
import ResetPassword from '@/pages/public/ResetPassword';
import AuthCallback from '@/pages/public/AuthCallback';
import AuthError from '@/pages/public/AuthError';
import GoogleCallback from '@/pages/public/GoogleCallback';
import DocumentUpload from '@/pages/public/DocumentUpload';
import ConsentRequest from '@/pages/public/ConsentRequest';
import CertificateAccessRequest from '@/pages/public/CertificateAccessRequest';
import CertificateAccessApprove from '@/pages/public/CertificateAccessApprove';
import OrgRegistration from '@/pages/org/OrgRegistration';
import IndividualRegistration from '@/pages/individual/IndividualRegistration';
import OTPVerification from '@/pages/org/OTPVerification';
import WelcomeKYC from '@/pages/org/WelcomeKYC';
import OrgOnboarding from '@/pages/org/OrgOnboarding';
import OrgDashboard from '@/pages/org/OrgDashboard';
import SelectIndustry from '@/pages/org/SelectIndustry';
import SelectVerifications from '@/pages/org/SelectVerifications';
import DownloadTemplate from '@/pages/org/DownloadTemplate';
import CostBreakdown from '@/pages/org/CostBreakdown';
// import CertificatePreview from '@/pages/org/CertificatePreview';
import CreateBatch from '@/pages/org/CreateBatch';
import BatchStatus, { BatchStatusDetail, WarrantyStatusDetail } from '@/pages/org/BatchStatus';
import RecordDetail from '@/pages/org/RecordDetail';
import PermissionSettings from '@/pages/org/PermissionSettings';
import SelectProductSector from '@/pages/org/SelectProductSector';
import SelectProductVerifications from '@/pages/org/SelectProductVerifications';
import SelectProductService from '@/pages/org/SelectProductService';
import ProductTemplate from '@/pages/org/ProductTemplate';
import ProductCostBreakdown from '@/pages/org/ProductCostBreakdown';
// import ProductCertificatePreview from '@/pages/org/ProductCertificatePreview';
import QRScanner from '@/pages/qr/QRScanner';
import VerificationResult from '@/pages/qr/VerificationResult';
import ReportsList from '@/pages/qr/ReportsList';
import ReportView from '@/pages/qr/ReportView';
// import RegistryHome from '@/pages/marketplace/RegistryHome';
// import SearchResults from '@/pages/marketplace/SearchResults';
// import MarketplaceRecordDetail from '@/pages/marketplace/RecordDetail';
// import SelectDocuments from '@/pages/marketplace/SelectDocuments';
// import Payment from '@/pages/marketplace/Payment';
// import DownloadDocuments from '@/pages/marketplace/DownloadDocuments';
// import BlockchainRecord from '@/pages/marketplace/BlockchainRecord';
// import PurchaseHistory from '@/pages/marketplace/PurchaseHistory';
import Profile from '@/pages/account/Profile';
import Notifications from '@/pages/account/Notifications';
import Wallet from '@/pages/account/Wallet';
import ActivityLog from '@/pages/account/ActivityLog';
import Support from '@/pages/account/Support';
import Logout from '@/pages/account/Logout';
import IndividualDashboard from '@/pages/individual/IndividualDashboard';
import SkillTree from '@/pages/individual/SkillTree';
import SkillTreeForm from '@/pages/individual/SkillTreeForm';
import IndividualCredentials from '@/pages/individual/IndividualCredentials';
import AllSkills from '@/pages/individual/AllSkills';
import ShareProfile from '@/pages/individual/ShareProfile';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import BatchMonitor, { WarrantyControlCenter } from '@/pages/admin/BatchMonitor';
import BatchControlCenter from '@/pages/admin/BatchControlCenter';
import Verifiers from '@/pages/admin/Verifiers';
import SDCVerification from '@/pages/admin/SDCVerification';
import PromoteSuperAdmin from '@/pages/admin/PromoteSuperAdmin';
import CreateSuperAdmin from '@/pages/admin/CreateSuperAdmin';
import AllUsersList from '@/pages/admin/AllUsersList';
import OrganizationList from '@/pages/admin/OrganizationList';
import EmailDrafts from '@/pages/admin/EmailDrafts';
import ProductWarrantyAdmin from '@/pages/admin/ProductWarrantyAdmin';
import ProductWarrantyUpload from '@/pages/org/ProductWarrantyUpload';
import SkillsManagement from '@/pages/admin/SkillsManagement';
import SkillVerifierUpload from '@/pages/public/SkillVerifierUpload';
import PrivacyPolicy from '@/pages/public/PrivacyPolicy';
import TermsOfService from '@/pages/public/TermsOfService';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { role, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;

  if (role !== 'super-admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const DashboardRedirect = () => {
  const { role, user } = useAuth();
  const userType = user?.userType || role;
  const path = userType === 'super-admin'
    ? '/admin/dashboard'
    : userType === 'individual'
      ? '/individual/dashboard'
      : '/org/dashboard';
  return <Navigate to={path} replace />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  // A toast belongs to the page that triggered it — it must never still be
  // showing on whatever page the user navigates to next (confusing: looks
  // like a fresh error on a page that never raised it). Toaster is mounted
  // once at the app root, so toasts survive route changes unless dismissed
  // here explicitly.
  React.useEffect(() => { toast.dismiss(); }, [location.pathname]);
  React.useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [location.pathname]);
  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/signup" element={<LoginRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/upload" element={<DocumentUpload />} />
          <Route path="/verification/manual/upload/:token" element={<DocumentUpload />} />
          <Route path="/consent/:token" element={<ConsentRequest />} />
          {/* Human Secure Certificate Access — public, no account. The approval link path is fixed by the backend email. */}
          <Route path="/certificate-access/request" element={<CertificateAccessRequest />} />
          <Route path="/certificate-access/approve/:token" element={<CertificateAccessApprove />} />
          <Route path="/verification/consent/:token" element={<ConsentRequest />} />
          <Route path="/skills/verify/upload/:token" element={<SkillVerifierUpload />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />

          {/* ── Registration routes ── */}
          <Route path="/org-registration" element={<OrgRegistration />} />
          <Route path="/signup/organization" element={<OrgRegistration />} />
          <Route path="/register" element={<OrgRegistration />} />
          <Route path="/signup/individual" element={<IndividualRegistration />} />
          <Route path="/register/individual" element={<IndividualRegistration />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/welcome" element={<WelcomeKYC />} />

          {/* ── Org routes ── */}
          <Route path="/onboarding" element={<ProtectedRoute><OrgOnboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/org/onboarding" element={<ProtectedRoute><OrgOnboarding /></ProtectedRoute>} />
          <Route path="/org/dashboard" element={<ProtectedRoute><OrgDashboard /></ProtectedRoute>} />
          <Route path="/org/industry" element={<SelectIndustry />} />
          <Route path="/org/verifications" element={<SelectVerifications />} />
          <Route path="/org/permissions" element={<PermissionSettings />} />
          <Route path="/org/template" element={<DownloadTemplate />} />
          <Route path="/org/costing" element={<CostBreakdown />} />
          {/* <Route path="/org/certificate-preview" element={<CertificatePreview />} /> */}
          <Route path="/org/create-batch" element={<CreateBatch />} />
          <Route path="/org/batch-status" element={<ProtectedRoute><BatchStatus /></ProtectedRoute>} />
          <Route path="/org/batch-status/warranty/:batchId" element={<ProtectedRoute><WarrantyStatusDetail /></ProtectedRoute>} />
          <Route path="/org/batch-status/:batchId" element={<ProtectedRoute><BatchStatusDetail /></ProtectedRoute>} />
          <Route path="/org/record/:id" element={<RecordDetail />} />

          {/* ── Product verification flow ── */}
          <Route path="/org/product/sector" element={<SelectProductSector />} />
          <Route path="/org/product/verifications" element={<SelectProductVerifications />} />
          <Route path="/org/product/service" element={<SelectProductService />} />
          <Route path="/org/product/template" element={<ProductTemplate />} />
          <Route path="/org/product/costing" element={<ProductCostBreakdown />} />
          {/* <Route path="/org/product/certificate-preview" element={<ProductCertificatePreview />} /> */}
          <Route path="/org/product/warranty" element={<ProtectedRoute><ProductWarrantyUpload /></ProtectedRoute>} />
          {/* ── QR routes ── */}
          <Route path="/qr/scan" element={<QRScanner />} />
          <Route path="/qr/result" element={<VerificationResult />} />
          <Route path="/qr/reports" element={<ReportsList />} />
          <Route path="/qr/report/:id" element={<ReportView />} />

          {/* ── Marketplace routes (removed) ──
          <Route path="/marketplace" element={<RegistryHome />} />
          <Route path="/marketplace/results" element={<SearchResults />} />
          <Route path="/marketplace/record/:id" element={<MarketplaceRecordDetail />} />
          <Route path="/marketplace/documents" element={<SelectDocuments />} />
          <Route path="/marketplace/payment" element={<Payment />} />
          <Route path="/marketplace/download" element={<DownloadDocuments />} />
          <Route path="/marketplace/blockchain" element={<BlockchainRecord />} />
          <Route path="/marketplace/history" element={<PurchaseHistory />} />
          */}

          {/* ── Account routes ── */}
          <Route path="/account/profile" element={<Profile />} />
          <Route path="/account/notifications" element={<Notifications />} />
          <Route path="/account/wallet" element={<Wallet />} />
          <Route path="/account/activity" element={<ActivityLog />} />
          <Route path="/account/support" element={<Support />} />
          <Route path="/logout" element={<Logout />} />

          {/* ── Individual routes ── */}
          <Route path="/individual/dashboard" element={<ProtectedRoute><IndividualDashboard /></ProtectedRoute>} />
          <Route path="/individual/skill-tree" element={<SkillTree />} />
          <Route path="/individual/skill-tree/build" element={<SkillTreeForm />} />
          <Route path="/individual/credentials" element={<IndividualCredentials />} />
          <Route path="/individual/all-skills" element={<AllSkills />} />
          <Route path="/individual/share" element={<ShareProfile />} />

          {/* ── Admin routes ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/batch-monitor" element={<ProtectedRoute><AdminRoute><BatchMonitor /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/batch-monitor/:batchId" element={<ProtectedRoute><AdminRoute><BatchControlCenter /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/batch-monitor/warranty/:batchId" element={<ProtectedRoute><AdminRoute><WarrantyControlCenter /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/verifiers" element={<ProtectedRoute><AdminRoute><Verifiers /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/sdc-verification" element={<ProtectedRoute><AdminRoute><SDCVerification /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/promote-super-admin" element={<ProtectedRoute><AdminRoute><PromoteSuperAdmin /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/create-super-admin" element={<ProtectedRoute><AdminRoute><CreateSuperAdmin /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/user-list" element={<ProtectedRoute><AdminRoute><AllUsersList /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/organizations" element={<ProtectedRoute><AdminRoute><OrganizationList /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/organizations/:orgId" element={<ProtectedRoute><AdminRoute><OrganizationDetail /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/organizations/:orgId/edit" element={<ProtectedRoute><AdminRoute><OrganizationDetail edit /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/email-drafts" element={<ProtectedRoute><AdminRoute><EmailDrafts /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/product-warranty" element={<ProtectedRoute><AdminRoute><ProductWarrantyAdmin /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/skills-management" element={<ProtectedRoute><AdminRoute><SkillsManagement /></AdminRoute></ProtectedRoute>} />
        </Routes>
      </div>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
            success: { style: { background: '#22C55E', color: '#fff' } },
            error: { style: { background: '#EF4444', color: '#fff' } },
          }}
        />
        <AnimatedRoutes />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
