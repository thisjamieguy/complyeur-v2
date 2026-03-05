'use client'

interface FooterCookieSettingsButtonProps {
  className?: string
}

export function FooterCookieSettingsButton({ className }: FooterCookieSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.cookieyes?.showSettingsPopup?.()}
      className={className}
    >
      Cookie Settings
    </button>
  )
}
