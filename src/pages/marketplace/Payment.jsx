import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Lock, Smartphone, CreditCard, Landmark, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Payment = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState('upi');

  const methods = [
    { id: 'upi', label: 'UPI', icon: Smartphone, desc: 'Pay via any UPI app' },
    { id: 'card', label: 'Card', icon: CreditCard, desc: 'Credit or Debit card' },
    { id: 'netbanking', label: 'Net Banking', icon: Landmark, desc: 'All major banks' }
  ];

  const handlePay = () => {
    toast.success('Payment of Rs. 10 processing...');
    setTimeout(() => {
      navigate('/marketplace/download');
    }, 1500);
  };

  return (
    <AuthLayout title="Payment">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Payment Method" subtitle="Complete your purchase securely" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6">
              <h3 className="font-sora font-semibold text-brand-dark mb-4">Select Payment Method</h3>
              <div className="space-y-3">
                {methods.map(m => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      method === m.id
                        ? 'border-brand-blue bg-brand-blue/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={method === m.id}
                      onChange={() => setMethod(m.id)}
                      className="w-4 h-4 text-brand-blue"
                    />
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <m.icon size={20} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-brand-dark font-inter text-sm">{m.label}</p>
                      <p className="text-xs text-gray-500 font-inter">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-inter">
              <Lock size={14} className="text-green-500" />
              Secure Gateway - 256-bit SSL Encryption
            </div>
          </div>

          <div>
            <Card className="p-5 sticky top-24">
              <h3 className="font-sora font-semibold text-brand-dark mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm font-inter mb-4">
                <div className="flex justify-between text-gray-500">
                  <span>Full Verification Report</span>
                  <span>Rs. 8</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Document Download</span>
                  <span>Rs. 2</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-brand-dark">
                  <span>Total Amount</span>
                  <span>Rs. 10</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 font-inter mb-4 text-center">
                Powered by Razorpay &middot; 256-bit SSL
              </p>
              <Button variant="primary" size="lg" className="w-full" onClick={handlePay} icon={ArrowRight}>
                Pay Rs. 10
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Payment;
