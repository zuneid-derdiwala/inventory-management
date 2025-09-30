"use client";

import React from 'react';

interface BackgroundEffectProps {
  children: React.ReactNode;
}

const BackgroundEffect: React.FC<BackgroundEffectProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Blurred background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background-mobile.jpg')", // Ensure 'background-mobile.jpg' is in your public folder
          filter: "blur(8px)", // Apply blur effect
          transform: "scale(1.05)", // Slightly scale to hide blur edges
        }}
      ></div>
      {/* Semi-transparent colorful gradient overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 opacity-70"></div>
      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
};

export default BackgroundEffect;