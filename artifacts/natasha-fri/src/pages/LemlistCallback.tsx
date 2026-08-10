import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * LemlistCallback
 *
 * This page is shown when Lemlist redirects the user back to the frontend
 * after the OAuth backend flow completes.  The backend sets one of:
 *   ?lemlist_connected=true  → success
 *   ?lemlist_error=<message> → failure
 *
 * After a brief notification the user is sent back to "/".
 */
export default function LemlistCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"success" | "error" | "pending">("pending");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("lemlist_connected");
    const error = params.get("lemlist_error");

    if (connected === "true") {
      setStatus("success");
    } else if (error) {
      setStatus("error");
      setErrorMsg(decodeURIComponent(error));
    } else {
      // Unknown state — just redirect home
      navigate("/");
      return;
    }

    const timer = setTimeout(() => navigate("/"), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  if (status === "pending") return null;

  return (
    <div className="min-h-screen bg-[#050506] text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "success" ? (
          <>
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-semibold">Lemlist connected!</h1>
            <p className="text-gray-400">
              Your Lemlist account is now linked. Redirecting you back…
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="text-2xl font-semibold">Connection failed</h1>
            <p className="text-red-400 text-sm break-words">{errorMsg}</p>
            <p className="text-gray-400">Redirecting you back…</p>
          </>
        )}
      </div>
    </div>
  );
}
