import React from 'react';

export const Logo = ({ size = 'md', dark = false, logoSrc }) => {
  const sizes = {
    sm: { width: 160 },
    md: { width: 160 },
    lg: { width: 210 },
    xl: { width: 260 }
  };

  const s = sizes[size] || sizes.md;
  const resolvedLogoSrc = logoSrc || (dark ? '/assets/Logo/logo white.png' : '/assets/Logo/primary logo.png');

  return (
    <div className="flex items-center justify-center">
      <img
        src={resolvedLogoSrc}
        alt="TruMarkZ"
        width={s.width}
        className="h-auto shrink-0"
      />
    </div>
  );
};

export default Logo;
