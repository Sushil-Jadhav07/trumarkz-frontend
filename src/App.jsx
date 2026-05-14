import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import SplashScreen from '@/pages/public/SplashScreen';
import LoginRegister from '@/pages/public/LoginRegister';
import DocumentUpload from '@/pages/public/DocumentUpload';
import OrgRegistration from '@/pages/org/OrgRegistration';
import IndividualRegistration from '@/pages/individual/IndividualRegistration';
import OTPVerification from '@/pages/org/OTPVerification';
import WelcomeKYC from '@/pages/org/WelcomeKYC';
import PendingApproval from '@/pages/org/PendingApproval';
import OrgDashboard from '@/pages/org/OrgDashboard';
import SelectIndustry from '@/pages/org/SelectIndustry';
import SelectVerifications from '@/pages/org/SelectVerifications';
import DownloadTemplate from '@/pages/org/DownloadTemplate';
import CreateBatch from '@/pages/org/CreateBatch';
import BatchStatus from '@/pages/org/BatchStatus';
import RecordDetail from '@/pages/org/RecordDetail';
import PermissionSettings from '@/pages/org/PermissionSettings';
import SelectTemplate from '@/pages/credential/SelectTemplate';
import SelectFields from '@/pages/credential/SelectFields';
import CredentialPreview from '@/pages/credential/CredentialPreview';
import ShareCredential from '@/pages/credential/ShareCredential';
import QRScanner from '@/pages/qr/QRScanner';
import VerificationResult from '@/pages/qr/VerificationResult';
import ReportsList from '@/pages/qr/ReportsList';
import ReportView from '@/pages/qr/ReportView';
import RegistryHome from '@/pages/marketplace/RegistryHome';
import SearchResults from '@/pages/marketplace/SearchResults';
import MarketplaceRecordDetail from '@/pages/marketplace/RecordDetail';
import SelectDocuments from '@/pages/marketplace/SelectDocuments';
import Payment from '@/pages/marketplace/Payment';
import DownloadDocuments from '@/pages/marketplace/DownloadDocuments';
import BlockchainRecord from '@/pages/marketplace/BlockchainRecord';
import PurchaseHistory from '@/pages/marketplace/PurchaseHistory';
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
import ShareProfile from '@/pages/individual/ShareProfile';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import OrgApprovals from '@/pages/admin/OrgApprovals';
import BatchMonitor from '@/pages/admin/BatchMonitor';
import PricingConfig from '@/pages/admin/PricingConfig';
import Disputes from '@/pages/admin/Disputes';
import PlatformHealth from '@/pages/admin/PlatformHealth';

const AnimatedRoutes = () => {
  const location = useLocation();
  React.useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [location.pathname]);
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
        <Routes location={location}>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginRegister />} />
          <Route path="/upload" element={<DocumentUpload />} />

          {/* ── Registration routes ── */}
          <Route path="/register" element={<OrgRegistration />} />
          <Route path="/register/individual" element={<IndividualRegistration />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/welcome" element={<WelcomeKYC />} />

          {/* ── Org routes ── */}
          <Route path="/org/pending-approval" element={<PendingApproval />} />
          <Route path="/org/dashboard" element={<OrgDashboard />} />
          <Route path="/org/industry" element={<SelectIndustry />} />
          <Route path="/org/verifications" element={<SelectVerifications />} />
          <Route path="/org/permissions" element={<PermissionSettings />} />
          <Route path="/org/template" element={<DownloadTemplate />} />
          <Route path="/org/create-batch" element={<CreateBatch />} />
          <Route path="/org/batch-status" element={<BatchStatus />} />
          <Route path="/org/record/:id" element={<RecordDetail />} />

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
          <Route path="/individual/dashboard" element={<IndividualDashboard />} />
          <Route path="/individual/skill-tree" element={<SkillTree />} />
          <Route path="/individual/skill-tree/build" element={<SkillTreeForm />} />
          <Route path="/individual/credentials" element={<IndividualCredentials />} />
          <Route path="/individual/share" element={<ShareProfile />} />

          {/* ── Admin routes ── */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/org-approvals" element={<OrgApprovals />} />
          <Route path="/admin/batch-monitor" element={<BatchMonitor />} />
          <Route path="/admin/pricing" element={<PricingConfig />} />
          <Route path="/admin/disputes" element={<Disputes />} />
          <Route path="/admin/platform-health" element={<PlatformHealth />} />
        </Routes>
      </motion.div>
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