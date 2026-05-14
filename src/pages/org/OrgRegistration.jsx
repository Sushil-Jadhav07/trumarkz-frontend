import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepWizard } from '@/components/ui/StepWizard';
import { Card } from '@/components/ui/Card';
import { Building2, Mail, Phone, Lock, MapPin, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const OrgRegistration = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    orgName: '',
    email: '',
    password: '',
    mobile: '',
    gstNumber: '',
    businessRegNo: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!form.orgName.trim()) newErrors.orgName = 'Organization name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email.trim())) newErrors.email = 'Invalid email';
    if (form.mobile && !/^\d{10,15}$/.test(form.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Enter a valid 10-15 digit number';
    }
    if (!form.gstNumber.trim()) newErrors.gstNumber = 'GST number is required';
    else if (form.gstNumber.trim().length !== 15) {
      newErrors.gstNumber = 'GST number must be 15 characters';
    }
    if (!form.businessRegNo.trim()) newErrors.businessRegNo = 'Business registration number is required';
    if (!form.address.trim()) newErrors.address = 'Registered address is required';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Minimum 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Registration failed');
      return;
    }

    toast.success(result.mobile ? 'OTPs sent to your email and mobile' : 'OTP sent to your email');
    navigate('/verify-otp');
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="p-6 sm:p-8">
          <StepWizard steps={['Registration', 'OTP', 'Welcome']} currentStep={0} />

          <h2 className="font-sora font-bold text-xl text-brand-dark text-center mb-1">
            Organization Registration
          </h2>
          <p className="text-sm text-gray-500 font-inter text-center mb-6">
            Create your organization account to get started
          </p>

          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
            <Input
              label="Organization Name"
              placeholder="Enter organization name"
              value={form.orgName}
              onChange={(e) => updateField('orgName', e.target.value)}
              error={errors.orgName}
              icon={Building2}
            />
            <Input
              label="Official Email Address"
              placeholder="Enter official email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={errors.email}
              icon={Mail}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Create password (min 8 characters)"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={errors.password}
              icon={Lock}
            />
            <Input
              label="Mobile Number (optional)"
              placeholder="+91 9876543210"
              name="tel"
              autoComplete="tel"
              value={form.mobile}
              onChange={(e) => updateField('mobile', e.target.value)}
              error={errors.mobile}
              icon={Phone}
            />
            <Input
              label="GST Number"
              placeholder="e.g. 27ABCDE1234F1Z5"
              value={form.gstNumber}
              onChange={(e) => updateField('gstNumber', e.target.value.toUpperCase())}
              error={errors.gstNumber}
              icon={FileText}
            />
            <Input
              label="Business Registration Number"
              placeholder="e.g. U74999MH2020PTC123456"
              value={form.businessRegNo}
              onChange={(e) => updateField('businessRegNo', e.target.value)}
              error={errors.businessRegNo}
              icon={FileText}
            />
            <Input
              label="Registered Address"
              placeholder="Full business address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              error={errors.address}
              icon={MapPin}
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Send OTP'} <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-brand-blue font-inter hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default OrgRegistration;
