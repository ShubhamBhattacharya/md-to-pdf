import React, { useState, useEffect } from 'react';
import { parseMarkdown } from './utils/parser';

// ==========================================
// 1. The iOS-Safe Print Preview Engine
// ==========================================
function PrintPreview({ html, css, onCancel }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    
    // 1. Inject Theme CSS
    const style = document.createElement('style');
    style.id = 'print-theme-css';
    style.innerHTML = css;
    document.head.appendChild(style);

    // 2. Run Paged.js to render the visual pages
    const container = document.getElementById('paged-container');
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;

    const { Previewer } = window.PagedPolyfill;
    const previewer = new Previewer();
    
    previewer.preview(contentDiv, [], container).then(() => {
      if (!isCancelled) setReady(true);
    });

    return () => {
      isCancelled = true;
      document.head.removeChild(style);
      // Clean up injected Paged.js styles when returning to the editor
      document.querySelectorAll('style[data-pagedjs-inserted]').forEach(el => el.remove());
    };
  }, [html, css]);

  return (
    <div className="relative min-h-screen bg-charcoal">
      {/* Container for the visual A4 pages */}
      <div id="paged-container" className="pb-32 overflow-x-auto"></div>
      
      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1A1A1A] border-t border-gray-800 flex gap-4 shadow-2xl no-print z-50">
        <button 
          onClick={onCancel} 
          className="flex-1 py-4 bg-gray-800 rounded-xl text-white font-bold transition-colors hover:bg-gray-700"
        >
          Back to Editor
        </button>
        {/* THIS is the button iOS Safari wants. 100% synchronous direct print command. */}
        <button 
          onClick={() => window.print()} 
          disabled={!ready}
          className="flex-1 py-4 bg-neonGreen rounded-xl text-black font-bold disabled:opacity-50 transition-colors hover:bg-[#3bce6b]"
        >
          {ready ? 'Save as PDF' : 'Rendering Pages...'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 2. The Main Application
// ==========================================
function App() {
  const [file, setFile] = useState(null);
  const [fileText, setFileText] = useState('');
  const [theme, setTheme] = useState('minimalist');
  const [vault, setVault] = useState([]);
  const [printData, setPrintData] = useState(null); 

  useEffect(() => {
    const saved = localStorage.getItem('mdpdf_vault');
    if (saved) setVault(JSON.parse(saved));
  }, []);

  const handleFileChange = async (event) => {
    const selected = event.target.files[0];
    if (selected && selected.name.endsWith('.md')) {
      const text = await selected.text();
      setFile(selected);
      setFileText(text);
      
      const newEntry = { 
        id: Date.now().toString(), 
        name: selected.name, 
        date: new Date().toLocaleDateString(), 
        text 
      };
      const newVault = [newEntry, ...vault.filter(v => v.name !== selected.name)].slice(0, 8);
      setVault(newVault);
      localStorage.setItem('mdpdf_vault', JSON.stringify(newVault));
    } else {
      alert('Please select a valid .md file');
    }
  };

  const loadFromVault = (entry) => {
    setFile({ name: entry.name });
    setFileText(entry.text);
  };

  const deleteFromVault = (e, id) => {
    e.stopPropagation(); // Prevents the click from triggering loadFromVault
    const newVault = vault.filter(v => v.id !== id);
    setVault(newVault);
    localStorage.setItem('mdpdf_vault', JSON.stringify(newVault));
    
    if (file && vault.find(v => v.id === id)?.name === file.name) {
      setFile(null);
      setFileText('');
    }
  };

  const getThemeCSS = () => {
    const baseCSS = `
      @page { size: A4; margin: 20mm; @bottom-right { content: counter(page); font-family: system-ui, sans-serif; font-size: 12px; color: #666; } }
      img { max-width: 100%; page-break-inside: avoid; border-radius: 4px; }
      h1, h2, h3 { page-break-after: avoid; }
      .callout { padding: 15px; border-left: 4px solid #4ade80; background: #f4f4f5; border-radius: 4px; margin: 1em 0; page-break-inside: avoid; }
      .callout strong { display: block; margin-bottom: 5px; color: #111; }
      .wikilink { color: #4ade80; font-weight: 500; text-decoration: none; }
    `;

    if (theme === 'academic') {
      return baseCSS + `
        body { font-family: "Times New Roman", Times, serif; line-height: 2; color: #000; font-size: 12pt; }
        h1, h2, h3 { color: #000; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      `;
    }
    
    return baseCSS + `
      body { font-family: "Inter", system-ui, sans-serif; line-height: 1.6; color: #222; }
      h1, h2, h3 { color: #0E0E0D; margin-top: 1.5em; font-weight: 700; }
      blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #555; font-style: italic; }
    `;
  };

  const initiatePDFGeneration = async () => {
    if (!fileText) return;
    try {
      const htmlContent = await parseMarkdown(fileText);
      setPrintData({ html: htmlContent, css: getThemeCSS() });
    } catch (error) {
      console.error(error);
      alert("Error parsing Markdown");
    }
  };

  // Switch to Preview Mode if data exists
  if (printData) {
    return (
      <PrintPreview 
        html={printData.html} 
        css={printData.css} 
        onCancel={() => setPrintData(null)} 
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-charcoal flex flex-col lg:flex-row items-center justify-center p-6 overflow-hidden gap-8">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-500/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Main Conversion Panel */}
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center lg:text-left">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">MD<span className="text-neonGreen">PDF</span></h1>
          <p className="text-gray-400 font-medium">Zero-cost client-side generation.</p>
        </div>

        <div className="bg-[#121212] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="relative border border-dashed border-gray-700 bg-[#1A1A1A] rounded-xl p-8 text-center hover:border-neonGreen transition-colors duration-300 cursor-pointer group mb-6">
            <input type="file" accept=".md" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className="pointer-events-none relative z-10">
              {file ? (
                <div>
                  <svg className="w-8 h-8 text-neonGreen mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-white font-semibold truncate px-4">{file.name}</p>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 text-gray-500 group-hover:text-neonGreen transition-colors mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <p className="text-gray-400 font-medium group-hover:text-white transition-colors">Tap or drop your .md file</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-medium mb-2">PDF Theme</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTheme('minimalist')} className={`py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${theme === 'minimalist' ? 'bg-neonGreen/10 border-neonGreen text-neonGreen' : 'bg-[#1A1A1A] border-gray-700 text-gray-400 hover:border-gray-500'}`}>Minimalist</button>
              <button onClick={() => setTheme('academic')} className={`py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${theme === 'academic' ? 'bg-neonGreen/10 border-neonGreen text-neonGreen' : 'bg-[#1A1A1A] border-gray-700 text-gray-400 hover:border-gray-500'}`}>Academic</button>
            </div>
          </div>

          <button onClick={initiatePDFGeneration} disabled={!fileText} className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all duration-300 ${!fileText ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-neonGreen text-charcoal hover:bg-[#3bce6b] shadow-[0_0_15px_rgba(74,222,128,0.2)]'}`}>
            Preview & Generate
          </button>
        </div>
      </div>

      {/* Local Vault Sidebar */}
      {vault.length > 0 && (
        <div className="relative z-10 w-full max-w-sm">
          <h3 className="text-white font-bold tracking-wide mb-4">Local Vault</h3>
          <div className="space-y-3">
            {vault.map((entry) => (
              <div key={entry.id} onClick={() => loadFromVault(entry)} className="bg-[#121212] border border-gray-800 p-4 rounded-xl cursor-pointer hover:border-gray-600 transition-colors flex justify-between items-center group">
                <div className="overflow-hidden pr-4">
                  <p className="text-gray-200 font-medium truncate group-hover:text-neonGreen transition-colors">{entry.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{entry.date}</p>
                </div>
                
                <button 
                  onClick={(e) => deleteFromVault(e, entry.id)} 
                  className="text-gray-600 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-gray-800 flex-shrink-0"
                  title="Delete from Vault"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;