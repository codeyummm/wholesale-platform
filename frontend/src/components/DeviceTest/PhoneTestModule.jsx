import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import "./PhoneTestModule.css";

const TESTS = {
  touch: "Touch Screen",
  multiTouch: "Multi-Touch",
  display: "Display RGB",
  speaker: "Speaker",
  mic: "Microphone",
  vibration: "Vibration",
  rearCam: "Rear Camera",
  frontCam: "Front Camera",
  wifi: "WiFi",
  gps: "GPS",
  accel: "Accelerometer",
  gyro: "Gyroscope",
  battery: "Battery",
  bluetooth: "Bluetooth",
  nfc: "NFC",
  proximity: "Proximity",
  volume: "Volume Keys",
  power: "Power Button",
  charging: "Charging",
  fingerprint: "Fingerprint"
};

export default function PhoneTestModule({ imei, inventoryId, deviceId, user, onSaveResults }) {
  const [results, setResults] = useState({});
  const [modal, setModal] = useState(null);
  const [manualImei, setManualImei] = useState(imei || "");
  const [isStarted, setIsStarted] = useState(!!imei);

  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null); // { type: 'success' | 'error', msg: string }

  useEffect(() => {
    const init = {};
    Object.keys(TESTS).forEach(k => init[k] = { status: "pending" });
    setResults(init);
  }, []);

  const handleSave = async () => {
    if (!onSaveResults) return;
    setIsSaving(true);
    try {
      const res = await onSaveResults({ 
        imei: manualImei, 
        inventoryId, 
        deviceId, 
        testedBy: user?.name || user?.username || 'Anonymous',
        testResults: results, 
        overallStatus: cnt.failed > 0 ? 'failed' : 'passed',
        summary: {
          totalTests: Object.keys(TESTS).length,
          passedTests: cnt.passed || 0,
          failedTests: cnt.failed || 0,
          skippedTests: cnt.skipped || 0,
          passRate: cnt.passed ? ((cnt.passed / Object.keys(TESTS).length) * 100).toFixed(1) : 0
        },
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      });
      if (res) {
        setSaveResult({ type: 'success', msg: 'Device diagnostics saved successfully!' });
      }
    } catch (err) {
      setSaveResult({ type: 'error', msg: err.response?.data?.error || err.message || 'Failed to save test results.' });
    } finally {
      setIsSaving(false);
    }
  };

  const closeSaveModal = () => {
    const type = saveResult?.type;
    setSaveResult(null);
    if (type === 'success') {
      // Clear screen
      setIsStarted(false);
      if (!imei) setManualImei("");
      const init = {};
      Object.keys(TESTS).forEach(k => init[k] = { status: "pending" });
      setResults(init);
    }
  };

  const done = (id, passed, extraData = {}) => {
    setResults(p => ({ ...p, [id]: { status: passed ? "passed" : "failed", ...extraData } }));
    setModal(null);
  };

  const skip = (id) => {
    setResults(p => ({ ...p, [id]: { status: "skipped" } }));
    setModal(null);
  };

  const cnt = Object.values(results).reduce((c, r) => {
    c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, {});

  const icon = s => s === "passed" ? "✓" : s === "failed" ? "✗" : "•";

  if (!isStarted) {
    return (
      <div className="phone-test-module" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: '30px', borderRadius: '15px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>📱 Device Test</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Enter the IMEI to begin testing</p>
          <input 
            type="text" 
            value={manualImei} 
            onChange={e => setManualImei(e.target.value)} 
            placeholder="15-digit IMEI"
            style={{ width: '100%', padding: '15px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '18px', textAlign: 'center', marginBottom: '20px', fontFamily: 'monospace' }}
          />
          <button 
            className="btn btn-success" 
            onClick={() => { if (manualImei.length >= 5) setIsStarted(true); }}
            style={{ width: '100%', padding: '15px', fontSize: '16px' }}
          >
            Start Diagnostics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-test-module">
      {saveResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="p-8 text-center flex flex-col items-center">
              {saveResult.type === 'success' ? (
                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <CheckCircle className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <XCircle className="w-10 h-10" />
                </div>
              )}
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {saveResult.type === 'success' ? 'Success!' : 'Error'}
              </h2>
              
              <p className="text-gray-500 text-base mb-8">
                {saveResult.msg}
              </p>
              
              <button 
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors shadow-sm ${
                  saveResult.type === 'success' ? 'bg-primary hover:bg-primary/90' : 'bg-red-500 hover:bg-red-600'
                }`}
                onClick={closeSaveModal}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="test-header">
        <div className="header-content">
          <h1>📱 Device Test</h1>
          <p className="subtitle">{manualImei || "20 Tests"}</p>
        </div>
        <div className="header-stats">
          <div className="stat passed">
            <span className="stat-value">{cnt.passed || 0}</span>
            <span className="stat-label">Pass</span>
          </div>
          <div className="stat failed">
            <span className="stat-value">{cnt.failed || 0}</span>
            <span className="stat-label">Fail</span>
          </div>
        </div>
      </header>

      <div className="test-controls">
        {onSaveResults && (
          <button className="btn btn-success" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '⏳ Saving...' : '💾 Save Results'}
          </button>
        )}
      </div>

      <div className="test-grid">
        {Object.entries(TESTS).map(([id, name]) => {
          const r = results[id] || {};
          return (
            <div key={id} className={"test-card " + r.status} onClick={() => setModal(id)}>
              <span className={"status-indicator " + r.status}>{icon(r.status)}</span>
              <h3>{name}</h3>
            </div>
          );
        })}
      </div>

      {modal === "touch" && <TouchModal onPass={() => done("touch", true)} onFail={() => done("touch", false)} onSkip={() => skip("touch")} />}
      {modal === "multiTouch" && <MultiTouchModal onPass={() => done("multiTouch", true)} onFail={() => done("multiTouch", false)} onSkip={() => skip("multiTouch")} />}
      {modal === "display" && <DisplayModal onPass={() => done("display", true)} onFail={() => done("display", false)} onSkip={() => skip("display")} />}
      {modal === "speaker" && <SpeakerModal onPass={() => done("speaker", true)} onFail={() => done("speaker", false)} onSkip={() => skip("speaker")} />}
      {modal === "mic" && <MicModal onPass={() => done("mic", true)} onFail={() => done("mic", false)} onSkip={() => skip("mic")} />}
      {modal === "vibration" && <VibrationModal onPass={() => done("vibration", true)} onFail={() => done("vibration", false)} onSkip={() => skip("vibration")} />}
      {modal === "rearCam" && <CamModal facing="environment" onPass={() => done("rearCam", true)} onFail={() => done("rearCam", false)} onSkip={() => skip("rearCam")} />}
      {modal === "frontCam" && <CamModal facing="user" onPass={() => done("frontCam", true)} onFail={() => done("frontCam", false)} onSkip={() => skip("frontCam")} />}
      {modal === "wifi" && <WifiModal onPass={() => done("wifi", true)} onFail={() => done("wifi", false)} onSkip={() => skip("wifi")} />}
      {modal === "gps" && <GpsModal onPass={() => done("gps", true)} onFail={() => done("gps", false)} onSkip={() => skip("gps")} />}
      {modal === "accel" && <AccelModal onPass={() => done("accel", true)} onFail={() => done("accel", false)} onSkip={() => skip("accel")} />}
      {modal === "gyro" && <GyroModal onPass={() => done("gyro", true)} onFail={() => done("gyro", false)} onSkip={() => skip("gyro")} />}
      {modal === "battery" && <BatteryModal onPass={(data) => done("battery", true, data)} onFail={(data) => done("battery", false, data)} onSkip={() => skip("battery")} />}
      {modal === "bluetooth" && <BluetoothModal onPass={(data) => done("bluetooth", true, data)} onFail={(data) => done("bluetooth", false, data)} onSkip={() => skip("bluetooth")} />}
      {modal === "nfc" && <NfcModal onPass={(data) => done("nfc", true, data)} onFail={(data) => done("nfc", false, data)} onSkip={() => skip("nfc")} />}
      {modal === "proximity" && <SimpleModal title="Proximity" msg="Cover sensor - does screen dim?" onPass={() => done("proximity", true)} onFail={() => done("proximity", false)} onSkip={() => skip("proximity")} />}
      {modal === "volume" && <SimpleModal title="Volume" msg="Do volume buttons work?" onPass={() => done("volume", true)} onFail={() => done("volume", false)} onSkip={() => skip("volume")} />}
      {modal === "power" && <SimpleModal title="Power" msg="Does power button work?" onPass={() => done("power", true)} onFail={() => done("power", false)} onSkip={() => skip("power")} />}
      {modal === "charging" && <SimpleModal title="Charging" msg="Does charging work?" onPass={() => done("charging", true)} onFail={() => done("charging", false)} onSkip={() => skip("charging")} />}
      {modal === "fingerprint" && <SimpleModal title="Fingerprint" msg="Does fingerprint work?" onPass={() => done("fingerprint", true)} onFail={() => done("fingerprint", false)} onSkip={() => skip("fingerprint")} />}
    </div>
  );
}

function Modal({ title, children, onSkip }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        {children}
        <button className="modal-close" onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}

function Btns({ onPass, onFail }) {
  return (
    <div className="modal-actions">
      <button className="btn btn-success" onClick={onPass}>✓ Pass</button>
      <button className="btn btn-danger" onClick={onFail}>✗ Fail</button>
    </div>
  );
}

function SimpleModal({ title, msg, onPass, onFail, onSkip }) {
  return (
    <Modal title={title} onSkip={onSkip}>
      <p style={{ margin: "20px 0" }}>{msg}</p>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function TouchModal({ onPass, onFail, onSkip }) {
  const [pts, setPts] = useState([]);
  const h = e => {
    const p = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    setPts(p);
  };
  return (
    <Modal title="Touch Test" onSkip={onSkip}>
      <div style={{ height: 200, background: "var(--bg-tertiary)", borderRadius: 10, position: "relative", touchAction: "none" }} onTouchStart={h} onTouchMove={h}>
        {pts.map((p, i) => <div key={i} style={{ position: "absolute", left: p.x - 170, top: p.y - 280, width: 40, height: 40, borderRadius: "50%", background: "#0ff" }} />)}
      </div>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function MultiTouchModal({ onPass, onFail, onSkip }) {
  const [n, setN] = useState(0);
  const [max, setMax] = useState(0);
  const h = e => { setN(e.touches.length); if (e.touches.length > max) setMax(e.touches.length); };
  return (
    <Modal title="Multi-Touch" onSkip={onSkip}>
      <div style={{ height: 150, background: "var(--bg-tertiary)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", touchAction: "none" }} onTouchStart={h} onTouchMove={h} onTouchEnd={h}>
        <p style={{ fontSize: 40, color: "#0ff", margin: 0 }}>{n}</p>
        <p style={{ color: "var(--text-muted)" }}>Max: {max}</p>
      </div>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function DisplayModal({ onPass, onFail, onSkip }) {
  const c = ["#F00", "#0F0", "#00F", "#FFF", "#000"];
  const [i, setI] = useState(0);
  return (
    <Modal title="Display RGB" onSkip={onSkip}>
      <div style={{ height: 120, background: c[i], borderRadius: 10, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button onClick={() => setI(x => Math.max(0, x - 1))}>Prev</button>
        <span style={{ flex: 1, textAlign: "center" }}>{i + 1}/5</span>
        <button onClick={() => setI(x => Math.min(4, x + 1))}>Next</button>
      </div>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function SpeakerModal({ onPass, onFail, onSkip }) {
  const [on, setOn] = useState(false);
  const ctx = useRef(null);
  const osc = useRef(null);
  const play = () => {
    ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    osc.current = ctx.current.createOscillator();
    osc.current.connect(ctx.current.destination);
    osc.current.frequency.value = 440;
    osc.current.start();
    setOn(true);
  };
  const stop = () => { if (osc.current) osc.current.stop(); setOn(false); };
  useEffect(() => () => stop(), []);
  return (
    <Modal title="Speaker Test" onSkip={onSkip}>
      <button className="btn btn-primary" onClick={on ? stop : play} style={{ width: "100%", padding: 20, marginBottom: 15 }}>
        {on ? "🔇 Stop" : "🔊 Play Sound"}
      </button>
      <Btns onPass={() => { stop(); onPass(); }} onFail={() => { stop(); onFail(); }} />
    </Modal>
  );
}

function MicModal({ onPass, onFail, onSkip }) {
  const [rec, setRec] = useState(false);
  const [lvl, setLvl] = useState(0);
  const str = useRef(null);
  const anl = useRef(null);
  const af = useRef(null);
  const start = async () => {
  try {
      str.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const s = c.createMediaStreamSource(str.current);
      anl.current = c.createAnalyser();
      s.connect(anl.current);
      setRec(true);
      const loop = () => {
        const d = new Uint8Array(anl.current.frequencyBinCount);
        anl.current.getByteFrequencyData(d);
        setLvl(d.reduce((a, b) => a + b, 0) / d.length);
        af.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { alert("Mic error: " + e.message); }
  };
  const stop = () => {
    if (str.current) str.current.getTracks().forEach(t => t.stop());
    if (af.current) cancelAnimationFrame(af.current);
    setRec(false);
  };
  useEffect(() => () => stop(), []);
  return (
    <Modal title="Microphone Test" onSkip={onSkip}>
      <div style={{ height: 30, background: "var(--bg-tertiary)", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ width: (lvl / 128) * 100 + "%", height: "100%", background: "#0f8" }} />
      </div>
      <button className="btn btn-primary" onClick={rec ? stop : start} style={{ width: "100%", padding: 15, marginBottom: 15 }}>
        {rec ? "⏹ Stop" : "🎤 Record"}
      </button>
      <Btns onPass={() => { stop(); onPass(); }} onFail={() => { stop(); onFail(); }} />
    </Modal>
  );
}

function VibrationModal({ onPass, onFail, onSkip }) {
  const vib = () => { if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]); };
  return (
    <Modal title="Vibration Test" onSkip={onSkip}>
      <button className="btn btn-primary" onClick={vib} style={{ width: "100%", padding: 20, marginBottom: 15 }}>
        📳 Vibrate Now
      </button>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function CamModal({ facing, onPass, onFail, onSkip }) {
  const vid = useRef(null);
  const str = useRef(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    (async () => {
  try {
        str.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
        if (vid.current) vid.current.srcObject = str.current;
      } catch (e) { setErr(e.message); }
    })();
    return () => { if (str.current) str.current.getTracks().forEach(t => t.stop()); };
  }, []);
  const stop = () => { if (str.current) str.current.getTracks().forEach(t => t.stop()); };
  return (
    <Modal title={facing === "user" ? "Front Camera" : "Rear Camera"} onSkip={() => { stop(); onSkip(); }}>
      {err ? <p style={{ color: "#f66" }}>{err}</p> : <video ref={vid} autoPlay playsInline muted style={{ width: "100%", height: 200, background: "#000", borderRadius: 10, objectFit: "cover" }} />}
      <Btns onPass={() => { stop(); onPass(); }} onFail={() => { stop(); onFail(); }} />
    </Modal>
  );
}

function GpsModal({ onPass, onFail, onSkip }) {
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const get = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { setLoc({ lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }); setLoading(false); },
      () => setLoading(false),
      { timeout: 10000 }
    );
  };
  return (
    <Modal title="GPS Test" onSkip={onSkip}>
      <button className="btn btn-primary" onClick={get} disabled={loading} style={{ width: "100%", padding: 15, marginBottom: 15 }}>
        {loading ? "Getting..." : "🛰 Get Location"}
      </button>
      {loc && <p style={{ background: "var(--bg-tertiary)", padding: 10, borderRadius: 5 }}>Lat: {loc.lat}, Lng: {loc.lng}</p>}
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function AccelModal({ onPass, onFail, onSkip }) {
  const [d, setD] = useState({ x: 0, y: 0, z: 0 });
  useEffect(() => {
    const h = e => {
      if (e.accelerationIncludingGravity) {
        setD({ x: e.accelerationIncludingGravity.x?.toFixed(1) || 0, y: e.accelerationIncludingGravity.y?.toFixed(1) || 0, z: e.accelerationIncludingGravity.z?.toFixed(1) || 0 });
      }
    };
    window.addEventListener("devicemotion", h);
    return () => window.removeEventListener("devicemotion", h);
  }, []);
  return (
    <Modal title="Accelerometer" onSkip={onSkip}>
      <div style={{ background: "var(--bg-tertiary)", padding: 15, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
        <p>X: {d.x} | Y: {d.y} | Z: {d.z}</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Shake phone to see values change</p>
      </div>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function GyroModal({ onPass, onFail, onSkip }) {
  const [d, setD] = useState({ a: 0, b: 0, g: 0 });
  useEffect(() => {
    const h = e => { if (e.alpha !== null) setD({ a: e.alpha?.toFixed(0) || 0, b: e.beta?.toFixed(0) || 0, g: e.gamma?.toFixed(0) || 0 }); };
    window.addEventListener("deviceorientation", h);
    return () => window.removeEventListener("deviceorientation", h);
  }, []);
  return (
    <Modal title="Gyroscope" onSkip={onSkip}>
      <div style={{ background: "var(--bg-tertiary)", padding: 15, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
        <p>α: {d.a}° | β: {d.b}° | γ: {d.g}°</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Rotate phone to see values change</p>
      </div>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function BatteryModal({ onPass, onFail, onSkip }) {
  const [info, setInfo] = useState(null);
  const [health, setHealth] = useState('');
  const [cycles, setCycles] = useState('');
  const [testing, setTesting] = useState(false);
  const [drainResult, setDrainResult] = useState(null);

  useEffect(() => {
    let batteryObj = null;
    const update = () => {
      if (batteryObj) setInfo({ level: batteryObj.level, charging: batteryObj.charging });
    };

    if ("getBattery" in navigator) {
      navigator.getBattery().then(b => {
        batteryObj = b;
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      });
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', update);
        batteryObj.removeEventListener('chargingchange', update);
      }
    };
  }, []);

  const runDrainTest = async () => {
    if (!info) return;
    setTesting(true);
    setDrainResult(null);
    const startLevel = info.level;
    const startTime = Date.now();
    
    // CPU Stress Loop for 10 seconds
    const duration = 10000;
    while (Date.now() - startTime < duration) {
      for(let i=0; i<100000; i++) { Math.sqrt(i * Math.random()); }
      await new Promise(r => setTimeout(r, 0));
    }
    
    const b = await navigator.getBattery();
    const endLevel = b.level;
    const drop = startLevel - endLevel;
    
    setDrainResult({
      drop: Math.round(drop * 100),
      time: 10,
      passed: drop <= 0.02 // Less than 2% drop is good
    });
    setTesting(false);
  };

  return (
    <Modal title="Battery Diagnostics" onSkip={onSkip}>
      {info ? (
        <div style={{ background: "var(--bg-tertiary)", padding: 15, borderRadius: 10, marginBottom: 15, textAlign: "left" }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 32 }}>{info.charging ? "⚡" : "🔋"}</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{Math.round(info.level * 100)}%</div>
                <div style={{ fontSize: 12, color: info.charging ? '#0f8' : '#aaa' }}>
                  {info.charging ? 'Charging' : 'Discharging'}
                </div>
              </div>
            </div>
            
            <button 
              onClick={runDrainTest} 
              disabled={testing || info.charging}
              style={{ background: testing ? '#555' : '#eab308', color: '#000', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: (testing || info.charging) ? 'not-allowed' : 'pointer' }}
            >
              {testing ? 'Stressing CPU...' : '10s Stress Test'}
            </button>
          </div>

          {info.charging && (
            <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 15 }}>⚠️ Unplug device to run Stress Test</p>
          )}

          {drainResult && (
            <div style={{ padding: 10, background: 'var(--bg-card)', borderRadius: 8, marginBottom: 15, borderLeft: `4px solid ${drainResult.passed ? '#0f8' : '#f66'}` }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>10s CPU Stress Result:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span>Battery Drain Amount:</span>
                <span style={{ color: drainResult.passed ? '#0f8' : '#f66', fontWeight: 'bold' }}>
                  {drainResult.drop}% {drainResult.passed ? '(PASS)' : '(FAIL)'}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Health (%)</label>
              <input type="number" placeholder="e.g. 85" value={health} onChange={e => setHealth(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Cycle Count</label>
              <input type="number" placeholder="e.g. 400" value={cycles} onChange={e => setCycles(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 20 }}>
          <p style={{ color: '#fbbf24', marginBottom: 15 }}>Battery API restricted on this browser (e.g. iOS Safari).</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Health (%)</label>
              <input type="number" placeholder="e.g. 85" value={health} onChange={e => setHealth(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Cycle Count</label>
              <input type="number" placeholder="e.g. 400" value={cycles} onChange={e => setCycles(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>
      )}
      <Btns onPass={() => onPass({ health, cycles, drainResult })} onFail={() => onFail({ health, cycles, drainResult })} />
    </Modal>
  );
}

function WifiModal({ onPass, onFail, onSkip }) {
  const [info, setInfo] = useState({ testing: true, online: false, type: 'unknown', downlink: 0, rtt: 0 });

  useEffect(() => {
    let mounted = true;
    const testWifi = async () => {
      const isOnline = navigator.onLine;
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      let type = 'unknown';
      let downlink = 0;
      let rtt = 0;

      if (conn) {
        type = conn.type || conn.effectiveType || 'unknown';
        downlink = conn.downlink || 0;
        rtt = conn.rtt || 0;
      }

      // Simulate network request to check actual latency
      const start = Date.now();
      try {
        await fetch('https://httpbin.org/get', { cache: 'no-store' });
        rtt = Date.now() - start;
      } catch (e) {
        // Fetch failed, keep connection API rtt or 0
      }

      const isStable = isOnline && rtt > 0 && rtt < 300;

      if (mounted) {
        setInfo({ testing: false, online: isOnline, type, downlink, rtt, isStable });
      }
    };
    testWifi();
    return () => mounted = false;
  }, []);

  return (
    <Modal title="WiFi Network Analysis" onSkip={onSkip}>
      {info.testing ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 40, animation: "pulse 1.5s infinite" }}>📶</div>
          <p style={{ marginTop: 15, color: "var(--text-muted)" }}>Analyzing network packets...</p>
        </div>
      ) : (
        <div style={{ background: "var(--bg-tertiary)", padding: 20, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
          <p style={{ fontSize: 36, color: info.online ? "#0f8" : "#f66", margin: "0 0 10px" }}>
            {info.online ? "📶 Connected" : "❌ Offline"}
          </p>
          {info.online && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 15, fontSize: 14, color: "var(--text-secondary)", textAlign: 'left', background: 'var(--bg-card)', padding: '15px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Network Type:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{info.type.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Latency (Ping):</span>
                <span style={{ color: info.rtt < 100 ? '#0f8' : info.rtt < 250 ? '#fbbf24' : '#f66', fontWeight: 'bold' }}>{info.rtt} ms</span>
              </div>
              {info.downlink > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Est. Bandwidth:</span>
                  <span style={{ color: '#0f8', fontWeight: 'bold' }}>{info.downlink} Mbps</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <span>Stability:</span>
                <span style={{ color: info.isStable ? '#0f8' : '#f66', fontWeight: 'bold' }}>{info.isStable ? 'PASS' : 'FAIL'}</span>
              </div>
            </div>
          )}
        </div>
      )}
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function BluetoothModal({ onPass, onFail, onSkip }) {
  const [status, setStatus] = useState("idle"); // idle, scanning, found, error, manual_fallback
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Instantly switch to manual fallback on iOS or browsers without API
    if (!navigator.bluetooth) {
      setStatus("manual_fallback");
    }
  }, []);

  const scan = async () => {
    try {
      setStatus("scanning");
      // Request device opens the native Bluetooth picker
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      });
      
      setDeviceInfo({ name: device.name || "Unknown Device", id: device.id });
      setStatus("found");
    } catch (e) {
      if (e.name === "NotFoundError") {
        // User cancelled the prompt, but the fact the prompt opened means Bluetooth is functional!
        setStatus("found");
        setDeviceInfo({ name: "User Cancelled (Radio OK)", id: "N/A" });
      } else {
        setStatus("error");
        setErrorMsg(e.message);
      }
    }
  };

  return (
    <Modal title="Bluetooth Diagnostic" onSkip={onSkip}>
      <div style={{ background: "var(--bg-tertiary)", padding: 20, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
        {status === "idle" && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 15, color: '#3b82f6' }}>ᛒ</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 15 }}>
              Click below to activate the Bluetooth radio and scan for nearby devices.
            </p>
            <button className="btn btn-primary" onClick={scan} style={{ padding: "10px 20px", width: "100%", fontWeight: "bold" }}>
              🔍 Scan for Devices
            </button>
          </div>
        )}

        {status === "manual_fallback" && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 10, color: '#fbbf24' }}>⚠️</div>
            <p style={{ color: "#fbbf24", fontWeight: "bold", fontSize: 18 }}>iOS / Browser Restriction</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
              Apple iOS and some browsers block automated Bluetooth scanning via the web. 
            </p>
            <div style={{ background: "var(--bg-card)", padding: 15, borderRadius: 8, marginTop: 15, textAlign: "left", fontSize: 13, color: 'var(--text-primary)' }}>
              <strong style={{ color: '#3b82f6' }}>Manual Verification Required:</strong>
              <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Swipe down to open Control Center</li>
                <li>Verify Bluetooth toggles ON successfully</li>
                <li>Click <strong>✓ Pass</strong> if working</li>
              </ol>
            </div>
          </div>
        )}

        {status === "scanning" && (
          <div>
            <div style={{ fontSize: 40, animation: "pulse 1.5s infinite", color: "#3b82f6" }}>ᛒ</div>
            <p style={{ color: "var(--text-secondary)", marginTop: 15 }}>Opening Bluetooth Picker...</p>
            <p style={{ color: "#666", fontSize: 12 }}>Please select a device or click Cancel.</p>
          </div>
        )}

        {status === "found" && (
          <div>
            <div style={{ fontSize: 40, color: "#0f8", marginBottom: 10 }}>✅</div>
            <p style={{ color: "#0f8", fontWeight: "bold", fontSize: 18 }}>Radio Functional</p>
            <div style={{ background: "var(--bg-card)", padding: 10, borderRadius: 8, marginTop: 15, textAlign: "left" }}>
              <p style={{ margin: "0 0 5px", fontSize: 12, color: "var(--text-secondary)" }}>Device Detected:</p>
              <p style={{ margin: 0, fontWeight: "bold" }}>{deviceInfo.name}</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div style={{ fontSize: 40, color: "#f66", marginBottom: 10 }}>❌</div>
            <p style={{ color: "#f66", fontWeight: "bold" }}>Bluetooth Error</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 10 }}>{errorMsg}</p>
          </div>
        )}
      </div>
      <Btns onPass={() => onPass(deviceInfo || { note: 'Manual Verification on iOS' })} onFail={() => onFail(errorMsg ? { error: errorMsg } : null)} />
    </Modal>
  );
}

function NfcModal({ onPass, onFail, onSkip }) {
  const [status, setStatus] = useState("idle"); // idle, scanning, found, error, manual_fallback
  const [tagInfo, setTagInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!('NDEFReader' in window)) {
      setStatus("manual_fallback");
    }
  }, []);

  const scan = async () => {
    try {
      setStatus("scanning");
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("reading", ({ message, serialNumber }) => {
        setTagInfo({ serialNumber: serialNumber || "Hidden Serial", records: message.records.length });
        setStatus("found");
      });
      
      ndef.addEventListener("readingerror", () => {
        // A reading error means the antenna is working but couldn't parse the tag.
        // This still proves the NFC hardware works!
        setTagInfo({ serialNumber: "Unreadable Format", note: "Hardware functional, unreadable tag format." });
        setStatus("found");
      });

    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  return (
    <Modal title="NFC Diagnostic" onSkip={onSkip}>
      <div style={{ background: "var(--bg-tertiary)", padding: 20, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
        {status === "idle" && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 15, color: '#3b82f6' }}>💳</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 15 }}>
              Click below and tap any NFC card or tag to the back of the device.
            </p>
            <button className="btn btn-primary" onClick={scan} style={{ padding: "10px 20px", width: "100%", fontWeight: "bold" }}>
              🔍 Start NFC Scan
            </button>
          </div>
        )}

        {status === "manual_fallback" && (
          <div>
            <div style={{ fontSize: 40, marginBottom: 10, color: '#fbbf24' }}>⚠️</div>
            <p style={{ color: "#fbbf24", fontWeight: "bold", fontSize: 18 }}>iOS / Browser Restriction</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
              Apple iOS blocks automated NFC scanning via the web. 
            </p>
            <div style={{ background: "var(--bg-card)", padding: 15, borderRadius: 8, marginTop: 15, textAlign: "left", fontSize: 13, color: 'var(--text-primary)' }}>
              <strong style={{ color: '#3b82f6' }}>Manual Verification Required:</strong>
              <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Open Apple Wallet or Settings</li>
                <li>Verify NFC / Apple Pay works</li>
                <li>Click <strong>✓ Pass</strong></li>
              </ol>
            </div>
          </div>
        )}

        {status === "scanning" && (
          <div>
            <div style={{ fontSize: 40, animation: "pulse 1.5s infinite", color: "#3b82f6" }}>💳</div>
            <p style={{ color: "var(--text-secondary)", marginTop: 15 }}>Ready to Scan...</p>
            <p style={{ color: "#666", fontSize: 12 }}>Hold an NFC tag to the back of the device.</p>
          </div>
        )}

        {status === "found" && (
          <div>
            <div style={{ fontSize: 40, color: "#0f8", marginBottom: 10 }}>✅</div>
            <p style={{ color: "#0f8", fontWeight: "bold", fontSize: 18 }}>NFC Functional</p>
            <div style={{ background: "var(--bg-card)", padding: 10, borderRadius: 8, marginTop: 15, textAlign: "left" }}>
              <p style={{ margin: "0 0 5px", fontSize: 12, color: "var(--text-secondary)" }}>Tag Detected:</p>
              <p style={{ margin: 0, fontWeight: "bold" }}>{tagInfo.serialNumber}</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div style={{ fontSize: 40, color: "#f66", marginBottom: 10 }}>❌</div>
            <p style={{ color: "#f66", fontWeight: "bold" }}>NFC Error</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 10 }}>{errorMsg}</p>
          </div>
        )}
      </div>
      <Btns onPass={() => onPass(tagInfo || { note: 'Manual Verification on iOS' })} onFail={() => onFail(errorMsg ? { error: errorMsg } : null)} />
    </Modal>
  );
}
