import { useState } from "react";
import { setStoredPin, api } from "../lib/api.js";
import { Lock } from "lucide-react";
export function PinModal({ isOpen, onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      setStoredPin(pin.trim());
      const res = await api.verifyPin(pin.trim());
      if (res.success) {
        onSuccess();
      } else {
        setError("Incorrect PIN. Please try again.");
      }
    } catch {
      setError("Incorrect PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4 text-neutral-900 dark:text-neutral-100">
          <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold">Enter App PIN</h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          This PTE Tracker instance is protected by a PIN.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              PIN
            </label>
            <input
    type="password"
    value={pin}
    onChange={(e) => setPin(e.target.value)}
    placeholder="Enter PIN"
    autoFocus
    className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
  />
            {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{error}</p>}
          </div>
          <button
    type="submit"
    disabled={loading || !pin.trim()}
    className="w-full py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
  >
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>;
}
