// src/utils/parser.js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processFrontmatter = (text) => {
  // Extract Obsidian YAML frontmatter (--- ... ---)
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  let html = '';
  let remainingText = text;

  if (match) {
    const yaml = match[1];
    remainingText = text.slice(match[0].length);
    
    // Extract title and date
    const titleMatch = yaml.match(/title:\s*"?([^"\n]+)"?/);
    const dateMatch = yaml.match(/date:\s*"?([^"\n]+)"?/);
    
    if (titleMatch) {
      html += `
        <div class="title-page" style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
          <h1 style="font-size: 3rem; margin-bottom: 0.5rem; border: none;">${titleMatch[1]}</h1>
          ${dateMatch ? `<p style="font-size: 1.2rem; color: #666;">${dateMatch[1]}</p>` : ''}
        </div>
        <div style="page-break-after: always;"></div>
      `;
    }
  }
  return { frontmatterHtml: html, markdown: remainingText };
};

export const parseMarkdown = async (mdText) => {
  const { frontmatterHtml, markdown } = processFrontmatter(mdText);
  
  let processed = markdown;
  
  // 1. Process Obsidian Callouts
  processed = processed.replace(
    />\s*\[!(\w+)\]\s*(.*)\n((?:>.*\n)*)/gi,
    (match, type, title, content) => {
      const cleanContent = content.replace(/^>\s?/gm, '');
      return `<div class="callout callout-${type.toLowerCase()}">
                <strong>${title || type.toUpperCase()}</strong>
                <p>${cleanContent}</p>
              </div>\n`;
    }
  );

  // 2. Process Obsidian WikiLinks
  processed = processed.replace(/\[\[(.*?)\]\]/g, (match, linkName) => {
    const parts = linkName.split('|');
    const display = parts.length > 1 ? parts[1] : parts[0];
    return `<span class="wikilink">${display}</span>`;
  });

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(processed);
    
  return frontmatterHtml + String(file);
};