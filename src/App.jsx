const generatePDF = async () => {
    if (!fileText) return;
    setIsGenerating(true);

    try {
      const htmlContent = await parseMarkdown(fileText);

      // 1. Create the container and inject it off-screen
      const printContainer = document.createElement('div');
      printContainer.id = 'print-container';
      document.body.appendChild(printContainer);

      // 2. Inject Theme CSS into the main document temporarily
      const style = document.createElement('style');
      style.id = 'print-theme-css';
      style.innerHTML = getThemeCSS();
      document.head.appendChild(style);

      // 3. Create a temporary content div for Paged.js to parse
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = htmlContent;

      // 4. Run Paged.js directly in the main window
      const { Previewer } = window.PagedPolyfill;
      const previewer = new Previewer();
      
      // Wait for Paged.js to calculate layouts and inject into printContainer
      await previewer.preview(contentDiv, [], printContainer);

      // 5. Trigger the native iOS/macOS print dialog
      window.print();

      // 6. Cleanup after the print dialog closes
      // We use a small timeout because window.print() behaves differently across OSs
      setTimeout(() => {
        if (document.getElementById('print-container')) {
          document.body.removeChild(printContainer);
        }
        if (document.getElementById('print-theme-css')) {
          document.head.removeChild(style);
        }
        setIsGenerating(false);
      }, 1500);

    } catch (error) {
      console.error(error);
      setIsGenerating(false);
    }
  };