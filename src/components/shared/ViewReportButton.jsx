import React, { useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { openReport } from '@/services/api';

// Opens a verification report for the signed-in org / SuperAdmin. Works for
// protected (holder_approval) batches too, where a plain link would get 403.
export const ViewReportButton = ({ url, className, icon: Icon = Eye, iconSize = 12, children = 'View Report' }) => {
  const [opening, setOpening] = useState(false);
  const handleClick = async (event) => {
    event.stopPropagation();
    if (opening) return;
    setOpening(true);
    try {
      await openReport(url);
    } catch (error) {
      toast.error(error?.message || 'This report could not be opened.');
    } finally {
      setOpening(false);
    }
  };
  return (
    <button type="button" onClick={handleClick} disabled={opening} aria-busy={opening} className={className}>
      {opening ? <RefreshCw size={iconSize} className="animate-spin motion-reduce:animate-none" /> : <Icon size={iconSize} />}
      {children}
    </button>
  );
};

export default ViewReportButton;
