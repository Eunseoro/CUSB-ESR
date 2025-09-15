'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface PopupLayoutWrapperProps {
  children: React.ReactNode
}

function PopupLayoutContent({ children }: PopupLayoutWrapperProps) {
  const searchParams = useSearchParams()
  const isPopup = searchParams?.get('popup') === 'true'

  if (isPopup) {
    return (
      <div className="popup-layout min-h-screen bg-background text-foreground w-full -ml-16" style={{ margin: 0, padding: 0 }}>
        {children}
      </div>
    )
  }

  return <>{children}</>
}

export function PopupLayoutWrapper({ children }: PopupLayoutWrapperProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PopupLayoutContent>{children}</PopupLayoutContent>
    </Suspense>
  )
} 