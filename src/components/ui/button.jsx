import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-white hover:bg-primary/90",
  black: "bg-white text-black hover:bg-gray-200",
  outline: "border border-gray-300 text-black hover:bg-gray-100",
  ghost: "bg-transparent text-black hover:bg-gray-100",
};

const Button = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 px-4 py-2",
      variants[variant],
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

export { Button };
