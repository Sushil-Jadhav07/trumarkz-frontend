import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ChevronDown, Mail, MessageSquare, Send, HelpCircle, FileQuestion } from 'lucide-react';
import toast from 'react-hot-toast';

export const Support = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [ticket, setTicket] = useState({ subject: '', message: '' });

  const faqs = [
    { id: 1, question: 'How do I create a verification batch?', answer: 'Go to Dashboard → New Verification → Select Industry → Choose Verifications → Download Template → Upload Data → Submit Batch.' },
    { id: 2, question: 'What is the cost per verification?', answer: 'Verification costs vary by type. Identity verification starts at ₹20 per record. View pricing in the marketplace documents section.' },
    { id: 3, question: 'How does blockchain securing work?', answer: 'Once a verification is complete, a cryptographic hash of the record is stored on the Polygon blockchain, creating an immutable, timestamped proof.' },
    { id: 4, question: 'Can I share credentials externally?', answer: 'Yes, generated credentials can be shared via WhatsApp, Email, direct link, or by downloading the QR code.' }
  ];

  const handleTicket = () => {
    if (!ticket.subject || !ticket.message) {
      toast.error('Fill all fields');
      return;
    }
    toast.success('Support ticket submitted');
    setTicket({ subject: '', message: '' });
  };

  return (
    <AuthLayout title="Support">
      <div className="w-full mx-auto lg:max-w-none">
        <PageHeader title="Support" subtitle="Get help and find answers" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-sora font-semibold text-brand-dark mb-4">Frequently Asked Questions</h3>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <Card key={faq.id} className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium text-brand-dark font-inter text-sm">{faq.question}</span>
                    <motion.span
                      animate={{ rotate: openFaq === faq.id ? 180 : 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="text-gray-400"
                    >
                      <ChevronDown size={16} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === faq.id && (
                      <motion.div
                        key={`faq-${faq.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: 'easeInOut' }}
                        className="px-4 overflow-hidden"
                      >
                        <div className="pb-4">
                          <p className="text-sm text-gray-500 font-inter leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-sora font-semibold text-brand-dark mb-4">Contact Support</h3>
            <Card className="p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  <Mail size={18} className="text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-dark font-inter">Email Support</p>
                  <p className="text-xs text-gray-500 font-inter">support@trumarkz.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <MessageSquare size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-dark font-inter">Live Chat</p>
                  <p className="text-xs text-gray-500 font-inter">Available 9 AM – 6 PM IST</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-sora font-semibold text-brand-dark mb-4">Submit a Ticket</h4>
              <div className="space-y-4">
                <Input
                  label="Subject"
                  placeholder="What is this about?"
                  value={ticket.subject}
                  onChange={e => setTicket(prev => ({ ...prev, subject: e.target.value }))}
                  icon={FileQuestion}
                />
                <div>
                  <label className="block text-sm font-medium text-brand-dark font-inter mb-1.5">Message</label>
                  <textarea
                    value={ticket.message}
                    onChange={e => setTicket(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your issue..."
                    rows={4}
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-inter text-sm focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none resize-none"
                  />
                </div>
                <Button variant="primary" size="lg" className="w-full" icon={Send} onClick={handleTicket}>
                  Submit Ticket
                </Button>
              </div>
            </Card>

            <div className="mt-4 text-center">
              <button className="text-sm text-brand-blue font-inter hover:underline inline-flex items-center gap-1">
                <HelpCircle size={14} /> Raise Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Support;
