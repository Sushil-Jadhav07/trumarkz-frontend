import React, { Suspense, lazy } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const AuthLoadingScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    className="fixed inset-0 bg-brand-bg flex items-center justify-center"
  >
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.08 }}
      className="flex flex-col items-center gap-5"
    >
      <Logo size="lg" />
      <LoadingSpinner size="md" />
      <p className="text-sm text-gray-400 font-inter tracking-wide">Loading your workspace…</p>
    </motion.div>
  </motion.div>
);
import { AppProvider } from '@/context/AppContext';
const LoginRegister = lazy(() => import('@/pages/public/LoginRegister'));
const ForgotPassword = lazy(() => import('@/pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/public/ResetPassword'));
const AuthCallback = lazy(() => import('@/pages/public/AuthCallback'));
const AuthError = lazy(() => import('@/pages/public/AuthError'));
const GoogleCallback = lazy(() => import('@/pages/public/GoogleCallback'));
const DocumentUpload = lazy(() => import('@/pages/public/DocumentUpload'));
const OrgRegistration = lazy(() => import('@/pages/org/OrgRegistration'));
const IndividualRegistration = lazy(() => import('@/pages/individual/IndividualRegistration'));
const OTPVerification = lazy(() => import('@/pages/org/OTPVerification'));
const WelcomeKYC = lazy(() => import('@/pages/org/WelcomeKYC'));
const OrgOnboarding = lazy(() => import('@/pages/org/OrgOnboarding'));
const PendingApproval = lazy(() => import('@/pages/org/PendingApproval'));
const OrgDashboard = lazy(() => import('@/pages/org/OrgDashboard'));
const SelectIndustry = lazy(() => import('@/pages/org/SelectIndustry'));
const SelectVerifications = lazy(() => import('@/pages/org/SelectVerifications'));
const DownloadTemplate = lazy(() => import('@/pages/org/DownloadTemplate'));
const CertificatePreview = lazy(() => import('@/pages/org/CertificatePreview'));
const CostBreakdown = lazy(() => import('@/pages/org/CostBreakdown'));
const BatchStatus = lazy(() => import('@/pages/org/BatchStatus'));
const RecordDetail = lazy(() => import('@/pages/org/RecordDetail'));
const PermissionSettings = lazy(() => import('@/pages/org/PermissionSettings'));
const SelectTemplate = lazy(() => import('@/pages/credential/SelectTemplate'));
const SelectFields = lazy(() => import('@/pages/credential/SelectFields'));
const CredentialPreview = lazy(() => import('@/pages/credential/CredentialPreview'));
const ShareCredential = lazy(() => import('@/pages/credential/ShareCredential'));
const QRScanner = lazy(() => import('@/pages/qr/QRScanner'));
const VerificationResult = lazy(() => import('@/pages/qr/VerificationResult'));
const ReportsList = lazy(() => import('@/pages/qr/ReportsList'));
const ReportView = lazy(() => import('@/pages/qr/ReportView'));
const RegistryHome = lazy(() => import('@/pages/marketplace/RegistryHome'));
const SearchResults = lazy(() => import('@/pages/marketplace/SearchResults'));
const MarketplaceRecordDetail = lazy(() => import('@/pages/marketplace/RecordDetail'));
const SelectDocuments = lazy(() => import('@/pages/marketplace/SelectDocuments'));
const Payment = lazy(() => import('@/pages/marketplace/Payment'));
const DownloadDocuments = lazy(() => import('@/pages/marketplace/DownloadDocuments'));
const BlockchainRecord = lazy(() => import('@/pages/marketplace/BlockchainRecord'));
const PurchaseHistory = lazy(() => import('@/pages/marketplace/PurchaseHistory'));
const Profile = lazy(() => import('@/pages/account/Profile'));
const Notifications = lazy(() => import('@/pages/account/Notifications'));
const Wallet = lazy(() => import('@/pages/account/Wallet'));
const ActivityLog = lazy(() => import('@/pages/account/ActivityLog'));
const Support = lazy(() => import('@/pages/account/Support'));
const Logout = lazy(() => import('@/pages/account/Logout'));
const IndividualDashboard = lazy(() => import('@/pages/individual/IndividualDashboard'));
const SkillTree = lazy(() => import('@/pages/individual/SkillTree'));
const SkillTreeForm = lazy(() => import('@/pages/individual/SkillTreeForm'));
const IndividualCredentials = lazy(() => import('@/pages/individual/IndividualCredentials'));
const ShareProfile = lazy(() => import('@/pages/individual/ShareProfile'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const OrgApprovals = lazy(() => import('@/pages/admin/OrgApprovals'));
const BatchMonitor = lazy(() => import('@/pages/admin/BatchMonitor'));
const Verifiers = lazy(() => import('@/pages/admin/Verifiers'));
const PricingConfig = lazy(() => import('@/pages/admin/PricingConfig'));
const Disputes = lazy(() => import('@/pages/admin/Disputes'));
const PlatformHealth = lazy(() => import('@/pages/admin/PlatformHealth'));
const SDCVerification = lazy(() => import('@/pages/admin/SDCVerification'));

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
  React.useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [location.pathname]);
  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname}>
        <Suspense fallback={<AuthLoadingScreen />}>
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
          <Route path="/org/pending-approval" element={<PendingApproval />} />
          <Route path="/org/dashboard" element={<ProtectedRoute><OrgDashboard /></ProtectedRoute>} />
          <Route path="/org/industry" element={<ProtectedRoute><SelectIndustry /></ProtectedRoute>} />
          <Route path="/org/verifications" element={<ProtectedRoute><SelectVerifications /></ProtectedRoute>} />
          <Route path="/org/permissions" element={<ProtectedRoute><PermissionSettings /></ProtectedRoute>} />
          <Route path="/org/template" element={<ProtectedRoute><DownloadTemplate /></ProtectedRoute>} />
          <Route path="/org/certificate-preview" element={<ProtectedRoute><CertificatePreview /></ProtectedRoute>} />
          <Route path="/org/cost-breakdown" element={<ProtectedRoute><CostBreakdown /></ProtectedRoute>} />
          <Route path="/org/create-batch" element={<ProtectedRoute><CertificatePreview /></ProtectedRoute>} />
          <Route path="/org/batch-status" element={<ProtectedRoute><BatchStatus /></ProtectedRoute>} />
          <Route path="/org/record/:id" element={<ProtectedRoute><RecordDetail /></ProtectedRoute>} />

          {/* ── Credential routes ── */}
          <Route path="/credential/template" element={<SelectTemplate />} />
          <Route path="/credential/fields" element={<SelectFields />} />
          <Route path="/credential/preview" element={<CredentialPreview />} />
          <Route path="/credential/share" element={<ShareCredential />} />

          {/* ── QR routes ── */}
          <Route path="/qr/scan" element={<QRScanner />} />
          <Route path="/qr/result" element={<VerificationResult />} />
          <Route path="/qr/reports" element={<ReportsList />} />
          <Route path="/qr/report/:id" element={<ReportView />} />

          {/* ── Marketplace routes ── */}
          <Route path="/marketplace" element={<RegistryHome />} />
          <Route path="/marketplace/results" element={<SearchResults />} />
          <Route path="/marketplace/record/:id" element={<MarketplaceRecordDetail />} />
          <Route path="/marketplace/documents" element={<SelectDocuments />} />
          <Route path="/marketplace/payment" element={<Payment />} />
          <Route path="/marketplace/download" element={<DownloadDocuments />} />
          <Route path="/marketplace/blockchain" element={<BlockchainRecord />} />
          <Route path="/marketplace/history" element={<PurchaseHistory />} />

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
          <Route path="/individual/share" element={<ShareProfile />} />

          {/* ── Admin routes ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/org-approvals" element={<ProtectedRoute><AdminRoute><OrgApprovals /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/batch-monitor" element={<ProtectedRoute><AdminRoute><BatchMonitor /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/verifiers" element={<ProtectedRoute><AdminRoute><Verifiers /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/sdc-verification" element={<ProtectedRoute><AdminRoute><SDCVerification /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute><AdminRoute><PricingConfig /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/disputes" element={<ProtectedRoute><AdminRoute><Disputes /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/platform-health" element={<ProtectedRoute><AdminRoute><PlatformHealth /></AdminRoute></ProtectedRoute>} />
        </Routes>
        </Suspense>
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
