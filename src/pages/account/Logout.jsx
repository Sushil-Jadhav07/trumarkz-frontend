import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout(); // clears JWT token + sessionStorage via AuthContext
    toast.success('You have been logged out');
  }, [logout]);

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <Card className="p-8 text-center">
          <div className="mb-6"><Logo size="lg" showTagline /></div>
          <h2 className="font-sora font-bold text-xl text-brand-dark mb-2">Logged Out</h2>
          <p className="text-sm text-gray-500 font-inter mb-6">You have been successfully logged out of TruMarkZ.</p>
          <p className="text-xs text-gray-400 font-inter mb-1">Thank you for using TruMarkZ.</p>
          <p className="text-xs text-gray-400 font-inter mb-6">Verify · Trust · Transform</p>
          <Button variant="primary" size="lg" className="w-full" icon={LogIn} onClick={() => navigate('/login')}>
            Login Again
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};

export default Logout;
