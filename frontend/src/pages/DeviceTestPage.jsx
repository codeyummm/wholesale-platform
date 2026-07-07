import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Smartphone, Mic, Camera, Activity, Check, X, Vibrate, RefreshCw } from 'lucide-react';

export default function DeviceTestPage() {
  const [searchParams] = useSearchParams();
  const imei = searchParams.get('imei');
  const inventoryId = searchParams.get('inventoryId');
  const deviceId = searchParams.get('deviceId');

  const [step, setStep] = useState(0);
  const [results, setResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const tests = [
    { id: 'touchScreen', title: 'Screen Digitizer', icon: Smartphone, type: 'interactive' },
    { id: 'vibration', title: 'Vibrator Engine', icon: Vibrate, type: 'manual' },
    { id: 'frontMic', title: 'Microphone Check', icon: Mic, type: 'manual' },
    { id: 'rearCamera', title: 'Rear Camera', icon: Camera, type: 'manual' },
    { id: 'frontCamera', title: 'Front Camera', icon: Camera, type: 'manual' }
  ];

  const currentTest = tests[step];

  const handlePass = () => {
    setResults(prev => ({ ...prev, [currentTest.id]: { status: 'passed' } }));
    nextStep();
  };

  const handleFail = () => {
    setResults(prev => ({ ...prev, [currentTest.id]: { status: 'failed' } }));
    nextStep();
  };

  const nextStep = () => {
    if (step < tests.length - 1) {
      setStep(step + 1);
    } else {
      submitResults();
    }
  };

  const submitResults = async () => {
    setSaving(true);
    try {
      // Mocking device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/device-tests`, {
        imei,
        inventoryId,
        deviceId,
        deviceInfo,
        testResults: results,
        testedBy: 'Warehouse Staff',
        overallStatus: Object.values(results).some(r => r.status === 'failed') ? 'failed' : 'passed'
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Failed to save test results');
    } finally {
      setSaving(false);
    }
  };

  if (!imei) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Smartphone size={48} className="text-gray-600 mb-4" />
        <h1 className="text-xl font-bold mb-2">Invalid Device Link</h1>
        <p className="text-gray-400">Please scan the QR code from the desktop dashboard to begin testing.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <Check size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Tests Completed!</h1>
        <p className="text-gray-400 mb-8">The diagnostics have been saved to the database. You can close this window and proceed to the next device.</p>
        <div className="bg-gray-800 p-4 rounded-xl text-left w-full max-w-sm">
          <div className="text-sm font-mono text-gray-400 mb-1">Device IMEI</div>
          <div className="text-lg font-bold">{imei}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400 font-mono">TESTING DEVICE</div>
          <div className="font-bold">{imei}</div>
        </div>
        <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
          Step {step + 1}/{tests.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {currentTest && (
          <div className="animate-in fade-in zoom-in duration-300">
            <currentTest.icon size={64} className="text-[#009EF7] mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">{currentTest.title}</h2>
            
            <div className="text-gray-400 mb-10 max-w-xs mx-auto">
              {currentTest.id === 'touchScreen' && "Verify that the entire touchscreen responds accurately to taps and swipes without dead zones."}
              {currentTest.id === 'vibration' && "Click 'Pass' if you can feel the device vibrating properly."}
              {currentTest.id === 'frontMic' && "Speak into the microphone. Click 'Pass' if the audio level registers."}
              {currentTest.id === 'rearCamera' && "Verify the rear lens is clear and focuses correctly."}
              {currentTest.id === 'frontCamera' && "Verify the selfie camera is clear and focuses correctly."}
            </div>

            {currentTest.id === 'vibration' && (
              <button 
                onClick={() => navigator.vibrate && navigator.vibrate(500)}
                className="mb-8 px-6 py-3 bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition-colors"
              >
                Vibrate Phone
              </button>
            )}

            <div className="flex gap-4 justify-center w-full max-w-xs mx-auto">
              <button 
                onClick={handleFail}
                className="flex-1 py-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-red-500/20 transition-all"
              >
                <X size={24} /> Fail
              </button>
              <button 
                onClick={handlePass}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold flex flex-col items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
              >
                <Check size={24} /> Pass
              </button>
            </div>
          </div>
        )}
        {saving && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur flex items-center justify-center flex-col z-50">
            <RefreshCw size={32} className="text-[#009EF7] animate-spin mb-4" />
            <div className="font-bold text-lg">Saving Results to Database...</div>
          </div>
        )}
      </div>
    </div>
  );
}
