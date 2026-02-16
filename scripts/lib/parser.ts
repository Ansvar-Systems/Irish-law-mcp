/**
 * eISB XML parser for Irish legislation.
 *
 * The Irish Statute Book uses a custom DTD (NOT Akoma Ntoso).
 * Key elements: <sect>, <part>, <chapter>, <number>, <title>, <p>
 *
 * Structure:
 *   <act>
 *     <part id="PART{N}">
 *       <chapter id="CHAP{N}">
 *         <sect id="SEC{N}">
 *           <number>{N}</number>
 *           <title>...</title>
 *           <subsect>
 *             <p>...</p>
 *           </subsect>
 *         </sect>
 *       </chapter>
 *     </part>
 *   </act>
 */

import { XMLParser } from 'fast-xml-parser';

export interface ParsedProvision {
  provision_ref: string;
  section: string;
  title?: string;
  content: string;
  part?: string;
  chapter?: string;
}

export interface ParsedAct {
  title?: string;
  provisions: ParsedProvision[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  isArray: (name) => {
    // These elements can appear multiple times
    return ['sect', 'part', 'chapter', 'subsect', 'p', 'para', 'subpara', 'item'].includes(name);
  },
});

/**
 * Extract text content from a node, recursively collecting all text.
 */
function extractText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);

  if (Array.isArray(node)) {
    return node.map(extractText).filter(Boolean).join(' ');
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const parts: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      // Skip attributes
      if (key.startsWith('@_')) continue;
      parts.push(extractText(value));
    }

    return parts.filter(Boolean).join(' ');
  }

  return '';
}

/**
 * Normalize whitespace in extracted text.
 */
function normalize(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s([.,;:)])/g, '$1')
    .replace(/\(\s/g, '(')
    .trim();
}

/**
 * Extract provisions from a section element.
 */
function parseSect(sect: Record<string, unknown>, partLabel?: string, chapterLabel?: string): ParsedProvision | null {
  // Get section number
  const sectionNum = extractText(sect['number'] ?? sect['@_id'] ?? '').replace(/^SEC/, '').replace(/\.$/, '');
  if (!sectionNum) return null;

  // Get section title
  const title = normalize(extractText(sect['title'] ?? ''));

  // Collect all body text from subsections, paragraphs, etc.
  const textParts: string[] = [];

  // Direct <p> children
  if (sect['p']) {
    textParts.push(extractText(sect['p']));
  }

  // <subsect> children
  if (sect['subsect']) {
    const subsects = Array.isArray(sect['subsect']) ? sect['subsect'] : [sect['subsect']];
    for (const sub of subsects) {
      if (sub && typeof sub === 'object') {
        textParts.push(extractText(sub));
      } else {
        textParts.push(extractText(sub));
      }
    }
  }

  // <para> children (some acts use this instead of subsect)
  if (sect['para']) {
    textParts.push(extractText(sect['para']));
  }

  // <proviso> children
  if (sect['proviso']) {
    textParts.push(extractText(sect['proviso']));
  }

  // Direct #text
  if (sect['#text']) {
    textParts.push(extractText(sect['#text']));
  }

  const content = normalize(textParts.join(' '));
  if (!content && !title) return null;

  return {
    provision_ref: `s${sectionNum}`,
    section: sectionNum,
    title: title || undefined,
    content: content || title || '',
    part: partLabel || undefined,
    chapter: chapterLabel || undefined,
  };
}

/**
 * Extract sections from a container (part, chapter, or act body).
 */
function extractSections(
  container: Record<string, unknown>,
  partLabel?: string,
  chapterLabel?: string,
): ParsedProvision[] {
  const provisions: ParsedProvision[] = [];

  // Direct <sect> children
  if (container['sect']) {
    const sects = Array.isArray(container['sect']) ? container['sect'] : [container['sect']];
    for (const sect of sects) {
      if (sect && typeof sect === 'object') {
        const prov = parseSect(sect as Record<string, unknown>, partLabel, chapterLabel);
        if (prov) provisions.push(prov);
      }
    }
  }

  return provisions;
}

/**
 * Parse eISB XML into structured provisions.
 */
export function parseEISBXml(xml: string): ParsedAct {
  const parsed = parser.parse(xml);
  const provisions: ParsedProvision[] = [];

  // Navigate to the act body — various possible root structures
  const act = parsed?.act ?? parsed?.ACT ?? parsed?.['ISB:act'] ?? parsed;
  if (!act || typeof act !== 'object') {
    return { provisions: [] };
  }

  const actObj = act as Record<string, unknown>;

  // Get act title
  const actTitle = normalize(extractText(actObj['title'] ?? actObj['longtitle'] ?? ''));

  // Process <part> containers
  if (actObj['part']) {
    const parts = Array.isArray(actObj['part']) ? actObj['part'] : [actObj['part']];
    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const partObj = part as Record<string, unknown>;
      const partLabel = normalize(extractText(partObj['title'] ?? partObj['number'] ?? ''));

      // Parts may contain chapters
      if (partObj['chapter']) {
        const chapters = Array.isArray(partObj['chapter']) ? partObj['chapter'] : [partObj['chapter']];
        for (const chapter of chapters) {
          if (!chapter || typeof chapter !== 'object') continue;
          const chapObj = chapter as Record<string, unknown>;
          const chapLabel = normalize(extractText(chapObj['title'] ?? chapObj['number'] ?? ''));

          provisions.push(...extractSections(chapObj, partLabel, chapLabel));
        }
      }

      // Parts may also contain direct sections
      provisions.push(...extractSections(partObj, partLabel));
    }
  }

  // Process <chapter> containers at act level
  if (actObj['chapter']) {
    const chapters = Array.isArray(actObj['chapter']) ? actObj['chapter'] : [actObj['chapter']];
    for (const chapter of chapters) {
      if (!chapter || typeof chapter !== 'object') continue;
      const chapObj = chapter as Record<string, unknown>;
      const chapLabel = normalize(extractText(chapObj['title'] ?? chapObj['number'] ?? ''));

      provisions.push(...extractSections(chapObj, undefined, chapLabel));
    }
  }

  // Process <sect> directly in act body (no parts/chapters)
  provisions.push(...extractSections(actObj));

  // Process <body> wrapper if present
  if (actObj['body'] && typeof actObj['body'] === 'object') {
    const body = actObj['body'] as Record<string, unknown>;

    if (body['part']) {
      const parts = Array.isArray(body['part']) ? body['part'] : [body['part']];
      for (const part of parts) {
        if (!part || typeof part !== 'object') continue;
        const partObj = part as Record<string, unknown>;
        const partLabel = normalize(extractText(partObj['title'] ?? partObj['number'] ?? ''));

        if (partObj['chapter']) {
          const chapters = Array.isArray(partObj['chapter']) ? partObj['chapter'] : [partObj['chapter']];
          for (const chapter of chapters) {
            if (!chapter || typeof chapter !== 'object') continue;
            const chapObj = chapter as Record<string, unknown>;
            const chapLabel = normalize(extractText(chapObj['title'] ?? chapObj['number'] ?? ''));
            provisions.push(...extractSections(chapObj, partLabel, chapLabel));
          }
        }

        provisions.push(...extractSections(partObj, partLabel));
      }
    }

    provisions.push(...extractSections(body));
  }

  return {
    title: actTitle || undefined,
    provisions,
  };
}
