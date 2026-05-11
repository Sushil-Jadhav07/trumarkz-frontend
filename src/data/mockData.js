export const mockUser = {
  id: 'USR001',
  name: 'John Doe',
  email: 'john@oneXpvtltd.com',
  mobile: '+91 9876543210',
  organization: 'OneX Pvt Ltd',
  role: 'Organization Admin',
  walletBalance: 12450,
  kycStatus: 'verified'
};

export const mockBatches = [
  {
    id: 'BATCH001',
    name: 'Driver Verification - Apr 2024',
    total: 200,
    completed: 120,
    pending: 80,
    status: 'in_progress',
    industry: 'Transport & Logistics',
    createdAt: '2024-04-01'
  }
];

export const mockVerifications = [
  { type: 'Identity Verification', status: 'verified', icon: 'Shield' },
  { type: 'Address Verification', status: 'pending', icon: 'MapPin' },
  { type: 'Police Record Check', status: 'verified', icon: 'FileText' },
  { type: 'Driving License Check', status: 'verified', icon: 'Car' },
  { type: 'Education Verification', status: 'pending', icon: 'GraduationCap' }
];

export const mockCredential = {
  id: 'TM-TRN-2026-00394',
  holderName: 'Ravi Kumar',
  license: 'KA0892200X',
  dob: '01-Apr-1992',
  status: 'Verified Driver',
  verifiedBy: 'OneX Pvt Ltd',
  blockchainHash: '0x7f06b84a2c9d3e15f8a74b2d9c6e1f08a3b9c2d1',
  network: 'Dhiway CORD Network',
  timestamp: '08-Apr-2026 10:30 AM'
};

export const mockMarketplaceRecords = [
  { id: 'TM-TRN-2026-00508', name: 'Ravi Kumar', license: 'KA0892200X', dob: '01-Apr-1993', industry: 'Transport', status: 'verified' },
  { id: 'TM-HLT-2026-00776', name: 'Anda Sharma', license: 'KA0320100X', dob: '15-Mar-1990', industry: 'Healthcare', status: 'verified' },
  { id: 'TM-EDU-2026-00316', name: 'Suresh Babu', license: 'KA0400200X', dob: '22-Jun-1988', industry: 'Education', status: 'verified' }
];

export const mockTransactions = [
  { id: 'TXN001', type: 'Purchase', description: 'Identity Verification - TM-TRN-2026-00394', amount: -45, date: '08-Apr-2024' },
  { id: 'TXN002', type: 'Recharge', description: 'Wallet Top-up', amount: 5000, date: '01-Apr-2024' }
];

export const industries = [
  { id: 'transport', name: 'Transport & Logistics', icon: '🚚' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'education', name: 'Education', icon: '🎓' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭' },
  { id: 'security', name: 'Security Services', icon: '🔒' },
  { id: 'agriculture', name: 'Agriculture', icon: '🌾' },
  { id: 'products', name: 'Products / Services', icon: '📦' },
  { id: 'others', name: 'Others', icon: '⚙️' }
];

export const verificationTypes = [
  { id: 'identity', name: 'Identity Verification', price: 50, type: 'api', apiLabel: 'Aadhaar API' },
  { id: 'pan', name: 'PAN Verification', price: 30, type: 'api', apiLabel: 'PAN API' },
  { id: 'driving', name: 'Driving Licence Check', price: 40, type: 'api', apiLabel: 'Govt DL API' },
  { id: 'education', name: 'Education Verification', price: 100, type: 'api', apiLabel: 'NAD API' },
  { id: 'employment', name: 'Employment Verification', price: 80, type: 'api', apiLabel: 'EPFO API' },
  { id: 'address', name: 'Address Verification', price: 150, type: 'manual', turnaround: '2-3 days' },
  { id: 'police', name: 'Police Clearance', price: 200, type: 'manual', turnaround: '3-5 days' },
  { id: 'criminal', name: 'Criminal Record Check', price: 180, type: 'manual', turnaround: '3-5 days' },
  { id: 'compliance', name: 'Product / Compliance', price: 250, type: 'manual', turnaround: '4-7 days' }
];

export const assignmentData = {
  id: 'ASSIGN001',
  batchName: 'Driver Verification - Apr 2024',
  records: [
    { id: 'REC001', name: 'Ravi Kumar', address: 'Bangalore, Karnataka', result: null, remarks: '' },
    { id: 'REC002', name: 'Suresh Babu', address: 'Mysore, Karnataka', result: null, remarks: '' },
    { id: 'REC003', name: 'Anda Sharma', address: 'Chennai, Tamil Nadu', result: null, remarks: '' }
  ]
};

export const mockAdminBatches = [
  {
    id: 'BATCH001',
    orgName: 'OneX Pvt Ltd',
    industry: 'Transport',
    totalRecords: 200,
    completed: 120,
    assignedAgency: 'SafeCheck Agency',
    agencyEmail: 'ops@safecheck.com',
    emailSentAt: '28-Apr-2026 10:30 AM',
    slaDays: 5,
    daysUsed: 4,
    status: 'at_risk',
    checks: ['address', 'police'],
  },
  {
    id: 'BATCH002',
    orgName: 'HealthFirst Hospital',
    industry: 'Healthcare',
    totalRecords: 50,
    completed: 45,
    assignedAgency: 'MedVerify Ltd',
    agencyEmail: 'work@medverify.com',
    emailSentAt: '27-Apr-2026 02:15 PM',
    slaDays: 7,
    daysUsed: 2,
    status: 'on_track',
    checks: ['education', 'employment'],
  },
  {
    id: 'BATCH003',
    orgName: 'EduCert College',
    industry: 'Education',
    totalRecords: 300,
    completed: 10,
    assignedAgency: 'DocVerify India',
    agencyEmail: 'team@docverify.in',
    emailSentAt: '25-Apr-2026 09:00 AM',
    slaDays: 10,
    daysUsed: 8,
    status: 'overdue',
    checks: ['identity', 'address'],
  },
];

export const mockPendingOrgs = [
  { id: 'ORG001', name: 'FastTrack Logistics', gst: '29ABCDE1234F1Z5', industry: 'Transport', email: 'admin@fasttrack.com', submittedAt: '30-Apr-2026', status: 'pending' },
  { id: 'ORG002', name: 'CityHeal Clinic', gst: '27XYZAB5678G2H6', industry: 'Healthcare', email: 'ops@cityheal.com', submittedAt: '29-Apr-2026', status: 'pending' },
  { id: 'ORG003', name: 'GreenFarm Organics', gst: '24PQRST9012J3K7', industry: 'Agriculture', email: 'info@greenfarm.com', submittedAt: '28-Apr-2026', status: 'pending' }
];

export const mockThirdPartyAgencies = [
  {
    id: 'AGN001',
    name: 'SafeCheck Agency',
    email: 'ops@safecheck.com',
    checkTypes: ['address', 'police'],
    activeBatches: 3,
    completionRate: 94,
    sentEmails: [
      { batchId: 'BATCH001', sentAt: '28-Apr-2026 10:30 AM', recordCount: 200, sla: '5 days', status: 'in_progress' },
    ],
  },
  {
    id: 'AGN002',
    name: 'MedVerify Ltd',
    email: 'work@medverify.com',
    checkTypes: ['compliance'],
    activeBatches: 1,
    completionRate: 98,
    sentEmails: [
      { batchId: 'BATCH002', sentAt: '27-Apr-2026 02:15 PM', recordCount: 50, sla: '7 days', status: 'completed' },
    ],
  },
  {
    id: 'AGN003',
    name: 'DocVerify India',
    email: 'team@docverify.in',
    checkTypes: ['address', 'criminal'],
    activeBatches: 2,
    completionRate: 87,
    sentEmails: [
      { batchId: 'BATCH003', sentAt: '25-Apr-2026 09:00 AM', recordCount: 300, sla: '10 days', status: 'overdue' },
    ],
  },
];

export const mockDisputes = [
  { id: 'DIS001', orgName: 'OneX Pvt Ltd', recordId: 'TM-TRN-2026-00394', checkType: 'Address', issue: 'Address not matching provided document', raisedAt: '01-May-2026', status: 'open' },
  { id: 'DIS002', orgName: 'HealthFirst', recordId: 'TM-HLT-2026-00201', checkType: 'Police', issue: 'Police clearance shows old record from 2019', raisedAt: '30-Apr-2026', status: 'open' }
];

export const mockSkillTree = {
  education: [
    { id: 'ED1', level: '10th', institution: 'Delhi Public School', year: '2016', status: 'verified', credId: 'TM-EDU-2026-00011' },
    { id: 'ED2', level: '12th', institution: 'Delhi Public School', year: '2018', status: 'verified', credId: 'TM-EDU-2026-00012' },
    { id: 'ED3', level: 'Graduation', institution: 'Mumbai University', year: '2022', status: 'verified', credId: 'TM-EDU-2026-00013' },
    { id: 'ED4', level: 'Post-Grad', institution: '', year: '', status: 'empty', credId: null }
  ],
  courses: [
    { id: 'CO1', name: 'Python Advanced', provider: 'Coursera', year: '2023', status: 'verified', credId: 'TM-CRS-2026-00021' },
    { id: 'CO2', name: 'Data Analysis', provider: 'Internshala', year: '2023', status: 'pending', credId: null },
    { id: 'CO3', name: 'Tally ERP', provider: 'NIIT', year: '2022', status: 'verified', credId: 'TM-CRS-2026-00022' }
  ],
  experience: [
    { id: 'EX1', role: 'Software Intern', company: 'XYZ Pvt Ltd', duration: '6 months', year: '2022', status: 'verified', credId: 'TM-EXP-2026-00031' }
  ],
  skills: [
    { id: 'SK1', skill: 'Python', level: 'Advanced', status: 'verified', credId: 'TM-SKL-2026-00041' },
    { id: 'SK2', skill: 'MS Excel', level: 'Expert', status: 'verified', credId: 'TM-SKL-2026-00042' }
  ]
};
