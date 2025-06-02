import ExtensionPopup from "@/extension-popup"

export default function ExtensionPopupPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Extension Popup Demo</h1>
          <p className="text-gray-600">This is how the extension would appear when clicked in your browser toolbar</p>
        </div>
        <ExtensionPopup />
      </div>
    </div>
  )
}
