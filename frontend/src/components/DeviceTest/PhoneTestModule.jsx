import React, { useState, useEffect, useRef } from 'react';
import './PhoneTestModule.css';

const STATUS = { PENDING: 'pending', RUNNING: 'running', PASSED: 'passed', FAILED: 'failed', SKIPPED: 'skipped', MANUAL: 'manual' };

const TEST_CATEGORIES = {
  display: { name: 'Display & Touch', icon: '📱', tests: ['touchScreen', 'multiTouch', 'screenRGB', 'proximityScreen'] },
  audio: { name: 'Audio', icon: '🔊', tests: ['speaker', 'receiver', 'earphone', 'frontMic', 'rearMic', 'bottomMic'] },
  camera: { name: 'Cameras', icon: '📷', tests: ['rearCamera', 'telephotoCamera', 'ultraWideCamera', 'frontCamera', 'flash', 'lidarScanner'] },
  sensors: { name: 'Sensors', icon: '🧭', tests: ['accelerometer', 'gyroscope', 'proximitySensor', 'compass', 'barometer', 'faceID', 'faceDetection', 'rearFaceDetection'] },
  connectivity: { name: 'Connectivity', icon: '📶', tests: ['wifi', 'bluetooth', 'nfc', 'cellularNetwork', 'gps', 'callFunction'] },
  hardware: { name: 'Hardware', icon: '⚙️', tests: ['volumeConakeButton', 'vibration', 'chargingPort', 'wirelessCharging'] },
  system: { name: 'System', icon: '💻', tests: ['cpu', 'memory', 'storage', 'specification'] }
};

const TEST_DEFINITIONS = {
  touchScreen: { name: 'Touch Screen', description: 'Test basic touch responsiveness', automated: true },
  multiTouch: { name: 'Multi-Touch', description: 'Test multi-finger touch support', automated: false },
  screenRGB: { name: 'Screen RGB', description: 'Test display color accuracy', automated: false },
  proximityScreen: { name: 'Proximity Screen', description: 'Test proximity sensor with display', automated: true },
  speaker: { name: 'Speaker', description: 'Test main speaker output', automated: false },
  receiver: { name: 'Receiver', description: 'Test earpiece speaker', automated: false },
  earphone: { name: 'Earphone Jack', description: 'Test headphone audio output', automated: false },
  frontMic: { name: 'Front Microphone', description: 'Test front microphone input', automated: false },
  rearMic: { name'Rear Microphone', description: 'Test rear microphone input', automated: false },
  bottomMic: { name: 'Bottom Microphone', description: 'Test bottom microphone input', automated: false },
  rearCamera: { name: 'Rear Camera', description: 'Test main rear camera', automated: true },
  telephotoCamera: { name: 'Telephoto Camera', description: 'Test telephoto lens', automated: true },
  ultraWideCamera: { name: 'Ultra Wide Camera', description: 'Test ultra-wide lens', automated: true },
  frontCamera: { name: 'Front Camera', description: 'Test selfie camera', automated: true },
  flash: { name: 'Flash/Torch', description: 'Test camera flash', automated: true },
  lidarScanner: { name: 'LiDAR Scanner', description: 'Test LiDAR depth sensor', automated: true },
  accelerometer: { name: 'Accelerometer', description: 'Test motion sensor', automated: true },
  gyroscope: { name: 'Gyroscope', description: 'Test rotation sensor', automated: true },
  proximitySensor: { name: 'Proximity Sensor', description: 'Test proximity detection', automated: true },
  compass: { name: 'Compass', description: 'Test magnetic compass', automated: true },
  barometer: { name: 'Barometer', description: 'Test atmospheric pressure sensor', automated: true },
  faceID: { name: 'Face ID', description: 'Test facial recognition unlock', automated: false },
  faceDetection: { name: 'Face Detection', description: 'Test front face detection', automated: true },
  rearFaceDetection: { name: 'Rear Face Detection', description: 'Test rear face detection', automated: true },
  wifi: { name: 'WiFi', description: 'Test wireless network connectivity', automated: true },
  bluetooth: { name: 'Bluetooth', description: 'Test Bluetooth connectivity', automated: true },
  nfc: { name: 'NFC', description: 'Test near-field communication', automated: true },
  cellularNetwork: { name: 'Cellular Network', description: 'Test mobile network connectivity', automated: true },
  gps: { name: 'GPS', description: 'Test location services', automated: true },
  callFunction: { name: 'Call Function', description: 'Test phone call capability', automated: false },
  volumeControl: { name: 'Volume Buttons', description: 'Test volume up/down buttons', automated: false },
  sleepWakeButton: { name: 'Sleep/Wake Button', description: 'Test power button', automated: false },
  vibration: { name: 'Vibration Motor', description: 'Test haptic feedback', automated: true },
  chargingPort: { name: 'Charging Port', description: 'Test wired charging', automated: true },
  wirelessCharging: { name: 'Wireless Charging', description: 'Test Qi wireless charging', automated: true },
  cpu: { name: 'CPU', description: 'Test processor performance', automated: true },
  memory: { name: 'Memory (RAM)', description: 'Test available memory', automated: true },
  storage: { name: 'Storage', description: 'Test storage capacity', automated: true },
  specification: { name: 'Device Specs', description: 'Read device specifications', automated: true }
};

const PhoneTestModule = ({ imei, inventoryId, onSaveResults }) => {
  const [testResults, setTestResults] = useState({});
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [deviceInfo, setDeviceInfo] = useState({});
  const [showManualTest, setShowManualTest] = useState(null);
  const [manualTestData, setManualTestData] = useState({});

  useEffect(() => {
    const initialResults = {};
    Object.keys(TEST_DEFINITIONS).forEach(test => { initialResults[test] = { status: STATUS.PENDING, data: null }; });
    setTestResults(initialResults);
    getDeviceInfo();
  }, []);

  const getDeviceInfo = async () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      orientation: window.screen.orientation?.type || 'unknown',
      touchPoints: navigator.maxTouchPoints,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory || 'unknown',
      connection: navigator.connection ? { type: navigator.connection.effectiveType, downlink: navigator.connection.downlink } : 'unknown'
    };
    setDeviceInfo(info);
  };

  const updateTestResult = (testId, status, data = null) => {
    setTestResults(prev => ({ ...prev, [testId]: { status, data, timestamp: new Date().toISOString() } }));
  };

  const testFunctions = {
    touchScreen: async () => {
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        return { passed: true, data: { touchPoints: navigator.maxTouchPoints } };
      }
      return { passed: false, data: { reason: 'Touch not supported' } };
    },
    multiTouch: async () => {
      setShowManualTest('multiTouch');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Place multiple fingers on the touch area below', touchPoints: [] }); });
    },
    screenRGB: async () => {
      setShowManualTest('screenRGB');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Verify each color displays correctly', colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'] }); });
    },
    proximityScreen: async () => {
      if ('ProximitySensor' in window) {
        try {
          const sensor = new window.ProximitySensor();
          return new Promise((resolve) => {
            sensor.addEventListener('reading', () => { resolve({ passed: true, data: { near: sensor.near } }); sensor.stop(); });
            sensor.addEventListener('error', (e) => { resolve({ passed: false, data: { reason: e.error.message } }); });
            sensor.start();
            setTimeout(() => { resolve({ passed: true, data: { available: true } }); sensor.stop(); }, 2000);
          });
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'ProximitySensor API not supported' } };
    },
    speaker: async () => {
      setShowManualTest('speaker');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Listen for the test tone from the speaker', type: 'audio' }); });
    },
    receiver: async () => {
      setShowManualTest('receiver');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Hold phone to ear and listen for tone from receiver', type: 'audio' }); });
    },
    earphone: async () => {
      setShowManualTest('earphone');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Connect earphones and verify audio output', type: 'audio' }); });
    },
    frontMic: async () => {
      setShowManualTest('frontMic');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Speak into the front microphone', type: 'microphone', micType: 'front' }); });
    },
    rearMic: async () => {
      setShowManualTest('rearMic');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Speak into the rear microphone', type: 'microphone', micType: 'rear' }); });
    },
    bottomMic: async () => {
      setShowManualTest('bottomMic');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Speak into the bottom microphone', type: 'microphone', micType: 'bottom' }); });
    },
    rearCamera: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
        stream.getTracks().forEach(track => track.stop());
        return { passed: true, data: { available: true } };
      } catch (e) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          return { passed: true, data: { available: true, note: 'Generic camera access' } };
        } catch (err) { return { passed: false, data: { reason: err.message } }; }
      }
    },
    telephotoCamera: async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length > 1) return { passed: true, data: { cameras: videoDevices.length } };
        return { passed: false, data: { reason: 'Single camera detected' } };
      } catch (e) { return { passed: false, data: { reason: e.message } }; }
    },
    ultraWideCamera: async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        return { passed: videoDevices.length >= 2, data: { cameras: videoDevices.length } };
      } catch (e) { return { passed: false, data: { reason: e.message } }; }
    },
    frontCamera: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        stream.getTracks().forEach(track => track.stop());
        return { passed: true, data: { available: true } };
      } catch (e) { return { passed: false, data: { reason: e.message } }; }
    },
    flash: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        stream.getTracks().forEach(t => t.stop());
        if (capabilities.torch) return { passed: true, data: { torchSupported: true } };
        return { passed: false, data: { reason: 'Torch not available' } };
      } catch (e) { return { passed: false, data: { reason: e.message } }; }
    },
    lidarScanner: async () => {
      if ('XRSystem' in window) {
        try {
          const supported = await navigator.xr?.isSessionSupported('immersive-ar');
          return { passed: !!supported, data: { arSupported: supported } };
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'WebXR not supported' } };
    },
    accelerometer: async () => {
      if ('Accelerometer' in window) {
        try {
          const sensor = new window.Accelerometer({ frequency: 60 });
          return new Promise((resolve) => {
            sensor.addEventListener('reading', () => { resolve({ passed: true, data: { x: sensor.x, y: sensor.y, z: sensor.z } }); sensor.stop(); });
            sensor.addEventListener('error', (e) => { resolve({ passed: false, data: { reason: e.error.message } }); });
            sensor.start();
            setTimeout(() => { resolve({ passed: true, data: { available: true } }); sensor.stop(); }, 2000);
          });
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      if ('DeviceMotionEvent' in window) {
        return new Promise((resolve) => {
          const handler = (e) => {
            if (e.accelerationIncludingGravity) {
              resolve({ passed: true, data: { x: e.accelerationIncludingGravity.x, y: e.accelerationIncludingGravity.y, z: e.accelerationIncludingGravity.z } });
              window.removeEventListener('devicemotion', handler);
            }
          };
          window.addEventListener('devicemotion', handler);
          setTimeout(() => { window.removeEventListener('devicemotion', handler); resolve({ passed: true, data: { available: true } }); }, 2000);
        });
      }
      return { passed: false, data: { reason: 'Accelerometer not supported' } };
    },
    gyroscope: async () => {
      if ('Gyroscope' in window) {
        try {
          const sensor = new window.Gyroscope({ frequency: 60 });
          return new Promise((resolve) => {
            sensor.addEventListener('reading', () => { resolve({ passed: true, data: { x: sensor.x, y: sensor.y, z: sensor.z } }); sensor.stop(); });
            sensor.addEventListener('error', (e) => { resolve({ passed: false, data: { reason: e.error.message } }); });
            sensor.start();
            setTimeout(() => { resolve({ passed: true, data: { available: true } }); sensor.stop(); }, 2000);
          });
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      if ('DeviceOrientationEvent' in window) {
        return new Promise((resolve) => {
          const handler = (e) => {
            if (e.alpha !== null) { resolve({ passed: true, data: { alpha: e.alpha, beta: e.beta, gamma: e.gamma } }); window.removeEventListener('deviceorientation', handler); }
          };
          window.addEventListener('deviceorientation', handler);
          setTimeout(() => { window.removeEventListener('deviceorientation', handler); resolve({ passed: true, data: { available: true } }); }, 2000);
        });
      }
      return { passed: false, data: { reason: 'Gyroscope not supported' } };
    },
    proximitySensor: async () => {
      if ('ProximitySensor' in window) {
        try {
          const sensor = new window.ProximitySensor();
          return new Promise((resolve) => {
            sensor.addEventListener('reading', () => { resolve({ passed: true, data: { near: sensor.near } }); sensor.stop(); });
            sensor.start();
            setTimeout(() => { resolve({ passed: true, data: { available: true } }); sensor.stop(); }, 2000);
          });
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'ProximitySensor API not supported' } };
    },
    compass: async () => {
      if ('AbsoluteOrientationSensor' in window) {
        try {
          const sensor = new window.AbsoluteOrientationSensor({ frequency: 60 });
          return new Promise((resolve) => {
            sensor.addEventListener('reading', () => { resolve({ passed: true, data: { quaternion: sensor.quaternion } }); sensor.stop(); });
            sensor.start();
            setTimeout(() => { resolve({ passed: true, data: { available: true } }); sensor.stop(); }, 2000);
          });
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      if ('DeviceOrientationEvent' in window) {
        return new Promise((resolve) => {
          const handler = (e) => {
            if (e.webkitCompassHeading !== undefined) resolve({ passed: true, data: { heading: e.webkitCompassHeading } });
            else if (e.alpha !== null) resolve({ passed: true, data: { alpha: e.alpha } });
            window.removeEventListener('deviceorientation', handler);
          };
          window.addEventListener('deviceorientation', handler);
          setTimeout(() => { window.removeEventListener('deviceorientation', handler); resolve({ passed: true, data: { available: true } }); }, 2000);
        });
      }
      return { passed: false, data: { reason: 'Compass not supported' } };
    },
    barometer: async () => {
      if ('Barometer' in window) {
        try {
          const sensor = new window.Barometer({ frequency: 1 });
          return new Promise((resolve) => {
            sensor.addEventListener('reading', () => { resolve({ passed: true, data: { pressure: sensor.pressure } }); sensor.stop(); });
            sensor.start();
            setTimeout(() => { resolve({ passed: true, data: { available: true } }); sensor.stop(); }, 2000);
          });
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'Barometer API not supported' } };
    },
    faceID: async () => {
      if ('PublicKeyCredential' in window) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (available) return { passed: true, data: { biometricAvailable: true } };
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'Platform authenticator not available' } };
    },
    faceDetection: async () => {
      if ('FaceDetector' in window) {
        try { new window.FaceDetector(); return { passed: true, data: { available: true } }; } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'FaceDetector API not supported' } };
    },
    rearFaceDetection: async () => {
      if ('FaceDetector' in window) {
        try { new window.FaceDetector(); return { passed: true, data: { available: true } }; } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'FaceDetector API not supported' } };
    },
    wifi: async () => {
      if ('connection' in navigator) {
        const conn = navigator.connection;
        return { passed: navigator.onLine, data: { online: navigator.onLine, type: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt } };
      }
      return { passed: navigator.onLine, data: { online: navigator.onLine } };
    },
    bluetooth: async () => {
      if ('bluetooth' in navigator) {
        try { const available = await navigator.bluetooth.getAvailability(); return { passed: available, data: { available } }; } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'Bluetooth API not supported' } };
    },
    nfc: async () => {
      if ('NDEFReader' in window) return { passed: true, data: { available: true } };
      return { passed: false, data: { reason: 'Web NFC not supported' } };
    },
    cellularNetwork: async () => {
      if ('connection' in navigator) {
        const conn = navigator.connection;
        return { passed: true, data: { type: conn.effectiveType, downlink: conn.downlink, saveData: conn.saveData } };
      }
      return { passed: false, data: { reason: 'Network Information API not supported' } };
    },
    gps: async () => {
      if ('geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { resolve({ passed: true, data: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } }); },
            (err) => { resolve({ passed: false, data: { reason: err.message } }); },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
      return { passed: false, data: { reason: 'Geolocation not supported' } };
    },
    callFunction: async () => {
      setShowManualTest('callFunction');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Test phone call functionality', type: 'call' }); });
    },
    volumeControl: async () => {
      setShowManualTest('volumeControl');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Press volume up and volume down buttons', type: 'buttons' }); });
    },
    sleepWakeButton: async () => {
      setShowManualTest('sleepWakeButton');
      return new Promise((resolve) => { setManualTestData({ resolve, instruction: 'Press the sleep/wake (power) button', type: 'buttons' }); });
    },
    vibration: async () => {
      if ('vibrate' in navigator) { navigator.vibrate([200, 100, 200]); return { passed: true, data: { supported: true } }; }
      return { passed: false, data: { reason: 'Vibration API not supported' } };
    },
    chargingPort: async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          return { passed: true, data: { charging: battery.charging, level: Math.round(battery.level * 100) + '%', chargingTime: battery.chargingTime, dischargingTime: battery.dischargingTime } };
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'Battery API not supported' } };
    },
    wirelessCharging: async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          return { passed: battery.charging, data: { charging: battery.charging, level: Math.round(battery.level * 100) + '%' } };
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'Battery API not supported' } };
    },
    cpu: async () => {
      const cores = navigator.hardwareConcurrency || 'unknown';
      const start = performance.now();
      let result = 0;
      for (let i = 0; i < 1000000; i++) result += Math.sqrt(i);
      const duration = performance.now() - start;
      return { passed: true, data: { cores, benchmarkMs: Math.round(duration), performance: duration < 50 ? 'excellent' : duration < 100 ? 'good' : 'fair' } };
    },
    memory: async () => {
      const memory = navigator.deviceMemory;
      if (performance.memory) {
        return { passed: true, data: { deviceMemory: memory ? `${memory} GB` : 'unknown', jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB', usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' } };
      }
      return { passed: true, data: { deviceMemory: memory ? `${memory} GB` : 'unknown' } };
    },
    storage: async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          return { passed: true, data: { quota: Math.round(estimate.quota / 1073741824) + ' GB', usage: Math.round(estimate.usage / 1048576) + ' MB', percentUsed: Math.round((estimate.usage / estimate.quota) * 100) + '%' } };
        } catch (e) { return { passed: false, data: { reason: e.message } }; }
      }
      return { passed: false, data: { reason: 'Storage API not supported' } };
    },
    specification: async () => {
      return { passed: true, data: { userAgent: navigator.userAgent, platform: navigator.platform, language: navigator.language, screenResolution: `${window.screen.width}x${window.screen.height}`, pixelRatio: window.devicePixelRatio, colorDepth: window.screen.colorDepth + ' bit', touchPoints: navigator.maxTouchPoints, cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'unknown' } };
    }
  };

  const runTest = async (testId) => {
    if (!testFunctions[testId]) { updateTestResult(testId, STATUS.SKIPPED, { reason: 'Test not implemented' }); return; }
    setCurrentTest(testId);
    updateTestResult(testId, STATUS.RUNNING);
    try {
      const result = await testFunctions[testId]();
      updateTestResult(testId, result.passed ? STATUS.PASSED : STATUS.FAILED, result.data);
    } catch (error) { updateTestResult(testId, STATUS.FAILED, { error: error.message }); }
    setCurrentTest(null);
  };

  const runAllTests = async () => {
    setIsAutoRunning(true);
    for (const category of Object.values(TEST_CATEGORIES)) {
      for (const testId of category.tests) {
        if (!isAutoRunning) break;
        const testDef = TEST_DEFINITIONS[testId];
        if (testDef.automated) { await runTest(testId); await new Promise(resolve => setTimeout(resolve, 300)); }
        else { updateTestResult(testId, STATUS.MANUAL, { reason: 'Manual test required' }); }
      }
    }
    setIsAutoRunning(false);
  };

  const stopAllTests = () => { setIsAutoRunning(false); setCurrentTest(null); setShowManualTest(null); };

  const resetAllTests = () => {
    stopAllTests();
    const initialResults = {};
    Object.keys(TEST_DEFINITIONS).forEach(test => { initialResults[test] = { status: STATUS.PENDING, data: null }; });
    setTestResults(initialResults);
  };

  const completeManualTest = (passed) => {
    if (manualTestData.resolve) manualTestData.resolve({ passed, data: { manualVerification: true } });
    setShowManualTest(null);
    setManualTestData({});
  };

  const getTestCounts = () => {
    const counts = { total: 0, passed: 0, failed: 0, pending: 0, manual: 0 };
    Object.values(testResults).forEach(result => {
      counts.total++;
      if (result.status === STATUS.PASSED) counts.passed++;
      else if (result.status === STATUS.FAILED) counts.failed++;
      else if (result.status === STATUS.MANUAL) counts.manual++;
      else if (result.status === STATUS.PENDING) counts.pending++;
    });
    return counts;
  };

  const getFilteredTests = () => {
    if (activeCategory === 'all') return Object.entries(TEST_DEFINITIONS);
    const categoryTests = TEST_CATEGORIES[activeCategory]?.tests || [];
    return Object.entries(TEST_DEFINITIONS).filter(([id]) => categoryTests.includes(id));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case STATUS.PASSED: return '✓';
      case STATUS.FAILED: return '✗';
      case STATUS.RUNNING: return '◌';
      case STATUS.MANUAL: return '⚡';
      default: return '○';
    }
  };

  const handleSaveResults = async () => {
    if (onSaveResults) {
      await onSaveResults({ deviceId: `DEVICE-${Date.now()}`, imei, inventoryId, deviceInfo, testResults, summary: getTestCounts() });
    }
  };

  const counts = getTestCounts();

  return (
    <div className="phone-test-module">
      <header className="test-header">
        <div className="header-content">
          <h1>📱 Device Diagnostics</h1>
          <p className="subtitle">{imei ? `Testing IMEI: ${imei}` : 'Comprehensive Hardware & Software Testing'}</p>
        </div>
        <div className="header-stats">
          <div classNamed"><span className="stat-value">{counts.passed}</span><span className="stat-label">Passed</span></div>
          <div className="stat failed"><span className="stat-value">{counts.failed}</span><span className="stat-label">Failed</span></div>
          <div className="stat pending"><span className="stat-value">{counts.pending}</span><span className="stat-label">Pending</span></div>
          <div className="stat manual"><span className="stat-value">{counts.manual}</span><span className="stat-label">Manual</span></div>
        </div>
      </header>

      <div className="test-controls">
        <button className={`btn btn-primary ${isAutoRunning ? 'running' : ''}`} onClick={isAutoRunning ? stopAllTests : runAllTests}>
          {isAutoRunning ? <><span className="spinner"></span> Stop Tests</> : <><span className="play-icon">▶</span> Run All Tests</>}
        </button>
        <button className="btn btn-secondary" onClick={resetAllTests}><span className="reset-icon">↺</span> Reset</button>
        {onSasults && <button className="btn btn-success" onClick={handleSaveResults} disabled={counts.passed === 0 && counts.failed === 0}>💾 Save Results</button>}
      </div>

      <nav className="category-nav">
        <button className={`category-btn ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>All Tests</button>
        {Object.entries(TEST_CATEGORIES).map(([key, cat]) => (
          <button key={key} className={`category-btn ${activeCategory === key ? 'active' : ''}`} onClick={() => setActiveCategory(key)}>
            <span className="category-icon">{cat.icon}</span>{cat.name}
          </button>
        ))}
      </nav>

      <div className="test-grid">
        {getFilteredTests().map(([testId, testDef]) => {
          const result = testResults[testId] || { status: STATUS.PENDING };
          return (
            <div key={testId} className={`test-card ${result.status} ${currentTest === testId ? 'active' : ''}`}>
              <div className="test-card-header">
              <span className={`status-indicator ${result.status}`}>{getStatusIcon(result.status)}</span>
                <h3>{testDef.name}</h3>
                {!testDef.automated && <span className="manual-badge">Manual</span>}
              </div>
              <p className="test-description">{testDef.description}</p>
              {result.data && <div className="test-data"><pre>{JSON.stringify(result.data, null, 2)}</pre></div>}
              <button className="test-run-btn" onClick={() => runTest(testId)} disabled={result.status === STATUS.RUNNING || isAutoRunning}>
                {result.status === STATUS.RUNNING ? 'Testing...' : 'Run Test'}
              </button>
            </div>
          );
        })}
      </div>

      {showManualTest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Manual Test: {TEST_DEFINITIONS[showManualTest]?.name}</h2>
            <p className="modal-instruction">{manualTestData.instruction}</p>
            {showManualTest === 'multiTouch' && <MultiTouchTestArea onComplete={completeManualTest} />}
            {showManualTest === 'screenRGB' && <RGBTestDisplay colors={manualTestData.colors} onComplete={completeManualTest} />}
            {manualTestData.type === 'audio' && <AudioTestControls onComplete={completeManualTest} />}
            {manualTestData.type === 'microphone' && <MicrophoneTestControls micType={manualTestData.micType} onComplete={completeManualTest} />}
            {manualTestData.type === 'buttons' && (
              <div className="button-test">
                <p>Follow the on-screen instructions and verify the button works correctly.</p>
                <div className="modal-actions">
                  <button className="btn btn-success" onClick={() => completeManualTest(true)}>✓ Button Works</button>
                  <button className="btn btn-danger" onClick={() => completeManualTest(false)}>✗ Button Failed</button>
                </div>
              </div>
            )}
            {manualData.type === 'call' && (
              <div className="call-test">
                <a href="tel:*#06#" className="btn btn-primary">Open Dialer</a>
                <div className="modal-actions">
                  <button className="btn btn-success" onClick={() => completeManualTest(true)}>✓ Call Function Works</button>
                  <button className="btn btn-danger" onClick={() => completeManualTest(false)}>✗ Call Function Failed</button>
                </div>
              </div>
            )}
            <button className="modal-close" onClick={() => completeManualTest(false)}>Skip Test</button>
          </div>
        </div>
      )}

      <div className="device-info-panel">
        <h3>Device Information</h3>
        <div className="device-info-grid">
          {Object.entries(deviceInfo).map(([key, value]) => (
            <div key={key} className="device-info-item">
              <span className="info-label">{key}</span>
              <span className="info-value">{typeof value === 'objec JSON.stringify(value) : String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MultiTouchTestArea = ({ onComplete }) => {
  const [touches, setTouches] = useState([]);
  const [maxTouches, setMaxTouches] = useState(0);
  const handleTouch = (e) => {
    const touchList = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    setTouches(touchList);
    if (touchList.length > maxTouches) setMaxTouches(touchList.length);
  };
  return (
    <div className="multitouch-area">
      <div className="touch-zone" onTouchStart={handleTouch} onTouchMove={handleTouch} onTouchEnd={handleTouch}>
        {touches.map(t => <div key={t.id} className="touch-point" style={{ left: t.x - 25, top: t.y - 25 }} />)}
        <p className="touch-count">Touch Points: {touches.length}</p>
        <p className="max-touch-count">Max Detected: {maxTouches}</p>
      </div>
      <div className="modal-actions">
        <button className="btn btn-success" onClick={() => onComplete(maxTouches >= 2)}>✓ Multi-Touch Works ({maxTouches}+ points)</button>
        <button className="btn btn-danger" onClick={() => onComplete(false)}>✗ Multi-Touch Failed</button>
      </div>
    </div>
  );
};

const RGBTestDisplay = ({ colors, onComplete }) => {
  const [currentColor, setCurrentColor] = useState(0);
  return (
    <div className="rgb-test">
      <div className="color-display" style={{ backgroundColor: colors[currentColor] }}><p className="color-name">{colors[currentColor]}</p></div>
      <div className="color-controls">
        <button onClick={() => setCurrentColor(prev => Math.max(0, prev - 1))} disabled={currentColor === 0}>← Previous</button>
        <span>{currentColor + 1} / {colors.length}</span>
        <button onClick={() => setCurrentColor(prev => Math.min(colors.length - 1, prev + 1))} disabled={currentColor === colors.length - 1}>Next →</button>
      </div>
      <div className="modal-actions">
        <button className="btn btn-success" o() => onComplete(true)}>✓ All Colors Display Correctly</button>
        <button className="btn btn-danger" onClick={() => onComplete(false)}>✗ Color Display Issues</button>
      </div>
    </div>
  );
};

const AudioTestControls = ({ onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const playTone = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.5;
    oscillator.start();
    oscillatorRef.current = oscillator;
    setIsPlaying(true);
  };
  const stopTone = () => { if (oscillatorRef.current) { oscillatorRef.current.stop(); oscillatorcurrent = null; setIsPlaying(false); } };
  return (
    <div className="audio-test">
      <button className={`btn ${isPlaying ? 'btn-danger' : 'btn-primary'}`} onClick={isPlaying ? stopTone : playTone}>{isPlaying ? '🔇 Stop Tone' : '🔊 Play Test Tone'}</button>
      <div className="modal-actions">
        <button className="btn btn-success" onClick={() => { stopTone(); onComplete(true); }}>✓ Audio Works</button>
        <button className="btn btn-danger" onClick={() => { stopTone(); onComplete(false); }}>✗ No Audio</button>
      </div>
    </div>
  );
};

const MicrophoneTestControls = ({ micType, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = strea const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setIsRecording(true);
      updateLevel();
    } catch (err) { console.error('Microphone access denied:', err); }
  };
  const updateLevel = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average);
    animationRef.current = requestAnimationFrame(updateLevel);
  };
  const stopRecording = () => {
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(track => track.stop()); mediaStreamRef.current = null; }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsRecording(false);
    setAudioLevel(0);
  };
  return (
    <div className="microphone-test">
      <p className="mic-instruction">Testing: {micType} microphone</p>
      <div className="audio-level-meter"><div className="audio-level-bar" style={{ width: `${Math.min(audioLevel * 2, 100)}%` }} /></div>
      <button className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}</button>
      <div className="modal-actions">
        <button className="btn btn-success" onClick={() => { stopRecording(); onComplete(true); }}>✓ Microphone Works</button>
        <button className="btn btn-danger" onClick={() => { stopRecording(); onComplete(false); }}>✗ No Audio Detected</button>
      </div>
    </div>
  );
};

export default PhoneTestModule;
