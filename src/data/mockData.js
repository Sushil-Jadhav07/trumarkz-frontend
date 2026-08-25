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

export const humanIndustries = [
  { id: 'healthcare',     name: 'Healthcare',     icon: '🏥' },
  { id: 'transportation', name: 'Transportation',  icon: '🚌' },
  { id: 'logistics',      name: 'Logistics',       icon: '📦' },
  { id: 'it',             name: 'IT',              icon: '💻' },
  { id: 'real_estate',    name: 'Real Estate',     icon: '🏠' },
];

export const productIndustries = [
  { id: 'electronics',       name: 'Electronics',         icon: '🔌' },
  { id: 'beauty_cosmetics',  name: 'Beauty & Cosmetics',  icon: '✨' },
];

// Legacy alias — kept for any existing references
export const industries = humanIndustries;

export const verificationTypes = [
  { id: 'police', name: 'Police', price: 200, type: 'manual', turnaround: '3-5 days' },
  { id: 'dob', name: 'DOB', price: 20, type: 'api', apiLabel: 'DOB Match API' },
  { id: 'education', name: 'Education', price: 100, type: 'api', apiLabel: 'NAD API' },
  { id: 'skills', name: 'Skills', price: 90, type: 'manual', turnaround: '2-4 days' },
  { id: 'criminal_record', name: 'Criminal Record', price: 180, type: 'manual', turnaround: '3-5 days' },
  { id: 'address', name: 'Address', price: 150, type: 'manual', turnaround: '2-3 days' },
  { id: 'driving_license', name: 'Driving License', price: 40, type: 'api', apiLabel: 'Govt DL API' },
  { id: 'experience', name: 'Experience', price: 80, type: 'manual', turnaround: '2-4 days' },
  { id: 'drug_test', name: 'Drug Test', price: 220, type: 'manual', turnaround: '2-5 days' },
  { id: 'police_verification', name: 'Police Verification', price: 240, type: 'manual', turnaround: '3-6 days' },
  { id: 'company', name: 'Company', price: 70, type: 'manual', turnaround: '1-3 days' }
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

export const SDC_DUMMY_BATCHES = [
  {
    batch_id: 'SDC-BATCH-ORG-001',
    org_name: 'FastTrack Logistics Pvt Ltd',
    entity_type: 'human',
    industry: 'Transport & Logistics',
    created_at: '2026-05-01T08:00:00Z',
    records: [
      { id: 'SDC-H-001', full_name: 'Ravi Kumar', email: 'ravi.kumar@example.com', phone_number: '+91 98001 00001', dob: '1992-04-01', aadhar_number: '1234-5678-9012', pan_number: 'ABCDE1234F', verification_status: 'verified', verified_at: '2026-05-05T10:00:00Z', photo_url: null, documents: [] },
      { id: 'SDC-H-002', full_name: 'Meera Joshi', email: 'meera.joshi@example.com', phone_number: '+91 98001 00002', dob: '1990-07-15', aadhar_number: '2345-6789-0123', pan_number: 'BCDEF2345G', verification_status: 'verified', verified_at: '2026-05-05T10:05:00Z', photo_url: null, documents: [] },
      { id: 'SDC-H-003', full_name: 'Kabir Verma', email: 'kabir.verma@example.com', phone_number: '+91 98001 00003', dob: '1988-12-20', aadhar_number: '3456-7890-1234', pan_number: 'CDEFG3456H', verification_status: 'pending_verification', verified_at: null, photo_url: null, documents: [] },
      { id: 'SDC-H-004', full_name: 'Nisha Patel', email: 'nisha.patel@example.com', phone_number: '+91 98001 00004', dob: '1995-03-08', aadhar_number: '4567-8901-2345', pan_number: 'DEFGH4567I', verification_status: 'failed', verified_at: null, photo_url: null, documents: [], verification_reason: 'Document mismatch' },
      { id: 'SDC-H-005', full_name: 'Arjun Mehta', email: 'arjun.mehta@example.com', phone_number: '+91 98001 00005', dob: '1993-09-11', aadhar_number: '5678-9012-3456', pan_number: 'EFGHI5678J', verification_status: 'pending_verification', verified_at: null, photo_url: null, documents: [] },
    ],
  },
  {
    batch_id: 'SDC-BATCH-ORG-002',
    org_name: 'MediCare Hospitals',
    entity_type: 'human',
    industry: 'Healthcare',
    created_at: '2026-05-03T09:30:00Z',
    records: [
      { id: 'SDC-H-006', full_name: 'Dr. Priya Nair', email: 'priya.nair@medicare.com', phone_number: '+91 98002 00001', verification_status: 'verified', verified_at: '2026-05-07T14:00:00Z', photo_url: null, documents: [] },
      { id: 'SDC-H-007', full_name: 'Dr. Sameer Khan', email: 'sameer.khan@medicare.com', phone_number: '+91 98002 00002', verification_status: 'verified', verified_at: '2026-05-07T14:10:00Z', photo_url: null, documents: [] },
      { id: 'SDC-H-008', full_name: 'Nurse Anika Rao', email: 'anika.rao@medicare.com', phone_number: '+91 98002 00003', verification_status: 'pending_verification', verified_at: null, photo_url: null, documents: [] },
    ],
  },
  {
    batch_id: 'SDC-BATCH-ORG-003',
    org_name: 'EduNext Foundation',
    entity_type: 'human',
    industry: 'Education',
    created_at: '2026-05-10T11:00:00Z',
    records: [
      { id: 'SDC-H-009', full_name: 'Rohan Gupta', email: 'rohan.gupta@edunext.com', phone_number: '+91 98003 00001', verification_status: 'pending_verification', verified_at: null, photo_url: null, documents: [] },
      { id: 'SDC-H-010', full_name: 'Anjali Singh', email: 'anjali.singh@edunext.com', phone_number: '+91 98003 00002', verification_status: 'pending_verification', verified_at: null, photo_url: null, documents: [] },
      { id: 'SDC-H-011', full_name: 'Dev Malhotra', email: 'dev.malhotra@edunext.com', phone_number: '+91 98003 00003', verification_status: 'failed', verified_at: null, photo_url: null, documents: [], verification_reason: 'Incomplete documents' },
    ],
  },
  {
    batch_id: 'SDC-BATCH-PROD-001',
    org_name: 'TechGadgets India',
    entity_type: 'product',
    industry: 'Electronics & Appliances',
    created_at: '2026-05-06T07:00:00Z',
    records: [
      { id: 'SDC-P-001', product_name: 'TruTag Smart Speaker X1', category_name: 'Electronics', custom_fields: { serial_number: 'SN-SPK-001', warranty_period: '1 year' }, verification_status: 'verified', verified_at: '2026-05-08T09:00:00Z' },
      { id: 'SDC-P-002', product_name: 'TruTag Smart Speaker X2', category_name: 'Electronics', custom_fields: { serial_number: 'SN-SPK-002', warranty_period: '1 year' }, verification_status: 'verified', verified_at: '2026-05-08T09:05:00Z' },
      { id: 'SDC-P-003', product_name: 'TruTag WiFi Router R100', category_name: 'Electronics', custom_fields: { serial_number: 'SN-RTR-001', warranty_period: '2 years' }, verification_status: 'pending_verification', verified_at: null },
      { id: 'SDC-P-004', product_name: 'TruTag Smart Camera C50', category_name: 'Electronics', custom_fields: { serial_number: 'SN-CAM-001', warranty_period: '1 year' }, verification_status: 'pending_verification', verified_at: null },
    ],
  },
  {
    batch_id: 'SDC-BATCH-PROD-002',
    org_name: 'LuxeGoods Mumbai',
    entity_type: 'product',
    industry: 'Luxury Products',
    created_at: '2026-05-12T10:00:00Z',
    records: [
      { id: 'SDC-P-005', product_name: 'Heritage Gold Bracelet', category_name: 'Jewellery', custom_fields: { sku: 'HGB-001', material: '22K Gold' }, verification_status: 'verified', verified_at: '2026-05-14T15:00:00Z' },
      { id: 'SDC-P-006', product_name: 'Artisan Silk Saree', category_name: 'Apparel', custom_fields: { sku: 'ASS-001', weave: 'Banarasi' }, verification_status: 'pending_verification', verified_at: null },
    ],
  },
  {
    batch_id: 'SDC-BATCH-IND-001',
    org_name: 'Individual',
    entity_type: 'individual',
    industry: 'Freelance / Gig',
    created_at: '2026-05-08T13:00:00Z',
    records: [
      { id: 'SDC-I-001', full_name: 'Vikram Desai', email: 'vikram.desai@gmail.com', phone_number: '+91 99100 00001', verification_status: 'verified', verified_at: '2026-05-10T09:30:00Z', photo_url: null, documents: [] },
      { id: 'SDC-I-002', full_name: 'Sunita Rao', email: 'sunita.rao@gmail.com', phone_number: '+91 99100 00002', verification_status: 'pending_verification', verified_at: null, photo_url: null, documents: [] },
    ],
  },
  {
    batch_id: 'SDC-BATCH-IND-002',
    org_name: 'Individual',
    entity_type: 'individual',
    industry: 'Technology',
    created_at: '2026-05-15T08:00:00Z',
    records: [
      { id: 'SDC-I-003', full_name: 'Pooja Agarwal', email: 'pooja.ag@gmail.com', phone_number: '+91 99200 00001', verification_status: 'verified', verified_at: '2026-05-17T11:00:00Z', photo_url: null, documents: [] },
    ],
  },
];
