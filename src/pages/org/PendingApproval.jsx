import React from 'react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Clock, Mail, CheckCircle } from 'lucide-react';

export const PendingApproval = () => {
  const { orgApprovalStatus, logout } = useAuth();
  const navigate = useNavigate();

  if (orgApprovalStatus === 'approved') {
    return <Navigate to="/org/dashboard" replace />;
  }

  const steps = [
    { icon: CheckCircle, label: 'Registration submitted', done: true },
    { icon: Mail,         label: 'Email & GST verified', done: true },
    { icon: Clock,        label: 'Super Admin review (up to 24 hrs)', done: false },
    { icon: CheckCircle,  label: 'Account activated', done: false },
  ];

  return (
    <AuthLayout title="Pending Approval">
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex justify-center mb-8">
            <Logo size="md" />
          </div>

          <Card className="p-6 sm:p-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
                <Clock size={40} className="text-orange-500" />
              </div>
            </div>

            <h2 className="font-sora font-bold text-xl text-brand-dark text-center mb-2">
              Awaiting Approval
            </h2>
            <p className="text-sm text-gray-500 font-inter text-center mb-8">
              Your registration is under review. Our Super Admin will verify your details and approve your account within 24 hours.
            </p>

            <div className="space-y-3 mb-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${step.done ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <div className={`p-1.5 rounded-full ${step.done ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <step.icon size={14} className="text-white" />
                  </div>
                  <span className={`text-sm font-inter font-medium ${step.done ? 'text-green-700' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="p-4 bg-brand-blue/5 rounded-xl border border-brand-blue/20 mb-6">
              <p className="text-sm text-brand-blue font-inter text-center">
                You will receive a confirmation email at your registered address once approved.
              </p>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Back to Login
            </Button>
          </Card>
        </motion.div>
      </div>
    </AuthLayout>
  );
};

export default PendingApproval;
