import React, { useEffect, useState } from "react";

interface LemlistStatusData {
  connected: boolean;
  expired?: boolean;
  scope?: string | null;
  connectedAt?: string | null;
}

/**
 * LemlistConnect
 *
 * Displays the current Lemlist OAuth connection status and provides
 * "Connect" / "Disconnect" buttons.
 */
export function LemlistConnect() {
  const [status, setStatus] = useState<LemlistStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lemlist/oauth/status");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: LemlistStatusData = await res.json();
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/lemlist/oauth/disconnect", { method: "DELETE" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setStatus({ connected: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/lemlist/oauth/authorize";
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <span className="animate-pulse">Checking Lemlist connection…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            status?.connected && !status.expired
              ? "bg-green-500"
              : status?.connected && status.expired
                ? "bg-yellow-500"
                : "bg-gray-500"
          }`}
        />
        <span className="text-sm text-white">
          {status?.connected
            ? status.expired
              ? "Lemlist token expired"
              : "Lemlist connected"
            : "Lemlist not connected"}
        </span>

        {status?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="ml-2 px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="ml-2 px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Connect Lemlist
          </button>
        )}
      </div>

      {status?.connectedAt && (
        <p className="text-xs text-gray-500">
          Connected {new Date(status.connectedAt).toLocaleString()}
          {status.scope ? ` · Scope: ${status.scope}` : ""}
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
