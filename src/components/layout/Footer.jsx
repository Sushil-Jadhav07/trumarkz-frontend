import React from 'react';
import { Logo } from '@/components/ui/Logo';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-brand-dark text-white py-12">
      <div className="w-full mx-auto lg:max-w-none px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Logo size="md" dark />
            <p className="mt-3 text-sm text-gray-400 font-inter leading-relaxed">
              Global trust infrastructure for identity verifications, digital credentials, and blockchain-secured records.
            </p>
          </div>
          <div>
            <h4 className="font-sora font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400 font-inter">
              <li><a href="#/org/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
              <li><a href="#/marketplace" className="hover:text-white transition-colors">Registry</a></li>
              <li><a href="#/credential/template" className="hover:text-white transition-colors">Credentials</a></li>
              <li><a href="#/account/wallet" className="hover:text-white transition-colors">Wallet</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-sora font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400 font-inter">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#/account/support" className="hover:text-white transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-sora font-semibold text-sm mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400 font-inter">
              <li className="flex items-center gap-2"><Mail size={14} /> support@trumarkz.com</li>
              <li className="flex items-center gap-2"><Phone size={14} /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> Bangalore, India</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 font-inter">© 2024 TruMarkZ. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-inter">
            <Shield size={14} className="text-brand-blue" />
            ISO 27001 Certified · GDPR Ready
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

