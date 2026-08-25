import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const QRCode = ({ value, size = 128, className = '' }) => {
  return (
    <div className={`inline-flex p-3 bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#0B0F19"
        level="M"
        includeMargin={false}
      />
    </div>
  );
};

export default QRCode;
