import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const ALLOWED_TAGS = new Set([
  'p',
  'strong',
  'em',
  'u',
  's',
  'span',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'div',
  'img',
]);

const GLOBAL_ALLOWED_ATTRS = new Set(['class', 'style']);

const TAG_SPECIFIC_ATTRS = new Map<string, string[]>([
  ['a', ['href', 'target', 'rel']],
  ['img', ['src', 'alt']],
]);

const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-size',
  'text-align',
]);

const SAFE_TEXT_ALIGN = new Set(['left', 'right', 'center', 'justify']);

@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  /**
   * Inject Angular's {@link DomSanitizer} to re-mark the cleaned markup as safe once it has
   * been normalised below. The heavy lifting is done locally before we delegate back to Angular.
   */
  constructor(private readonly sanitizer: DomSanitizer) {}

  /**
   * Transform Quill (or any rich text) HTML into safe markup that can be injected via
   * `[innerHTML]`. The method strips unsupported tags, filters dangerous attributes and keeps
   * only a small subset of inline styles (color/background/font-size/text-align).
   *
   * @param value HTML string produced by the editor.
   * @returns `SafeHtml` instance ready to bind.
   */
  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    const cleaned = this.cleanHtml(value);
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }

  /**
   * Parse, walk and sanitise the provided markup. The allowlists at the top of the file control
   * which tags, attributes and inline styles are preserved.
   *
   * @param html Raw HTML string to normalise.
   * @returns Cleaned HTML string (safe to feed into Angular's sanitizer).
   */
  private cleanHtml(html: string): string {
    if (typeof DOMParser === 'undefined') {
      return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    const elements = Array.from(body.querySelectorAll('*'));
    for (const element of elements) {
      const tagName = element.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        this.unwrapElement(element);
        continue;
      }

      this.sanitizeAttributes(element, tagName);
    }

    return body.innerHTML;
  }

  /**
   * Keep only the attributes declared in the allowlists and re-write specific ones (e.g. ensure
   * links open in a new tab, drop unknown protocols, prune dangerous event handlers).
   *
   * @param element Current DOM element being processed.
   * @param tagName Lowercase tag name of the element for lookups in specialised allowlists.
   */
  private sanitizeAttributes(element: Element, tagName: string): void {
    const allowedAttrs = new Set(GLOBAL_ALLOWED_ATTRS);
    const specifics = TAG_SPECIFIC_ATTRS.get(tagName);
    if (specifics) {
      specifics.forEach((attr) => allowedAttrs.add(attr));
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();

      if (name.startsWith('on') || name.startsWith('data-ql-')) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (!allowedAttrs.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === 'href' && !this.isSafeUrl(attribute.value)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (tagName === 'img' && name === 'src' && !this.isSafeUrl(attribute.value, true)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === 'target') {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }

      if (name === 'style') {
        const sanitisedStyle = this.sanitiseStyle(attribute.value);
        if (sanitisedStyle) {
          element.setAttribute('style', sanitisedStyle);
        } else {
          element.removeAttribute(attribute.name);
        }
      }
    }
  }

  /**
   * Replace the wrapper node by its children. Used when an element is not in the allowed tag
   * list but we still want to keep its textual/child content.
   *
   * @param element Node to unwrap.
   */
  private unwrapElement(element: Element): void {
    const parent = element.parentNode;
    if (!parent) {
      element.remove();
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    element.remove();
  }

  /**
   * Filter CSS declarations to keep only colour, background, font-size and text-align.
   * Each candidate is validated before being reassembled into a `style` string.
   *
   * @param styleValue Raw `style` attribute value.
   * @returns Sanitised style string or an empty string.
   */
  private sanitiseStyle(styleValue: string): string {
    const declarations = styleValue
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean);

    const kept: string[] = [];

    for (const declaration of declarations) {
      const [propertyRaw, valueRaw] = declaration.split(':');
      if (!propertyRaw || !valueRaw) {
        continue;
      }

      const property = propertyRaw.trim().toLowerCase();
      const value = valueRaw.trim();

      if (!ALLOWED_STYLE_PROPERTIES.has(property)) {
        continue;
      }

      if (property === 'color' || property === 'background-color') {
        if (!this.isSafeColor(value)) {
          continue;
        }
      }

      if (property === 'font-size' && !this.isSafeFontSize(value)) {
        continue;
      }

      if (property === 'text-align' && !SAFE_TEXT_ALIGN.has(value.toLowerCase())) {
        continue;
      }

      kept.push(`${property}: ${value}`);
    }

    return kept.join('; ');
  }

  /**
   * Check the provided colour value (hex, rgb or rgba). Any other format is discarded.
   *
   * @param value CSS colour candidate.
   */
  private isSafeColor(value: string): boolean {
    return /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgb\((\s*\d+\s*,){2}\s*\d+\s*\)|rgba\((\s*\d+\s*,){3}\s*(0|1|0?\.\d+)\s*\))$/i.test(
      value
    );
  }

  /**
   * Accept pixel/em/rem/percentage sizes plus the named sizes emitted by Quill.
   *
   * @param value CSS font-size candidate.
   */
  private isSafeFontSize(value: string): boolean {
    return /^((\d+)(px|rem|em|%)|small|large|medium|x-large|xx-large)$/.test(value);
  }

  /**
   * Validate URLs used in anchors/images. JavaScript URLs are rejected, only http/https/mailto
   * (and `data:image` when explicitly allowed) pass through.
   *
   * @param url Raw attribute value.
   * @param allowDataImages When true, allow `data:image/...` URIs (for Quill embeds).
   */
  private isSafeUrl(url: string, allowDataImages = false): boolean {
    try {
      const trimmed = url.trim();
      if (trimmed.startsWith('javascript:')) {
        return false;
      }

      if (allowDataImages && /^data:image\/([a-z0-9+]+);base64,/i.test(trimmed)) {
        return true;
      }

      const parsed = new URL(trimmed, 'http://local');
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
