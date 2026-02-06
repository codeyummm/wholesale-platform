import React, { useState, useEffect, useRef } from "react";
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

export default function PhoneTestModule({ imei, onSaveResults }) {
  const [results, setResults] = useState({});
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const init = {};
    Object.keys(TESTS).forEach(k => init[k] = { status: "pending" });
    setResults(init);
  }, []);

  const done = (id, passed) => {
    setResults(p => ({ ...p, [id]: { status: passed ? "passed" : "failed" } }));
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

  return (
    <div className="phone-test-module">
      <header className="test-header">
        <div className="header-content">
          <h1>📱 Device Test</h1>
          <p className="subtitle">{imei || "20 Tests"}</p>
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
  nSaveResults && (
          <button className="btn btn-success" onClick={() => onSaveResults({ imei, results, cnt })}>
            💾 Save
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
      {mol === "display" && <DisplayModal onPass={() => done("display", true)} onFail={() => done("display", false)} onSkip={() => skip("display")} />}
      {modal === "speaker" && <SpeakerModal onPass={() => done("speaker", true)} onFail={() => done("speaker", false)} onSkip={() => skip("speaker")} />}
      {modal === "mic" && <MicModal onPass={() => done("mic", true)} onFail={() => done("mic", false)} onSkip={() => skip("mic")} />}
      {modal === "vibration" && <VibrationModal onPass={() => done("vibration", true)} onFail={() => done("vibration", false)} onSkip={() => skip("vibration")} />}
      {modal === "rearCam" && <CamModal facing="environment" onPass={() => done("rearCam", true)} onFail={() => done("rearCam", false)} onSkip={() => skip("rearCam")} />}
      {modal === "frontCam" && <CamModal facing="user" onPass={() => done("frontCam", true)} onFail={() => done("frontCam", false)} onSkip={() => skip("frontCam")} />}
      {modal === "wifi" && <SimpleModal title="WiFi" msg="Is WiFi working?" onPass={() => done("wifi", true)} onFail={() => done("wifi", false)} onSkip={() => skip("wifi")} />}
      {modal === "gps" && <GpsModal onPass={() => done("gps", true)} onFail={() => done("gps", false)} onSkip={() => skip("gps")} />}
      {modal === "accel" && <AccelModal onPass={() => done("accel", true)} onFail={() => done("accel", false)} onSkip={() => skip("accel")} />}
      {modal === "gyro" && <GyroModal onPass={() => done("gyro", true)} onFail={() => done("gyro", false)} onSkip={() => skip("gyro")} />}
      {modal === "battery" && <BatteryModal onPass={() => done("battery", true)} onFail={() => done("battery", false)} onSkip={() => skip("battery")} />}
      {modal === "bluetooth" && <SimpleModal title="Bluetooth" msg="Is Bluetooth working?" onPass={() => done("bluetooth", true)} onFail={() => done("bluetooth", false)} onSkip={() => skip("bluetooth")} />}
      {modal === "nfc" && <SimpleModal title="NFC" msg="Is NFC working?" onPass={() => done("nfc", true)} onFail={() => done("nfc", false)} onSkip={() => skip("nfc")} />}
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
    const p =ay.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    setPts(p);
  };
  return (
    <Modal title="Touch Test" onSkip={onSkip}>
      <div style={{ height: 200, background: "#1a1a2e", borderRadius: 10, position: "relative", touchAction: "none" }} onTouchStart={h} onTouchMove={h}>
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
      <div style={{ height: 150, background: "#1a1a2e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", touchAction: "none" }} onTouchStart={h} onTouchMove={h} onTouchEnd={h}>
        <p style={{ fontSize: 40, color: "#0ff", margin: 0 }}>{n}</p>
        <p style={{ color: "#888" }}>Max: {max}</p>
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
      <div style={{ height: 30, background: "#1a1a2e", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
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
      {loc && <p style={{ background: "#1a1a2e", padding: 10, borderRadius: 5 }}>Lat: {loc.lat}, Lng: {loc.lng}</p>}
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function AccelModal({ onPass, onFail, onSkip }) {
  const [d, setD] = useState({ x: 0, y: 0, z: 0 });
  useEffect(() => {
    const h = e => {
      if (e.accelerationIncludingGravity) {
        setD({ x: e.accelerationIncludingGravity.x?.toFixed(1) || 0, y: e.accelerationIncludingGravity.y?.toFixed(1) || 0, z: e.accelerationIncludingGravy.z?.toFixed(1) || 0 });
      }
    };
    window.addEventListener("devicemotion", h);
    return () => window.removeEventListener("devicemotion", h);
  }, []);
  return (
    <Modal title="Accelerometer" onSkip={onSkip}>
      <div style={{ background: "#1a1a2e", padding: 15, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
        <p>X: {d.x} | Y: {d.y} | Z: {d.z}</p>
        <p style={{ color: "#888", fontSize: 12 }}>Shake phone to see values change</p>
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
      <div style={{ background: "#1a1a2e", padding: 15, borderRadius: 10, textAlign: "center", marginBottom: 15 }}>
        <p>α: {d.a}° | β: {d.b}° | γ: {d.g}°</p>
        <p style={{ color: "#888", fontSize: 12 }}>Rotate phone to see values change</p>
      </div>
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}

function BatteryModal({ onPass, onFail, onSkip }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if ("getBattery" in navigator) {
      navigator.getBattery().then(b => setInfo({ level: Math.round(b.level * 100), charging: b.charging }));
    }
  }, []);
  return (
    <Modal title="Battery" onSkip={onSkip}>
      {info ? (
        <div style={{ textAlign: "center", padding: 15 }}>
          <p style={{ fontSize: 36 }}>🔋 {info.level}%</p>
          <p>{info.charging ? "⚡ Charging" : "Not charging"}</p>
        </div>
      ) : <p>Battery info not available</p>}
      <Btns onPass={onPass} onFail={onFail} />
    </Modal>
  );
}
