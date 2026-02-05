import React, { useState, useEffect } from "react";
import "./PhoneTestModule.css";

const TESTS = {
  touch: { name: "Touch", auto: true },
  camera: { name: "Camera", auto: true },
  wifi: { name: "WiFi", auto: true },
  gps: { name: "GPS", auto: true },
  cpu: { name: "CPU", auto: true },
  vibrate: { name: "Vibrate", auto: true }
};

export default function PhoneTestModule({ imei, onSaveResults }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const init = {};
    Object.keys(TESTS).forEach(k => {
      init[k] = { status: "pending" };
    });
    setResults(init);
  }, []);

  const update = (id, status, data) => {
    setResults(p => ({
      ...p,
      [id]: { status, data }
    }));
  };

  const funcs = {
    touch: async () => {
      return { passed: navigator.maxTouchPoints > 0 };
    },
    camera: async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        s.getTracks().forEach(t => t.stop());
        return { passed: true };
      } catch (e) {
        return { passed: false };
      }
    },
    wifi: async () => {
      return { passed: navigator.onLine };
    },
    gps: async () => {
      return { passed: "geolocation" in navigator };
    },
    cpu: async () => {
      const cores = navigator.hardwareConcurrency;
      return { passed: true, data: { cores } };
    },
    vibrate: async () => {
      if ("vibrate" in navigator) {
        navigator.vibrate(200);
        return { passed: true };
      }
      return { passed: false };
    }
  };

  const run = async (id) => {
    update(id, "running");
    try {
      const r = await funcs[id]();
      update(id, r.passed ? "passed" : "failed", r.data);
    } catch (e) {
      update(id, "failed");
    }
  };

  const runAll = async () => {
    setRunning(true);
    for (const id of Object.keys(TESTS)) {
      await run(id);
      await new Promise(r => setTimeout(r, 300));
    }
    setRunning(false);
  };

  const reset = () => {
    const init = {};
    Object.keys(TESTS).forEach(k => {
      init[k] = { status: "pending" };
    });
    setResults(init);
  };

  const counts = Object.values(results).reduce((c, r) => {
    c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, {});

  const icon = (s) => {
    if (s === "passed") return "✓";
    if (s === "failed") return "✗";
    if (s === "running") return "○";
    return "·";
  };

  const save = () => {
    if (onSaveResults) {
      onSaveResults({
        deviceId: "D" + Date.now(),
        imei: imei,
        testResults: results
      });
    }
  };

  return (
    <div className="phone-test-module">
      <header className="test-header">
        <div className="header-content">
          <h1>Device Test</h1>
          <p cl="subtitle">{imei || "Testing"}</p>
        </div>
        <div className="header-stats">
          <div className="stat passed">
            <span className="stat-value">
              {counts.passed || 0}
            </span>
            <span className="stat-label">Pass</span>
          </div>
          <div className="stat failed">
            <span className="stat-value">
              {counts.failed || 0}
            </span>
            <span className="stat-label">Fail</span>
          </div>
        </div>
      </header>

      <div className="test-controls">
        <button
          className="btn btn-primary"
          onClick={runAll}
          disabled={running}
        >
          {running ? "Running..." : "Run All"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={reset}
        >
          Reset
        </button>
        {onSaveResults && (
          <button
            className="btn btn-success"
            onClick={save}
          >
            Save
          </button>
        )}
      </div>

      <div className="test-grid">
        {Object.entries(TESTS).map(([id, def]) => {
          const r = results[id] || {};
          return (
            <div
              key={id}
              className={"test-card " + (r.status || "")}
            >
              <div className="test-card-header">
                <span className={"status-indicator " + r.status}>
                  {icon(r.status)}
                </span>
                <h3>{def.name}</h3>
              </div>
              <button
                className="test-run-btn"
                onClick={() => run(id)}
                disabled={running}
              >
                Run
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
