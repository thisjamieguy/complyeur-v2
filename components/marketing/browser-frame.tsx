import { cn } from '@/lib/utils'

interface BrowserFrameProps {
  children: React.ReactNode
  className?: string
  title?: string
  showUrlBar?: boolean
}

export function BrowserFrame({
  children,
  className,
  title,
  showUrlBar = false,
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden',
        className
      )}
    >
      {/* Browser Chrome */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>

        {/* URL bar */}
        {showUrlBar && title && (
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-md border border-slate-200 text-xs text-slate-400">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              {title}
            </div>
          </div>
        )}

        {/* Simple title without URL bar */}
        {!showUrlBar && title && (
          <span className="text-xs text-slate-400 font-medium">{title}</span>
        )}
      </div>

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}
