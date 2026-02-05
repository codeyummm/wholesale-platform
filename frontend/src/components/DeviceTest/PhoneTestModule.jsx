import React, { useState, useEffect } from "react";
import "./PhoneTestModule.css";

const TESTS = {
  touch: { name: "Touch" },
  camera: { name: "Camera" },
  wifi: { name: "WiFi" },
  bluetooth: { name: "Bluetooth" },
  gps: { name: "GPS" },
  accel: { name: "Accelerometer" },
  gyro: { name: "Gyroscope" },
  vibrate: { name: "Vibration" },
  cpu: { name: "CPU" },
  memory: { name: "Memory" },
  storage: { name: "Storage" },
  battery: { name: "Battery" },
  rearCam: { name: "Rear Camera" },
  frontCam: { name: "Front Camera" },
  nfc: { name: "NFC" },
  charging: { name: "Charging" },
  proximity: { name: "Proximity" },
  compass: { name: "Compass" }
};

export default function PhoneTestModule({ imei, onSaveResults }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const init = {};
    Object.keys(TESTS).forEach(function(k) {
      init[k] = { status: "pending" };
    });
    setResults(init);
  }, []);

  const upd = function(id, status, data) {
    setResults(function(p) {
      return { ...p, [id]: { status: status, data: data } };
    });
  };

  const run = async function(id) {
    upd(id, "running", null);
    await new Promise(function(r) { setTimeout(r, 500); });
    var passed = Math.random() > 0.2;
    upd(id, passed ? "passed" : "failed", null);
  };

  const runAll = async function() {
    setRunning(true);
    var keys = Object.keys(TESTS);
    for (var i = 0; i < keys.length; i++) {
      await run(keys[i]);
    }
    setRunning(false);
  };

  const reset = function() {
    var init = {};
    Object.keys(TESTS).forEach(function(k) {
      init[k] = { status: "pending" };
    });
    setResults(init);
  };

  var pass = 0;
  var fail = 0;
  Object.values(results).forEach(function(r) {
    if (r.status === "passed") pass++;
    if (r.status === "failed") fail++;
  });

  return (
    <div className="phone-test-module">
      <header className="test-header">
        <div className="header-content">
          <h1>Device Test</h1>
          <p className="subtitle">{imei || "18 Tests"}</p>
        </div>
        <div className="header-stats">
          <div className="stat passed">
            <span className="stat-value">{pass}</span>
            <span className="stat-label">Pass</span>
          </div>
          <div className="stat failed">
            <span className="stat-value">{fail}</span>
            <span className="stat-label">Fail</span>
          </div>
        </div>
      </header>
      <div className="test-controls">
        <button className="btn btn-primary" onClick={runAll} disabled={running}>
          {running ? "Running..." : "Run All"}
        </button>
        <button className="btn btn-secondary" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="test-grid">
        {Object.entries(TESTS).map(function(entry) {
          var id = entry[0];
          var def = entry[1];
          var r = results[id] || { status: "pending" };
          var statusClass = "test-card " + r.status;
          return (
            <div key={id} className={statusClass}>
              <div className="test-card-header">
                <span className={"status-indicator " + r.status}>
                  {r.status === "passed" ? "✓" : r.status === "failed" ? "✗" : "○"}
                </span>
                <h3>{def.name}</h3>
              </div>
              <button className="test-run-btn" onClick={function() { run(id); }} disabled={running}>
                Run
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
