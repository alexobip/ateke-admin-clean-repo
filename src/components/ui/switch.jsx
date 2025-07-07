import React from "react";

export function Switch({ checked, onCheckedChange, title }) {
  return (
    <label
      title={title}
      className="inline-flex relative items-center cursor-pointer"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:bg-blue-600 relative transition-colors"></div>
      <div
        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </label>
  );
}
