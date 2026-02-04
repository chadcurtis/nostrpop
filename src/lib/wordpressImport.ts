/**
 * WordPress article import utilities
 * Fetches and parses WordPress articles for publishing to Nostr
 */

export interface WordPressArticle {
  title: string;
  content: string;
  summary: string;
  publishedAt: number;
  image?: string;
  tags: string[];
  sourceUrl: string;
}

/**
 * Extract article metadata and content from WordPress HTML
 */
export async function importWordPressArticle(url: string): Promise<WordPressArticle> {
  try {
    // Fetch the WordPress article
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract metadata from Open Graph tags
    const getMetaContent = (property: string): string | undefined => {
      const meta = doc.querySelector(`meta[property="${property}"]`);
      return meta?.getAttribute('content') || undefined;
    };

    const getMetaName = (name: string): string | undefined => {
      const meta = doc.querySelector(`meta[name="${name}"]`);
      return meta?.getAttribute('content') || undefined;
    };

    // Extract title
    const title = getMetaContent('og:title') || doc.querySelector('title')?.textContent || '';

    // Extract summary/description
    const summary = getMetaContent('og:description') || getMetaName('description') || '';

    // Extract featured image
    const image = getMetaContent('og:image');

    // Extract published date
    const publishedAtString = getMetaContent('article:published_time') || '';
    const publishedAt = publishedAtString ? Math.floor(new Date(publishedAtString).getTime() / 1000) : Math.floor(Date.now() / 1000);

    // Extract tags
    const tagElements = doc.querySelectorAll('meta[property="article:tag"]');
    const tags = Array.from(tagElements).map(el => el.getAttribute('content') || '').filter(Boolean);

    // Extract content from article body
    let content = '';
    
    // Try common WordPress selectors
    const contentSelectors = [
      'article .entry-content',
      '.post-content',
      '.article-content',
      'article',
      '.content',
      'main'
    ];

    for (const selector of contentSelectors) {
      const contentEl = doc.querySelector(selector);
      if (contentEl) {
        // Convert HTML to Markdown-like format
        content = htmlToMarkdown(contentEl as HTMLElement);
        if (content.trim().length > 100) {
          break;
        }
      }
    }

    if (!content) {
      throw new Error('Could not extract article content');
    }

    return {
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim(),
      publishedAt,
      image,
      tags,
      sourceUrl: url
    };
  } catch (error) {
    console.error('Error importing WordPress article:', error);
    throw error;
  }
}

/**
 * Convert HTML to Markdown format
 */
function htmlToMarkdown(element: HTMLElement): string {
  let markdown = '';

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim() || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Skip script, style, and nav elements
    if (['script', 'style', 'nav', 'header', 'footer', 'aside', 'form'].includes(tagName)) {
      return '';
    }

    const children = Array.from(el.childNodes)
      .map(child => processNode(child))
      .filter(Boolean)
      .join('');

    switch (tagName) {
      case 'h1':
        return `\n# ${children}\n\n`;
      case 'h2':
        return `\n## ${children}\n\n`;
      case 'h3':
        return `\n### ${children}\n\n`;
      case 'h4':
        return `\n#### ${children}\n\n`;
      case 'h5':
        return `\n##### ${children}\n\n`;
      case 'h6':
        return `\n###### ${children}\n\n`;
      case 'p':
        return `${children}\n\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'a':
        const href = el.getAttribute('href') || '';
        return `[${children}](${href})`;
      case 'img':
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${src})\n\n`;
      case 'ul':
      case 'ol':
        return `\n${children}\n`;
      case 'li':
        return `- ${children}\n`;
      case 'blockquote':
        return `\n> ${children}\n\n`;
      case 'code':
        return `\`${children}\``;
      case 'pre':
        return `\n\`\`\`\n${children}\n\`\`\`\n\n`;
      default:
        return children;
    }
  }

  markdown = processNode(element);

  // Clean up excessive whitespace
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return markdown;
}

/**
 * Generate a unique identifier for the article based on URL
 */
export function generateArticleId(url: string): string {
  // Extract path from URL and create a slug
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    // Remove leading/trailing slashes and use the path as ID
    return path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'imported-article';
  } catch {
    // Fallback to timestamp-based ID
    return `imported-${Date.now()}`;
  }
}
