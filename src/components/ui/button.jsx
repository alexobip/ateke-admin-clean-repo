import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 bg-primary text-white hover:bg-primary/90 px-4 py-2", className)}
    {...props}
  />
));
Button.displayName = "Button";

export { Button };