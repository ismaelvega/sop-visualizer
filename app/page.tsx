"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type RecordingState = "idle" | "recording" | "ready";

const PRESETS = [
  {
    id: "none",
    label: "No event",
    frequency: 0,
    amplitude: 0.05,
    severity: "Baseline",
    detail: "Normal operation, no mechanical disturbance.",
  },
  {
    id: "shake-1",
    label: "Shaking 1 Hz",
    frequency: 1,
    amplitude: 0.14,
    severity: "Low",
    detail: "Ambient vibration, benign noise.",
  },
  {
    id: "shake-3",
    label: "Shaking 3 Hz",
    frequency: 3,
    amplitude: 0.22,
    severity: "Moderate",
    detail: "Minor disturbance with clear fingerprint.",
  },
  {
    id: "shake-5",
    label: "Shaking 5 Hz",
    frequency: 5,
    amplitude: 0.3,
    severity: "High",
    detail: "Sustained mechanical stress.",
  },
  {
    id: "shake-10",
    label: "Shaking 10 Hz",
    frequency: 10,
    amplitude: 0.36,
    severity: "Critical",
    detail: "Intrusion-level shake events.",
  },
];

const TWO_PI = Math.PI * 2;
const SAMPLE_RATE = 60;

export default function Home() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const baselineTipRef = useRef<number | null>(null);
  const recordingRef = useRef<number[]>([]);
  const lastSampleTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const lastProgressUpdateRef = useRef(0);
  const prevAngleRef = useRef(0);

  const [presetId, setPresetId] = useState("shake-3");
  const [frequency, setFrequency] = useState(3);
  const [amplitude, setAmplitude] = useState(0.25);
  const [noiseEnabled, setNoiseEnabled] = useState(true);
  const [noiseFrequency, setNoiseFrequency] = useState(3);
  const [noiseAmplitude, setNoiseAmplitude] = useState(0.08);
  const [isRunning, setIsRunning] = useState(true);
  const [recordingState, setRecordingState] =
    useState<RecordingState>("idle");
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(6);
  const [recordedData, setRecordedData] = useState<number[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [readout, setReadout] = useState({
    angle: 0,
    tip: 0,
    sopas: 0,
  });

  const activePreset = useMemo(
    () => PRESETS.find((preset) => preset.id === presetId),
    [presetId]
  );

  useEffect(() => {
    if (presetId === "custom") {
      return;
    }
    if (activePreset) {
      setFrequency(activePreset.frequency);
      setAmplitude(activePreset.amplitude);
    }
  }, [activePreset, presetId]);

  const frequencyRef = useRef(frequency);
  const amplitudeRef = useRef(amplitude);
  const noiseEnabledRef = useRef(noiseEnabled);
  const noiseFrequencyRef = useRef(noiseFrequency);
  const noiseAmplitudeRef = useRef(noiseAmplitude);
  const isRunningRef = useRef(isRunning);
  const recordingStateRef = useRef<RecordingState>(recordingState);
  const recordedDataRef = useRef(recordedData);
  const recordingDurationRef = useRef(recordingDuration);

  useEffect(() => {
    frequencyRef.current = frequency;
  }, [frequency]);

  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    noiseEnabledRef.current = noiseEnabled;
  }, [noiseEnabled]);

  useEffect(() => {
    noiseFrequencyRef.current = noiseFrequency;
  }, [noiseFrequency]);

  useEffect(() => {
    noiseAmplitudeRef.current = noiseAmplitude;
  }, [noiseAmplitude]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    recordedDataRef.current = recordedData;
  }, [recordedData]);

  useEffect(() => {
    recordingDurationRef.current = recordingDuration;
  }, [recordingDuration]);

  const updateRecordingState = useCallback((state: RecordingState) => {
    recordingStateRef.current = state;
    setRecordingState(state);
  }, []);

  const startRecording = useCallback(() => {
    recordingRef.current = [];
    lastSampleTimeRef.current = timeRef.current;
    recordedDataRef.current = [];
    setRecordedData([]);
    setRecordingProgress(0);
    setRecordingSeconds(0);
    updateRecordingState("recording");
  }, [updateRecordingState]);

  const stopRecording = useCallback(() => {
    updateRecordingState("ready");
    recordedDataRef.current = [...recordingRef.current];
    setRecordedData(recordedDataRef.current);
    setRecordingProgress(1);
    setRecordingSeconds(recordingRef.current.length / SAMPLE_RATE);
  }, [updateRecordingState]);

  const clearRecording = useCallback(() => {
    recordingRef.current = [];
    recordedDataRef.current = [];
    setRecordedData([]);
    setRecordingProgress(0);
    setRecordingSeconds(0);
    updateRecordingState("idle");
  }, [updateRecordingState]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#f5efe6", 6, 18);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0.3, 2.4, 6.2);
    camera.lookAt(0, 1.6, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    const keyLight = new THREE.DirectionalLight(0xfff2df, 1.2);
    keyLight.position.set(4, 6, 3);
    const fillLight = new THREE.DirectionalLight(0xd8f0f0, 0.6);
    fillLight.position.set(-3, 2, -2);
    scene.add(ambientLight, keyLight, fillLight);

    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3e7d8,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3d42,
      metalness: 0.4,
      roughness: 0.5,
    });
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6b178,
      metalness: 0.2,
      roughness: 0.4,
    });
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f5055,
      metalness: 0.35,
      roughness: 0.3,
    });
    const effectorMaterial = new THREE.MeshStandardMaterial({
      color: 0xe89c5b,
      emissive: 0x7a3c00,
      emissiveIntensity: 0.25,
      roughness: 0.2,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 0.22, 32),
      baseMaterial
    );
    base.position.y = 0.11;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.9, 32),
      baseMaterial
    );
    pedestal.position.y = 0.65;

    const shoulder = new THREE.Group();
    shoulder.position.set(0, 1.08, 0);

    const shoulderJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      jointMaterial
    );
    const upperArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.2, 0.22),
      armMaterial
    );
    upperArm.position.y = 0.6;
    shoulder.add(shoulderJoint, upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = 1.2;
    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 20),
      jointMaterial
    );
    const foreArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.9, 0.2),
      armMaterial
    );
    foreArm.position.y = 0.45;
    elbow.add(elbowJoint, foreArm);

    const wrist = new THREE.Group();
    wrist.position.y = 0.9;
    const effector = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 18, 18),
      effectorMaterial
    );
    wrist.add(effector);
    elbow.add(wrist);
    shoulder.add(elbow);

    const armGroup = new THREE.Group();
    armGroup.add(base, pedestal, shoulder);
    scene.add(armGroup);

    const anchor = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.08, 0.25),
      jointMaterial
    );
    anchor.position.set(-1.6, 0.15, 0);
    scene.add(anchor);

    const pointCount = 18;
    const cablePoints = Array.from({ length: pointCount }, () => new THREE.Vector3());
    const noisePhases = Array.from(
      { length: pointCount },
      () => Math.random() * TWO_PI
    );
    const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
    const cableGeometry = new THREE.BufferGeometry().setFromPoints(
      cableCurve.getPoints(80)
    );
    const cableMaterial = new THREE.LineBasicMaterial({
      color: 0x2b6f77,
      linewidth: 2,
    });
    const cable = new THREE.Line(cableGeometry, cableMaterial);
    scene.add(cable);

    const endPoint = new THREE.Vector3();
    const startPoint = new THREE.Vector3();

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (width === 0 || height === 0) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const drawRecording = (
      data: number[],
      progress: number,
      isLive: boolean
    ) => {
      const canvas = recordingCanvasRef.current;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const padding = 18;
      const graphWidth = width - padding * 2;
      const graphHeight = height - padding * 2;

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(27, 28, 31, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const y = padding + (graphHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(27, 28, 31, 0.35)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, padding + graphHeight / 2);
      ctx.lineTo(width - padding, padding + graphHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (data.length > 1) {
        const maxValue =
          data.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0) || 0.1;
        const scale = (graphHeight / 2) * 0.85;

        ctx.strokeStyle = isLive ? "#2b6f77" : "#1d4e54";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        data.forEach((value, index) => {
          const x = padding + (graphWidth * index) / (data.length - 1);
          const y =
            padding + graphHeight / 2 - (value / maxValue) * scale;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }

      if (isLive) {
        ctx.strokeStyle = "#e89c5b";
        ctx.lineWidth = 2;
        const x = padding + graphWidth * Math.min(progress, 1);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + graphHeight);
        ctx.stroke();
      }
    };

    let frameId = 0;
    let lastTimestamp = 0;

    const animate = (timestamp: number) => {
      frameId = window.requestAnimationFrame(animate);
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }
      const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      if (isRunningRef.current) {
        timeRef.current += delta;
      }

      const simTime = timeRef.current;
      const freq = frequencyRef.current;
      const amp = amplitudeRef.current;
      const noiseFreq = noiseFrequencyRef.current;
      const noiseAmp = noiseAmplitudeRef.current;
      const noiseActive = noiseEnabledRef.current;

      const baseAngle = Math.sin(simTime * TWO_PI * freq) * amp * 1.1;
      const noiseAngle = noiseActive
        ? Math.sin(simTime * TWO_PI * noiseFreq) * noiseAmp * 0.7
        : 0;
      const armAngle = baseAngle + noiseAngle;

      shoulder.rotation.z = armAngle;
      elbow.rotation.z = 0.3 + armAngle * 0.8;
      wrist.rotation.z = -0.2 + armAngle * 0.4;

      effector.getWorldPosition(endPoint);
      if (baselineTipRef.current === null) {
        baselineTipRef.current = endPoint.y;
      }

      startPoint.set(-1.6, 0.2, 0);

      const baseWavePhase = simTime * TWO_PI * freq;
      const noisePhase = simTime * TWO_PI * noiseFreq;
      for (let i = 0; i < pointCount; i += 1) {
        const alpha = i / (pointCount - 1);
        const point = cablePoints[i];
        point.lerpVectors(startPoint, endPoint, alpha);

        const sag = -0.45 * Math.sin(Math.PI * alpha);
        const wave = Math.sin(baseWavePhase + alpha * 6) * amp * 0.28;
        const lateral = Math.cos(baseWavePhase * 0.9 + alpha * 4) * amp * 0.12;
        const noise =
          noiseActive
            ? Math.sin(noisePhase + noisePhases[i]) * noiseAmp * 0.3
            : 0;

        point.y += sag + wave + noise;
        point.z += lateral + noise * 0.5;
      }

      cableGeometry.setFromPoints(cableCurve.getPoints(80));

      const tipDisplacement =
        endPoint.y - (baselineTipRef.current ?? endPoint.y);
      const angularSpeed =
        Math.abs(armAngle - prevAngleRef.current) / Math.max(delta, 0.001);
      prevAngleRef.current = armAngle;

      if (timestamp - lastUiUpdateRef.current > 120) {
        lastUiUpdateRef.current = timestamp;
        setReadout({
          angle: armAngle,
          tip: tipDisplacement,
          sopas: angularSpeed,
        });
      }

      if (recordingStateRef.current === "recording") {
        const interval = 1 / SAMPLE_RATE;
        if (simTime - lastSampleTimeRef.current >= interval) {
          lastSampleTimeRef.current = simTime;
          recordingRef.current.push(tipDisplacement);
        }

        const maxSamples = Math.max(
          1,
          Math.round(recordingDurationRef.current * SAMPLE_RATE)
        );

        if (recordingRef.current.length >= maxSamples) {
          stopRecording();
        } else if (timestamp - lastProgressUpdateRef.current > 120) {
          lastProgressUpdateRef.current = timestamp;
          const progress = recordingRef.current.length / maxSamples;
          setRecordingProgress(progress);
          setRecordingSeconds(recordingRef.current.length / SAMPLE_RATE);
        }
      }

      const dataToRender =
        recordingStateRef.current === "recording"
          ? recordingRef.current
          : recordedDataRef.current;
      const maxSamples = Math.max(
        1,
        Math.round(recordingDurationRef.current * SAMPLE_RATE)
      );
      const liveProgress =
        recordingStateRef.current === "recording"
          ? recordingRef.current.length / maxSamples
          : 1;
      drawRecording(
        dataToRender,
        liveProgress,
        recordingStateRef.current === "recording"
      );

      renderer.render(scene, camera);
    };

    resize();
    animate(0);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [stopRecording]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-8 h-64 w-64 rounded-full bg-[rgba(244,213,184,0.7)] blur-3xl animate-[pulse-glow_6s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute right-12 top-16 h-40 w-40 rounded-[40%] bg-[rgba(207,231,228,0.8)] blur-2xl animate-[drift_8s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute bottom-12 left-1/3 h-32 w-32 rounded-full bg-[rgba(232,156,91,0.4)] blur-2xl animate-[drift_10s_ease-in-out_infinite]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-20 pt-16">
        <header className="flex flex-col gap-6">
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-[var(--ink-muted)]">
            <span className="h-[1px] w-16 bg-[rgba(43,111,119,0.6)]" />
            SOP Shaker Lab
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              Interactive simulator for SOP shaking experiments
            </h1>
            <p className="max-w-2xl text-lg text-[var(--ink-muted)]">
              Recreate the robotic arm perturbations, cable motion, and sinusoidal
              noise injection described in the paper. Tune vibration classes,
              record cable tip displacement, and watch the fingerprint evolve in
              real time.
            </p>
          </div>
        </header>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-[var(--border-soft)] bg-[rgba(255,247,235,0.85)] p-6 shadow-[0_30px_80px_-60px_rgba(27,29,31,0.8)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                  Testbed playback
                </p>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  Robotic arm + cable
                </h2>
              </div>
              <span className="rounded-full border border-[var(--accent)]/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                {isRunning ? "Running" : "Paused"}
              </span>
            </div>
            <div
              ref={mountRef}
              className="mt-6 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[radial-gradient(circle_at_top,#fff8ef,transparent_65%)]"
            />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Arm angle
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {readout.angle.toFixed(2)} rad
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Tip displacement
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {(readout.tip * 1000).toFixed(1)} mm
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  SOPAS proxy
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {readout.sopas.toFixed(2)} rad/s
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-[var(--border-soft)] bg-[rgba(255,247,235,0.9)] p-6 shadow-[0_24px_60px_-50px_rgba(27,29,31,0.75)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                    Control deck
                  </p>
                  <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                    Shaking + noise
                  </h2>
                </div>
                <button
                  className="rounded-full border border-[rgba(43,111,119,0.6)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                  onClick={() => setIsRunning((prev) => !prev)}
                  type="button"
                >
                  {isRunning ? "Pause" : "Resume"}
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                    Preset class
                  </label>
                  <select
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-white/80 px-4 py-3 text-base text-[var(--foreground)] shadow-sm"
                    value={presetId}
                    onChange={(event) => setPresetId(event.target.value)}
                  >
                    {PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label} - {preset.severity}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {activePreset?.detail ??
                      "Custom settings. Adjust the sliders below."}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                      Shake frequency
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={0.1}
                      value={frequency}
                      onChange={(event) => {
                        setFrequency(parseFloat(event.target.value));
                        setPresetId("custom");
                      }}
                      className="w-full"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                      <span>0 Hz</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {frequency.toFixed(1)} Hz
                      </span>
                      <span>12 Hz</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                      Shake amplitude
                    </label>
                    <input
                      type="range"
                      min={0.02}
                      max={0.5}
                      step={0.01}
                      value={amplitude}
                      onChange={(event) => {
                        setAmplitude(parseFloat(event.target.value));
                        setPresetId("custom");
                      }}
                      className="w-full"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                      <span>0.02</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {amplitude.toFixed(2)}
                      </span>
                      <span>0.50</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgba(43,111,119,0.3)] bg-[rgba(207,231,228,0.6)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                        Noise injection
                      </p>
                      <p className="text-sm text-[var(--foreground)]">
                        Add sinusoidal interference to emulate environmental
                        vibrations.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={noiseEnabled}
                        onChange={(event) => setNoiseEnabled(event.target.checked)}
                        style={{ accentColor: "var(--accent)" }}
                      />
                      {noiseEnabled ? "On" : "Off"}
                    </label>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                        Noise frequency
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.1}
                        value={noiseFrequency}
                        onChange={(event) =>
                          setNoiseFrequency(parseFloat(event.target.value))
                        }
                        className="w-full"
                        style={{ accentColor: "var(--accent-strong)" }}
                        disabled={!noiseEnabled}
                      />
                      <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                        <span>0 Hz</span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {noiseFrequency.toFixed(1)} Hz
                        </span>
                        <span>8 Hz</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                        Noise amplitude
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.2}
                        step={0.01}
                        value={noiseAmplitude}
                        onChange={(event) =>
                          setNoiseAmplitude(parseFloat(event.target.value))
                        }
                        className="w-full"
                        style={{ accentColor: "var(--accent-strong)" }}
                        disabled={!noiseEnabled}
                      />
                      <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                        <span>0.00</span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {noiseAmplitude.toFixed(2)}
                        </span>
                        <span>0.20</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border-soft)] bg-[rgba(255,247,235,0.9)] p-6 shadow-[0_24px_60px_-50px_rgba(27,29,31,0.75)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                Paper setup
              </p>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Experiment summary
              </h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--ink-muted)]">
                <p>
                  CW laser 1530 nm (6 dBm) -> SMF 8 km + 5 km -> robotic arm shakes
                  a short fiber section -> polarimeter sampling 1500 Hz (ATE 16).
                </p>
                <p>
                  Five severity classes: no event, 1 Hz, 3 Hz, 5 Hz, 10 Hz.
                  Noise sweeps at 1/3/5 Hz to test resilience.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <span
                    key={preset.id}
                    className="rounded-full border border-[var(--border-soft)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--foreground)]"
                  >
                    {preset.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-[var(--border-soft)] bg-[rgba(255,247,235,0.85)] p-6 shadow-[0_30px_80px_-60px_rgba(27,29,31,0.8)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-muted)]">
                  Recording
                </p>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  Cable tip displacement
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {recordingState !== "recording" ? (
                  <button
                    className="rounded-full border border-[rgba(43,111,119,0.6)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                    onClick={startRecording}
                    type="button"
                  >
                    Capture
                  </button>
                ) : (
                  <button
                    className="rounded-full border border-[rgba(232,156,91,0.8)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-warm)] transition hover:bg-[rgba(232,156,91,0.2)]"
                    onClick={stopRecording}
                    type="button"
                  >
                    Stop
                  </button>
                )}
                <button
                  className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)] transition hover:bg-white/60"
                  onClick={clearRecording}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-5">
              <canvas
                ref={recordingCanvasRef}
                className="h-48 w-full rounded-2xl border border-[var(--border-soft)] bg-white/60"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-muted)]">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-[0.25em]">
                  Status
                </span>
                <span className="font-semibold text-[var(--foreground)]">
                  {recordingState === "recording"
                    ? "Recording"
                    : recordingState === "ready"
                    ? "Ready"
                    : "Idle"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-[0.25em]">
                  Duration
                </span>
                <span className="font-semibold text-[var(--foreground)]">
                  {recordingState === "recording"
                    ? `${recordingSeconds.toFixed(1)}s / ${recordingDuration.toFixed(
                        0
                      )}s`
                    : `${(recordedData.length / SAMPLE_RATE).toFixed(1)}s`}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-[0.25em]">
                  Sample rate
                </span>
                <span className="font-semibold text-[var(--foreground)]">
                  {SAMPLE_RATE} Hz
                </span>
              </div>
              <div className="flex flex-col gap-1 min-w-[160px]">
                <span className="text-xs uppercase tracking-[0.25em]">
                  Recording length
                </span>
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={recordingDuration}
                  onChange={(event) =>
                    setRecordingDuration(parseInt(event.target.value, 10))
                  }
                  className="w-full"
                  style={{ accentColor: "var(--accent)" }}
                  disabled={recordingState === "recording"}
                />
              </div>
            </div>
            {recordingState === "recording" && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--paper-strong)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${Math.min(recordingProgress * 100, 100)}%` }}
                />
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[var(--border-soft)] bg-[rgba(255,247,235,0.9)] p-6 shadow-[0_24px_60px_-50px_rgba(27,29,31,0.75)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-muted)]">
              Interpretation
            </p>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              What to look for
            </h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--ink-muted)]">
              <p>
                Increase shaking frequency to widen the cable tip oscillation.
                Inject noise at 1-5 Hz to emulate the paper&apos;s resilience tests.
              </p>
              <p>
                The SOPAS proxy reflects how quickly the arm changes direction,
                mirroring the angular speed calculation on Stokes trajectories.
              </p>
              <p>
                Capture multiple runs to compare clean vs noisy fingerprints and
                how class boundaries tighten as noise rises.
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-white/70 p-4 text-sm text-[var(--foreground)]">
              <p className="font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)] text-xs">
                Suggested sweep
              </p>
              <p className="mt-2">
                3 Hz shaking -> record 6 s clean -> add 3 Hz noise -> record 6 s ->
                compare overlay.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
