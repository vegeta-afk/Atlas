import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Bell, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

const AdminFacultyAttendance = () => {
  const [activeQR, setActiveQR] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [qrLoading, setQrLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const generateQR = async () => {
    setQrLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/faculty-attendance/qr/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) setActiveQR(result.data);
      else alert("Failed to generate QR: " + result.message);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const fetchToday = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/faculty-attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) setRecords(result.data);
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
    }
  };

  const enablePush = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Push notifications aren't supported in this browser.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const keyResponse = await fetch(`${BASE_URL}/api/faculty-attendance/vapid-public-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { publicKey } = await keyResponse.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${BASE_URL}/api/faculty-attendance/push-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription }),
      });

      setPushEnabled(true);
      alert("Push notifications enabled! You'll get an alert on every faculty check-in.");
    } catch (err) {
      alert("Failed to enable push notifications: " + err.message);
    }
  };

  useEffect(() => {
    fetchToday();
    const poll = setInterval(fetchToday, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!activeQR) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((activeQR.expiresAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeQR]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faculty Attendance</h1>
            <p className="text-gray-600">Display the QR at reception for staff to scan</p>
          </div>
          {!pushEnabled && (
            <button onClick={enablePush} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
              <Bell size={16} /> Enable Check-In Alerts
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          {!activeQR ? (
            <button onClick={generateQR} disabled={qrLoading} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700">
              {qrLoading ? "Generating..." : "📱 Show QR Code"}
            </button>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="p-4 border-4 border-indigo-200 rounded-2xl bg-white shadow-inner">
                  <QRCodeSVG value={activeQR.qrData} size={240} level="H" includeMargin bgColor="#ffffff" fgColor="#1e3a8a" />
                </div>
              </div>
              <div className={`inline-block px-4 py-2 rounded-xl text-sm font-medium mb-4 ${secondsLeft > 0 ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-700"}`}>
                {secondsLeft > 0 ? `⏱️ Expires in ${secondsLeft}s` : "❌ Expired — tap Refresh"}
              </div>
              <div>
                <button onClick={generateQR} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 inline-flex items-center gap-2">
                  <RefreshCw size={16} /> Refresh QR
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 font-bold text-gray-900">Today's Faculty Attendance</div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Faculty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-In</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check-Out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No check-ins yet today</td></tr>
              ) : (
                records.map((r) => {
                  const checkInLink = r.checkInLocation?.lat
                    ? `https://www.google.com/maps?q=${r.checkInLocation.lat},${r.checkInLocation.lng}`
                    : null;
                  const checkOutLink = r.checkOutLocation?.lat
                    ? `https://www.google.com/maps?q=${r.checkOutLocation.lat},${r.checkOutLocation.lng}`
                    : null;

                  return (
                    <tr key={r._id}>
                      <td className="px-6 py-4 font-medium text-gray-900">{r.faculty?.facultyName}</td>
                      <td className="px-6 py-4 text-gray-700">{r.checkInTime || "—"}</td>
                      <td className="px-6 py-4 text-gray-700">{r.checkOutTime || "—"}</td>
                      <td className="px-6 py-4 text-sm">
                        {checkInLink ? (
                          <a
                            href={checkInLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            In ({r.checkInLocation.distanceMeters}m)
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {checkOutLink && (
                          <>
                            {" · "}
                            <a
                              href={checkOutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              Out ({r.checkOutLocation.distanceMeters}m)
                            </a>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {r.checkOutTime ? (
                          <span className="flex items-center gap-1 text-green-700 text-sm"><CheckCircle size={14} /> Complete</span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-700 text-sm"><XCircle size={14} /> Not checked out</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminFacultyAttendance;