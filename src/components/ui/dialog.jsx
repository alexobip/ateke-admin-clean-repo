import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({ children, className, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 z-50" />
      <DialogPrimitive.Content
        className={`fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg ${className}`}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4">
          <X className="h-5 w-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export const DialogTitle = DialogPrimitive.Title;

export function DialogDescription({ children, className, ...props }) {
  return (
    <DialogPrimitive.Description 
      className={`text-sm text-gray-600 ${className}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

export function DialogFooter({ children }) {
  return <div className="mt-4 flex justify-end space-x-2">{children}</div>;
}
