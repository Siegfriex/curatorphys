
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import HandController from './HandController';

// --- DESIGN SYSTEM TOKENS (Curator's Odysseia v4.0 - The Architect) ---
const DS = {
  colors: {
    primary: '#28317C',   // Deep Royal Blue (Institution)
    secondary: '#3B82F6', // Azure Blue (Network)
    void: '#020409',      // Abyssal Ink
    surface: '#ffffff',   // Paper White
    neutral: '#e5e5e5',   // Mist Gray (Academic)
    accent: '#FF3333',    // Fate/Crisis
  },
  fonts: {
    serif: "'Playfair Display', serif",
    sans: "'Inter', sans-serif"
  }
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: DS.colors.void,
    color: '#fff',
    overflow: 'hidden',
  },
  
  // -- Editorial Header --
  header: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px',
    height: '72px',
    background: 'rgba(2, 4, 9, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid rgba(255, 255, 255, 0.08)`,
    zIndex: 20,
  },
  brandGroup: { display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  brandTitle: {
    fontFamily: DS.fonts.serif,
    fontStyle: 'italic',
    fontSize: '22px',
    color: '#fff',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontFamily: DS.fonts.sans,
    fontSize: '9px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.25em',
    color: DS.colors.secondary,
    fontWeight: 700,
  },
  
  controls: { display: 'flex', gap: '24px' },
  
  // -- Micro Button --
  btn: (active: boolean = false) => ({
    background: active ? DS.colors.primary : 'transparent',
    border: `1px solid ${active ? DS.colors.primary : 'rgba(255,255,255,0.15)'}`,
    color: active ? '#fff' : '#888',
    padding: '0 20px',
    height: '32px',
    fontFamily: DS.fonts.sans,
    fontSize: '10px',
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  }),

  // -- Game Frame --
  gameWrapper: {
    flex: 1,
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    background: '#000',
  },
  iframe: { width: '100%', height: '100%', border: 'none', display: 'block' },

  // -- Accession Record (Modal) --
  modalOverlay: {
    position: 'absolute' as const,
    top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    width: '500px',
    background: '#0a0a0f',
    border: `1px solid rgba(255,255,255,0.1)`,
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
    position: 'relative' as const,
  },
  cardHeader: {
    height: '4px',
    width: '100%',
    background: `linear-gradient(90deg, ${DS.colors.primary}, ${DS.colors.secondary})`,
  },
  cardContent: { padding: '48px 40px' },
  
  // Typography
  label: {
    display: 'block',
    fontFamily: DS.fonts.sans,
    fontSize: '9px',
    color: DS.colors.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2em',
    fontWeight: 700,
    marginBottom: '16px',
  },
  heading: {
    fontFamily: DS.fonts.serif,
    fontSize: '42px',
    fontStyle: 'italic',
    color: '#fff',
    margin: '0 0 24px 0',
    lineHeight: 1,
  },
  text: {
    fontFamily: DS.fonts.sans,
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#aaa',
    marginBottom: '32px',
  },
  
  // Actions
  actionBtn: {
    width: '100%',
    padding: '16px',
    background: '#fff',
    color: '#000',
    border: 'none',
    fontFamily: DS.fonts.sans,
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2em',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  
  // Loading
  loading: {
    position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%',
    background: DS.colors.void,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
  },
  spinner: {
    width: '40px', height: '40px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderTopColor: DS.colors.secondary,
    borderRadius: '50%',
    animation: 'spin 1s infinite linear',
    marginBottom: '16px',
  },
};

// --- PROMPT ENGINEERING (TSD-3.2) ---
const PROMPT_BASE = `
**ROLE:** Creative Technologist.
**TASK:** Update the Three.js game code contained in a SINGLE HTML file.
**CONTEXT:** "Curator's Odysseia v4.0 - The Architect".

**STRICT DESIGN PILLARS (DO NOT BREAK):**
1.  **THEME:** "Editorial Brutalism" meets "Abyssal Ink".
    *   Background: Void Black (#020409). Sky: God Rays + Particles.
    *   Water: Inky, dark, high transmission. NOT blue plastic.
2.  **ASSETS:**
    *   **Player:** "Concrete Voxel Ship". Gray noise texture, emissive wireframe.
    *   **Wake:** "Life-Log Ribbon" (Sketchy blueprint line trailing the ship).
    *   **CRITICAL:** Do NOT use external image URLs. Use **Procedural CanvasTextures** for ALL textures (Map, Concrete, Text) to prevent CORS/Loading errors.
3.  **PHYSICS:**
    *   **Buoyancy:** Ship Y must float on calculated waves.
    *   **Drag:** Ship slows down when hitting heavy items (Tier 1).
4.  **LOGIC:**
    *   Eras: 20s -> 40s -> 60s -> End.
    *   Gates: Time Dilation (Slow mo) on approach.

**OUTPUT:** Return ONLY the valid HTML code.
`;

const PROMPTS = {
  gemini2p5: PROMPT_BASE + `\n(Optimize for Mobile: Simplified Shaders, No Post-Processing)`,
  gemini3: PROMPT_BASE + `\n(High Fidelity: Physical Materials, Bloom, Dynamic Shadows, Film Grain)`
};

// --- AI REPORT GENERATOR ---
const generateAnalysisPrompt = (data: any) => `
**ROLE:** Elite Art Historian & Chief Curator.
**TASK:** Generate a definitive "Curatorial Record" for a virtual artist based on their career data.

**INPUT DATA (The Artist's Journey):**
1. **The Metrics (0-100):**
   - Institutional Authority: ${data.metrics.inst} (Did they succeed in the museum world?)
   - Network Velocity: ${data.metrics.net} (Did they dominate the market?)
   - Academic Depth: ${data.metrics.acad} (Did they contribute theory?)
   - Historical Weight: ${data.metrics.hist} (Will they be remembered?)
   - Discourse/Scandal: ${data.metrics.disc} (Were they controversial?)

2. **The Timeline (Critical Choices):**
   - Age 20s (Origin): ${data.timeline[0]?.event || 'Unknown'}
   - Age 40s (Pivot): ${data.timeline[1]?.event || 'Unknown'}
   - Age 60s (Legacy): ${data.timeline[2]?.event || 'Unknown'}

3. **The Work (Artifacts Collected):**
   - Masterpieces (Tier 1): ${data.artifacts?.t1 || 0}
   - Commercial Works (Tier 2): ${data.artifacts?.t2 || 0}
   - Sketches (Tier 3): ${data.artifacts?.t3 || 0}

**INSTRUCTIONS:**
1.  **Archetype Match:** Analyze the combination of 'Fate' (Timeline) and 'Effort' (Metrics). Choose ONE specific archetype title.
    *   *Examples: "The Enigmatic Recluse", "The Market Darling", "The Radical Iconoclast", "The Institutional Pillar", "The Tragic Genius".*
2.  **Real-World Parallel:** Identify a real artist who had a similar trajectory.
    *   *Examples: Basquiat (Fast rise, tragic end), Duchamp (Intellectual, institutional critique), Jeff Koons (Market dominance).*
3.  **Narrative Synthesis:** Write a 3-sentence editorial critique.
    *   *Sentence 1:* Summarize their origin and early struggles/successes based on the 20s event.
    *   *Sentence 2:* Analyze their mid-career pivot and production style (heavy on Masterpieces vs. Commercial work).
    *   *Sentence 3:* Conclude with their final legacy status based on the 60s event and final Historical score.

**TONE:** Cold, sophisticated, academic, and slightly brutal. "Editorial Brutalism".

**OUTPUT FORMAT:** Return ONLY valid JSON.
{
  "archetype": "STRING (e.g. THE MARKET DARLING)",
  "match": "STRING (e.g. Jeff Koons)",
  "narrative": "STRING (The 3-sentence critique)"
}
`;

function App() {
  const [activeModel, setActiveModel] = useState('gemini3'); 
  const [showRemix, setShowRemix] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [gameHtml, setGameHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initial Load
  useEffect(() => {
    loadGame(activeModel);
  }, [activeModel]);

  // Pause Logic & Handshake
  const syncGameState = useCallback(() => {
    // Send PAUSE command based on modal/remix state
    const isPaused = showModal || showRemix;
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PAUSE_GAME', payload: isPaused }, '*');
    }
  }, [showModal, showRemix]);

  useEffect(() => {
    // Sync state whenever modal/remix changes, but only if iframe is ready.
    const t = setTimeout(syncGameState, 100);
    return () => clearTimeout(t);
  }, [syncGameState]);

  // --- GAME EVENT LISTENER (Report Generation) ---
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'GAME_OVER') {
        const gameData = event.data.payload;
        // console.log("Generating Report for:", gameData);
        
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = generateAnalysisPrompt(gameData);
          
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use Flash for fast text generation
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
          });
          
          const report = JSON.parse(response.text);
          
          // Send report back to iframe
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'REPORT_GENERATED', payload: report }, '*');
          }
        } catch (e) {
          console.error("Report Generation Failed:", e);
          // Fallback if AI fails
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ 
              type: 'REPORT_GENERATED', 
              payload: { 
                archetype: "DATA FRAGMENTED", 
                match: "Unknown Entity", 
                narrative: "The artist's trajectory was too volatile to record. The signal was lost in the void, leaving only scattered metadata." 
              } 
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadGame = async (model: string) => {
    setIsLoading(true);
    setGameHtml(null);
    try {
        const url = model === 'gemini3' ? './init/gemini3.html' : './init/gemini2p5.html';
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch game file");
        let html = await res.text();
        
        if (!html.includes('<base')) {
            html = html.replace('<head>', '<head><base href="./init/">');
        }
        setGameHtml(html);
    } catch (e) {
        console.error("Game Load Error:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRemix = async (instruction: string) => {
    setShowRemix(false);
    setIsLoading(true);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const modelId = activeModel === 'gemini3' ? 'gemini-3-pro-preview' : 'gemini-2.5-pro';
        
        const response = await ai.models.generateContent({
            model: modelId,
            config: { systemInstruction: PROMPTS[activeModel as keyof typeof PROMPTS] },
            contents: [
                { role: 'user', parts: [{ text: `Current Code:\n${gameHtml}\n\nUser Request: ${instruction}` }] }
            ]
        });

        let newCode = response.text;
        newCode = newCode.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
        if (!newCode.includes('<base')) newCode = newCode.replace('<head>', '<head><base href="./init/">');
        
        setGameHtml(newCode);
    } catch (e) {
        alert("Remix Failed. Try again.");
    } finally {
        setIsLoading(false);
    }
  };
  
  // Hand Controller Callback
  const handleHandInput = useCallback((x: number, isActive: boolean) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'INPUT_UPDATE', payload: { x, isActive } }, '*');
    }
  }, []);

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        body { margin: 0; background: #000; }
      `}</style>

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <h1 style={styles.brandTitle}>Curator's Odysseia</h1>
          <span style={styles.brandSubtitle}>Architect v4.0 // {activeModel === 'gemini3' ? 'PRO_ENGINE' : 'LITE_ENGINE'}</span>
        </div>
        <div style={styles.controls}>
          <button style={styles.btn(activeModel === 'gemini2p5')} onClick={() => setActiveModel('gemini2p5')}>Lite</button>
          <button style={styles.btn(activeModel === 'gemini3')} onClick={() => setActiveModel('gemini3')}>Pro</button>
          <button style={{...styles.btn(showRemix), borderColor: DS.colors.secondary, color: DS.colors.secondary}} onClick={() => setShowRemix(true)}>REMIX</button>
        </div>
      </header>

      {/* GAME VIEW */}
      <main style={styles.gameWrapper}>
        {isLoading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span style={{...styles.brandSubtitle, color:'#fff'}}>BUILDING ARCHITECTURE...</span>
          </div>
        )}
        {!isLoading && gameHtml && (
          <iframe 
            ref={iframeRef}
            srcDoc={gameHtml}
            style={styles.iframe}
            sandbox="allow-scripts allow-pointer-lock allow-same-origin allow-forms"
            onLoad={syncGameState} 
          />
        )}
      </main>
      
      {/* HAND CONTROLLER HUD */}
      <HandController 
        onInput={handleHandInput} 
        isActive={!isLoading && !showModal && !showRemix} 
      />

      {/* MODAL: INTRO */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.card}>
            <div style={styles.cardHeader}></div>
            <div style={styles.cardContent}>
              <span style={styles.label}>Accession Record #004</span>
              <h2 style={styles.heading}>The Architect</h2>
              <p style={styles.text}>
                Navigate the <strong>Abyssal Void</strong>. Your ship embodies your career.<br/><br/>
                <strong>Eras:</strong> 20s - 40s - 60s<br/>
                <strong>Manual Override:</strong> Lift your hand to steer.<br/>
                <strong>Warning:</strong> The ocean is deep, and the physics are heavy.
              </p>
              <button 
                style={styles.actionBtn}
                onClick={() => setShowModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#e0e0e0'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                INITIALIZE SEQUENCE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REMIX */}
      {showRemix && (
        <div style={styles.modalOverlay} onClick={() => setShowRemix(false)}>
           <div style={styles.card} onClick={e => e.stopPropagation()}>
            <div style={styles.cardHeader}></div>
            <div style={styles.cardContent}>
                <span style={styles.label}>Runtime Injection</span>
                <h2 style={styles.heading}>Modify Reality</h2>
                <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                    {['Add Stormy Weather', 'Increase Game Speed', 'Glitch Effect Mode', 'Neon Cyberpunk Palette'].map(opt => (
                        <button 
                            key={opt}
                            style={{...styles.actionBtn, background:'transparent', border:'1px solid #333', color:'#fff', textAlign:'left'}}
                            onClick={() => handleRemix(opt)}
                            onMouseEnter={e => {e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#000';}}
                            onMouseLeave={e => {e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#fff';}}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root') || document.body);
root.render(<App />);
