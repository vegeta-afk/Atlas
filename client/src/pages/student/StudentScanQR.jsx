import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Camera, QrCode } from "lucide-react";

const StudentScanQR = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const html5QrCodeRef = useRef(null);

  const startScanner = async () => {
    setResult(null);
    setError(null);

    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");
    html5QrCodeRef.current = new Html5Qrcode("qr-reader");

    setScanning(true);

    try {
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await markAttendance(decodedText);
        },
        () => {} // ignore intermediate errors
      );
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions and try again.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }
    } catch (e) {
      console.error("Stop scanner error:", e);
    }
    setScanning(false);
  };

  const markAttendance = async (qrData) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch("/api/attendance/qr/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qrData }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
          <p className="text-gray-500 text-sm mt-1">
            Scan the QR shown by your teacher to mark attendance
          </p>
        </div>

        {/* Result Card */}
        {result && (
          <div
            className={`mb-6 p-6 rounded-2xl border-2 ${
              result.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {result.success ? (
                <CheckCircle className="text-green-600" size={36} />
              ) : (
                <XCircle className="text-red-600" size={36} />
              )}
              <h2
                className={`text-xl font-bold ${
                  result.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {result.success ? "You're Marked Present! ✅" : "Scan Failed"}
              </h2>
            </div>

            <p
              className={`text-sm mb-4 ${
                result.success ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.message}
            </p>

            {result.success && result.data && (
              <div className="bg-white rounded-xl p-4 space-y-2 text-sm text-gray-700 border border-green-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-semibold text-green-600 capitalize">
                    {result.data.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-in Time</span>
                  <span className="font-semibold">{result.data.checkInTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch</span>
                  <span className="font-semibold">{result.data.batchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timing</span>
                  <span className="font-semibold">{result.data.timing}</span>
                </div>
              </div>
            )}

            {!result.success && (
              <button
                onClick={() => setResult(null)}
                className="mt-4 w-full py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Scanner Box */}
        {!result && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* QR Reader container — html5-qrcode mounts here */}
            <div
              id="qr-reader"
              className={scanning ? "block" : "hidden"}
              style={{ width: "100%" }}
            />

            {/* Idle State */}
            {!scanning && !loading && (
              <div className="p-10 text-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <QrCode className="text-indigo-600" size={48} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Ready to Scan
                </h3>
                <p className="text-gray-500 text-sm mb-8">
                  Make sure your teacher has displayed the QR code, then tap the
                  button below.
                </p>
                <button
                  onClick={startScanner}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-3 mx-auto hover:bg-indigo-700 transition-colors text-base"
                >
                  <Camera size={22} />
                  Open Camera & Scan
                </button>
              </div>
            )}

            {/* Scanning State */}
            {scanning && (
              <div className="p-4 text-center bg-gray-50 border-t border-gray-200">
                <p className="text-gray-600 text-sm mb-3">
                  📷 Point camera at the QR code shown by teacher
                </p>
                <button
                  onClick={stopScanner}
                  className="px-6 py-2 bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="p-10 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
                <p className="text-gray-600 font-medium">
                  Marking your attendance...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Camera Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* How it works */}
        {!result && (
          <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <h4 className="font-bold text-indigo-900 mb-3">How it works</h4>
            <ol className="text-sm text-indigo-700 space-y-2">
              <li>1️⃣ Wait for teacher to show the QR code on screen</li>
              <li>2️⃣ Tap "Open Camera & Scan"</li>
              <li>3️⃣ Point camera at QR code</li>
              <li>4️⃣ Attendance marked automatically ✅</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentScanQR;