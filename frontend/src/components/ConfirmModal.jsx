export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
    type="button"
    onClick={onCancel}
    className="px-3.5 py-2 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
  >
            {cancelText}
          </button>
          <button
    type="button"
    onClick={onConfirm}
    className={`px-3.5 py-2 text-sm font-medium rounded-md text-white transition-colors ${isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
  >
            {confirmText}
          </button>
        </div>
      </div>
    </div>;
}
