// src/components/ui/label.jsx
import React from "react";

export function Label({ children, className = "", ...props }) {
  return (
    <label className={`text-sm font-medium text-gray-700 ${className}`} {...props}>
      {children}
    </label>
  );
}
