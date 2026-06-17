import * as React from "react"
import { cn } from "@/lib/utils"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "warning"
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 text-sm",
        variant === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-gray-200 bg-white text-gray-900",
        className
      )}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

export { Alert }
