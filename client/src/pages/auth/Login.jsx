import { useState } from "react";
import { FaGoogle, FaUser, FaLock, FaEye, FaEyeSlash, FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import iitImage from "../../assets/iit.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focused, setFocused] = useState("");
  const navigate = useNavigate();

  // API URL - Make sure this matches your backend
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      console.log("Attempting login with:", { email, password });

      // Make API call to backend
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      console.log("Login response:", response.data);

      if (response.data.success) {
        // Store token and user data
        const token = response.data.token;
        const userData = response.data.user;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        setSuccess("Login successful!");
        console.log("Login successful, user role:", userData.role);
        console.log("User data:", userData);

        // Redirect based on user role
        setTimeout(() => {
          if (userData.role === "admin") {
            navigate("/admin/dashboard");
          } else if (userData.role === "faculty" || userData.role === "instructor") {
            navigate("/faculty/dashboard");
          } else if (userData.role === "student") {
            navigate("/student/dashboard");
          } else {
            navigate("/dashboard");
          }
        }, 1000);
      } else {
        setError(response.data.message || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        setError(err.response.data?.message || `Server error: ${err.response.status}`);
      } else if (err.request) {
        setError("No response from server. Check if backend is running.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError("Google sign-in will be implemented soon");
  };

  // deterministic "network" nodes for the left-panel motif
  const nodes = [
    [8, 15], [22, 8], [40, 20], [58, 10], [78, 18], [90, 30],
    [15, 38], [35, 45], [55, 42], [72, 48], [88, 55],
    [10, 62], [28, 70], [48, 65], [65, 72], [82, 78],
    [20, 88], [42, 92], [60, 85], [80, 92],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [0, 6], [1, 6], [2, 7], [3, 8], [4, 9], [5, 10],
    [6, 7], [7, 8], [8, 9], [9, 10],
    [6, 11], [7, 12], [8, 13], [9, 14], [10, 15],
    [11, 12], [12, 13], [13, 14], [14, 15],
    [11, 16], [12, 17], [13, 18], [14, 19],
    [16, 17], [17, 18], [18, 19],
  ];

  return (
    <div className="min-h-screen w-full grid md:grid-cols-2 bg-white">
      <style>{`
        @keyframes drift {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-18px, 14px) scale(1.05); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes pulseNode {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* LEFT — brand panel */}
      <div
        className="hidden md:flex relative overflow-hidden flex-col justify-between p-14"
        style={{ background: "linear-gradient(160deg, #0A1220 0%, #101B33 55%, #142443 100%)" }}
      >
        {/* ambient glow */}
        <div
          className="absolute rounded-full"
          style={{
            top: "-10%", left: "-10%", width: 480, height: 480,
            background: "radial-gradient(circle, #4C7EF355 0%, transparent 70%)",
            filter: "blur(20px)", animation: "drift 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-15%", right: "-10%", width: 420, height: 420,
            background: "radial-gradient(circle, #3ED7C440 0%, transparent 70%)",
            filter: "blur(20px)", animation: "drift 18s ease-in-out infinite reverse",
          }}
        />

        {/* signature network motif */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.55 }}
        >
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={nodes[a][0]} y1={nodes[a][1]}
              x2={nodes[b][0]} y2={nodes[b][1]}
              stroke="#3ED7C4" strokeOpacity="0.16" strokeWidth="0.15"
            />
          ))}
          {nodes.map(([x, y], i) => (
            <circle
              key={i}
              cx={x} cy={y} r="1.4"
              fill={i % 3 === 0 ? "#3ED7C4" : "#4C7EF3"}
              style={{ animation: `pulseNode ${4 + (i % 5)}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </svg>

        {/* top: wordmark */}
        <div className="relative z-10 flex items-center gap-3">
  <img src={iitImage} alt="IIT Computer Institute" className="h-16 w-auto object-contain" />
  <span className="text-white text-xl font-bold tracking-wider">
    IIT COMPUTER INSTITUTE
  </span>
</div>

        {/* middle: message */}
        <div className="relative z-10 max-w-md">
          <div className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#3ED7C4" }}>
            Institute Management System
          </div>
          <h1 className="text-white font-bold text-4xl md:text-5xl leading-tight tracking-tight">
            Every student,
            <br />
            every batch,
            <br />
            <span style={{ color: "#3ED7C4" }}>one screen.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed max-w-sm" style={{ color: "#AAB4C8" }}>
            Learn Today, Lead Tomorrow. 
          </p>
        </div>

        {/* bottom: footer strip */}
        <div className="relative z-10 flex gap-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div>
            <div className="text-white text-sm font-semibold">Rishikesh</div>
            <div className="text-xs mt-0.5" style={{ color: "#7C8AA5" }}>Uttarakhand</div>
          </div>
          <div>
            <div className="text-white text-sm font-semibold">IIT Roorkee</div>
            <div className="text-xs mt-0.5" style={{ color: "#7C8AA5" }}>Affiliated · ITDA-CALC</div>
          </div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex items-center justify-center px-6 py-10 md:px-14 bg-white">
        <div className="w-full max-w-sm" style={{ animation: "riseIn 0.5s ease" }}>
          {/* mobile-only compact brand */}
          <div className="md:hidden mb-8 text-center">
            <img src={iitImage} alt="IIT Computer Institute" className="w-12 h-12 rounded-lg object-cover mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Institute Management System</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Sign in to your institute account to continue.
          </p>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-2.5 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              ✅ {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-2.5 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors mb-5 disabled:opacity-50 text-sm"
          >
            <FaGoogle className="text-blue-500" size={16} />
            {loading ? "Processing..." : "Sign in with Google"}
          </button>

          <div className="flex items-center mb-5">
            <div className="grow border-t border-gray-300"></div>
            <span className="mx-3 text-gray-400 text-xs uppercase tracking-wide">or</span>
            <div className="grow border-t border-gray-300"></div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold text-gray-800 mb-2 tracking-wide">
              EMAIL OR MOBILE NUMBER
            </label>
            <div
              className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 mb-5 bg-white transition-colors"
              style={{ border: `1.5px solid ${focused === "email" ? "#4C7EF3" : "#E5E7EB"}` }}
            >
              <FaUser size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="w-full text-sm outline-none bg-transparent"
              />
            </div>

            <div className="flex justify-between items-baseline mb-2">
              <label className="text-xs font-semibold text-gray-800 tracking-wide">PASSWORD</label>
              <a href="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                Forgot your password?
              </a>
            </div>
            <div
              className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 mb-5 bg-white transition-colors"
              style={{ border: `1.5px solid ${focused === "password" ? "#4C7EF3" : "#E5E7EB"}` }}
            >
              <FaLock size={14} className="text-gray-400 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                placeholder="Enter your password"
                required
                disabled={loading}
                className="w-full text-sm outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember((r) => !r)}
                disabled={loading}
                className="size-3.5 text-blue-600 rounded focus:ring-blue-500"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-800 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-900 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Logging in...
                </span>
              ) : (
                <>
                  Sign in <FaArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;