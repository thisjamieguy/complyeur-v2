export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Preview mode banner */}
      <div className="bg-amber-400 text-amber-950 text-center py-2 px-4 text-sm font-medium">
        Preview Mode — This page is not yet live
      </div>
      {children}
    </>
  )
}
