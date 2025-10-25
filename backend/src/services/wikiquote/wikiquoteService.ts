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

function extractCandidatesFromHtml(html: string): string[] {
  const $ = cheerio.load(html);
  const out: string[] = [];

  // Prefer items in a Quotes section
  const headings = $('h2, h3');
  headings.each((_, h) => {
    const txt = cleanText($(h).text());
    if (/^quotes?\b/i.test(txt)) {
      // collect list items until next heading
      let el = $(h).next();
      while (el.length && !['H2', 'H3'].includes(el[0].tagName.toUpperCase())) {
        if (el.is('ul, ol')) {
          el.find('li').each((_, li) => {
            const t = cleanText($(li).text());
            if (t.length >= 12 && t.length <= 180) out.push(t);
          });
        }
        el = el.next();
      }
    }
  });

  // Fallback: any list items on the page
  if (out.length === 0) {
    $('ul > li').each((_, li) => {
      const t = cleanText($(li).text());
      if (t.length >= 12 && t.length <= 180) out.push(t);
    });
  }
  return out;
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

    // Build candidate titles: prefer entries that look like film pages, try several
    const byFilm = results.filter(r => /(\(\d{4}\)\s*film|\(film\))/i.test(r.title));
    const others = results.filter(r => !byFilm.includes(r));
    const titleVariants = [
      ...byFilm.map(r => r.title),
      `${title} (${year} film)`,
      `${title} (film)`,
      title,
      ...others.map(r => r.title)
    ].filter((v, i, arr) => !!v && arr.indexOf(v) === i);

    for (const pageTitle of titleVariants) {
      try {
        // Try to get Quotes section index
        const sectionsResp = await axios.get('https://en.wikiquote.org/w/api.php', {
          params: { action: 'parse', page: pageTitle, prop: 'sections', format: 'json', origin: '*' },
          timeout: 8000
        });
        const sections: any[] = sectionsResp.data?.parse?.sections || [];
        const quotesSection = sections.find(s => /quotes?/i.test(s.line));
        const sectionIndex = quotesSection?.index;

        // Fetch HTML for that section (or whole page if section missing)
        const htmlResp = await axios.get('https://en.wikiquote.org/w/api.php', {
          params: { action: 'parse', page: pageTitle, prop: 'text', format: 'json', origin: '*', ...(sectionIndex ? { section: sectionIndex } : {}) },
          timeout: 8000
        });
        const html = htmlResp.data?.parse?.text?.['*'] || '';
        if (!html) continue;

        const candidates = extractCandidatesFromHtml(html);
        if (candidates.length) {
          // Pick a random candidate for variety
          const quote = candidates[Math.floor(Math.random() * candidates.length)];
          cache.set(cacheKey, { quote, ts: Date.now() });
          return quote;
        }
      } catch {
        // try next variant
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}
