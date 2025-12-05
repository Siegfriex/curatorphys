
import React, { useEffect, useState, useRef } from 'react';

// Declare global types for MediaPipe libraries loaded via script tags
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

interface Props {
  onInput: (x: number, isActive: boolean) => void;
  isActive: boolean;
}

const HandController: React.FC<Props> = ({ onInput, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  
  // Use state to trigger re-render when scripts are ready
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const initScripts = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        
        if (mounted) {
          setScriptsLoaded(true);
        }
      } catch (error) {
        console.error("MediaPipe script load failed:", error);
      }
    };

    initScripts();

    return () => {
      mounted = false;
      // Cleanup camera on unmount
      if (cameraRef.current && typeof cameraRef.current.stop === 'function') {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, []);

  // Initialize Hands once scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded || handsRef.current) return;

    if (window.Hands) {
      try {
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        handsRef.current = hands;
      } catch (e) {
        console.error("Failed to create Hands instance:", e);
      }
    }
  }, [scriptsLoaded]);

  // Manage Camera State based on isActive and scriptsLoaded
  useEffect(() => {
    if (!scriptsLoaded || !handsRef.current || !videoRef.current) return;

    if (isActive) {
      // Start Camera
      if (!cameraRef.current && window.Camera) {
        try {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240,
          });
          camera.start();
          cameraRef.current = camera;
        } catch (e) {
          console.error("Failed to start Camera:", e);
        }
      }
    } else {
      // Stop Camera
      if (cameraRef.current) {
        if (typeof cameraRef.current.stop === 'function') {
           cameraRef.current.stop();
        }
        cameraRef.current = null;
      }
    }
  }, [isActive, scriptsLoaded]);

  const onResults = (results: any) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid HUD
    if (isActive) {
        ctx.strokeStyle = 'rgba(40, 49, 124, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); }
        for(let i=0; i<canvas.height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(canvas.width, i); }
        ctx.stroke();
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      // Safety check for landmark index
      if (landmarks[9]) {
        const rawX = 1 - landmarks[9].x; // Mirror & use middle finger MCP
        const normalizedInput = (rawX - 0.5) * 2;
        onInput(normalizedInput, true);

        // Draw Skeleton
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        }
        if (window.drawLandmarks) {
          window.drawLandmarks(ctx, landmarks, { color: '#00FF00', lineWidth: 1, radius: 2 });
        }
        
        // Cursor
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(rawX * canvas.width, landmarks[9].y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      onInput(0, false);
      if (isActive) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.font = '10px monospace';
        ctx.fillText("SEARCHING SIGNAL...", 10, 20);
      }
    }
    ctx.restore();
  };

  if (!isActive) return null;

  return (
    <div style={{ 
      position: 'absolute', bottom: 20, right: 20, zIndex: 100, 
      border: '1px solid rgba(59, 130, 246, 0.3)',
      background: 'rgba(2, 4, 9, 0.8)',
      backdropFilter: 'blur(4px)',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)'
    }}>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef} width={320} height={240} style={{ width: '160px', height: '120px', display: 'block' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '4px', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <span style={{ color: '#00FF00', fontSize: '8px', fontFamily: 'monospace' }}>HAND_TRACKING</span>
        <span style={{ color: '#3B82F6', fontSize: '8px', fontFamily: 'monospace' }}>[ACTIVE]</span>
      </div>
    </div>
  );
};

export default HandController;
