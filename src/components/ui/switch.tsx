// 이 파일은 가로형 ON/OFF 스위치 UI 컴포넌트입니다.
import * as React from "react"
import Image from "next/image"

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, className = "", ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        ref={ref}
        className={
          `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 ` +
          (checked ? "bg-green-600" : "bg-gray-400 dark:bg-gray-700") +
          (" " + className)
        }
        onClick={() => { if (onCheckedChange) onCheckedChange(!checked) }}
        {...props}
      >
        <span
          className={
            `inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-100 shadow transition-transform duration-200 relative` +
            (checked ? " translate-x-5" : " translate-x-1")
          }
        >
          <Image
            src="/icons/button.webp"
            alt="button icon"
            className={`absolute inset-0 w-full h-full object-contain ${checked ? '' : 'grayscale brightness-75'}`}
            draggable={false}
            width={20}
            height={20}
          />
        </span>
      </button>
    )
  }
)
Switch.displayName = "Switch" 