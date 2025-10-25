import axios from 'axios';
import cheerio from 'cheerio';

type CacheItem = { quote: string; ts: number };
const cache = new Map<string, CacheItem>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function keyFor(title: string, year?: string | number) {
  const norm = title.trim().toLowerCase();
  return `${norm}::${year ?? ''}`;
}

function isFresh(item: CacheItem) {
  return Date.now() - item.ts < TTL_MS;
}

function cleanText(t: string): string {
  return t
    .replace(/\[[^\]]*\]/g, '') // remove citations like [1]
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

export async function fetchMovieQuote(title: string, year?: string | number): Promise<string | null> {
  const cacheKey = keyFor(title, year);
  const hit = cache.get(cacheKey);
  if (hit && isFresh(hit)) return hit.quote;

  try {
    // 1) Search Wikiquote for the movie page
    const searchQuery = `${title} ${year || ''} film`.trim();
    const search = await axios.get('https://en.wikiquote.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: searchQuery,
        format: 'json',
        srlimit: 5,
        origin: '*'
      },
      timeout: 8000
    });

    const results: any[] = search.data?.query?.search || [];
    if (!results.length) return null;

    // Prefer titles that look like films
    const pick = results.find(r => /\(film\)|film/i.test(r.title)) || results[0];
    const pageTitle = pick.title;

    // 2) Find the "Quotes" section index
    const sectionsResp = await axios.get('https://en.wikiquote.org/w/api.php', {
      params: { action: 'parse', page: pageTitle, prop: 'sections', format: 'json', origin: '*' },
      timeout: 8000
    });
    const sections: any[] = sectionsResp.data?.parse?.sections || [];
    const quotesSection = sections.find(s => /quotes?/i.test(s.line));
    const sectionIndex = quotesSection?.index;

    // 3) Fetch HTML for that section
    const htmlResp = await axios.get('https://en.wikiquote.org/w/api.php', {
      params: { action: 'parse', page: pageTitle, prop: 'text', format: 'json', origin: '*', ...(sectionIndex ? { section: sectionIndex } : {}) },
      timeout: 8000
    });
    const html = htmlResp.data?.parse?.text?.['*'] || '';
    if (!html) return null;

    // 4) Parse and pick a short spoken line (li under quotes section)
    const $ = cheerio.load(html);
    const candidates: string[] = [];
    $('ul > li').each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 12 && text.length <= 180) {
        candidates.push(text);
      }
    });

    const quote = candidates[0] || null;
    if (quote) {
      cache.set(cacheKey, { quote, ts: Date.now() });
    }
    return quote;
  } catch (e) {
    return null;
  }
}

