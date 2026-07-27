import React, { useState, useRef, useEffect } from "react";
import { CheckCircle, XCircle, Camera, MapPin } from "lucide-react";

const FacultyScanAttendance = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const html5QrCodeRef = useRef(null);
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const startScanner = async () => {
    setResult(null);
    const { Html5Qrcode } = await import("html5-qrcode");
    html5QrCodeRef.current = new Html5Qrcode("faculty-qr-reader");
    setScanning(true);

    try {
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          getLocationAndSubmit(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setResult({ success: false, message: "Camera access denied. Please allow camera permissions." });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }
    } catch (e) {}
    setScanning(false);
  };

  const getLocationAndSubmit = (qrData) => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      setResult({ success: false, message: "Your browser doesn't support location — required to mark attendance." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        submitScan(qrData, position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocating(false);
        setResult({
          success: false,
          message: "Location permission is required to mark attendance. Please enable location and try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const submitScan = async (qrData, latitude, longitude) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/faculty-attendance/qr/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrData, latitude, longitude }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: "Network error: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current?.isScanning) html5QrCodeRef.current.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Faculty Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Scan the QR at reception to check in / check out</p>
        </div>

        {result && (
          <div className={`mb-6 p-6 rounded-2xl border-2 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-3 mb-3">
              {result.success ? <CheckCircle className="text-green-600" size={36} /> : <XCircle className="text-red-600" size={36} />}
              <h2 className={`text-xl font-bold ${result.success ? "text-green-800" : "text-red-800"}`}>
                {result.success ? (result.data?.type === 'check-out' ? "Checked Out ✅" : "Checked In ✅") : "Failed"}
              </h2>
            </div>
            <p className={`text-sm mb-4 ${result.success ? "text-green-700" : "text-red-700"}`}>{result.message}</p>
            {!result.success && (
              <button onClick={() => setResult(null)} className="mt-2 w-full py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">
                Try Again
              </button>
            )}
          </div>
        )}

        {!result && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div id="faculty-qr-reader" className={scanning ? "block" : "hidden"} style={{ width: "100%" }} />

            {!scanning && !loading && !locating && (
              <div className="p-10 text-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Camera className="text-indigo-600" size={48} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Scan</h3>
                <p className="text-gray-500 text-sm mb-4 flex items-center justify-center gap-1">
                  <MapPin size={14} /> Location access required
                </p>
                <button onClick={startScanner} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-3 mx-auto hover:bg-indigo-700 text-base">
                  <Camera size={22} /> Open Camera & Scan
                </button>
              </div>
            )}

            {scanning && (
              <div className="p-4 text-center bg-gray-50 border-t border-gray-200">
                <p className="text-gray-600 text-sm mb-3">📷 Point camera at the reception QR code</p>
                <button onClick={stopScanner} className="px-6 py-2 bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            )}

            {locating && (
              <div className="p-10 text-center">
                <MapPin className="mx-auto animate-pulse text-indigo-600" size={40} />
                <p className="mt-4 text-gray-600 font-medium">Getting your location...</p>
              </div>
            )}

            {loading && (
              <div className="p-10 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Marking attendance...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyScanAttendance;