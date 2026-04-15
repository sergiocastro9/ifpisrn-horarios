import lunr from '@generated/lunr.client';

lunr.tokenizer.separator = /[\s\-/_.()]+/;

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeToken(token) {
  return token.update((str) => normalizeText(str));
}

lunr.Pipeline.registerFunction(normalizeToken, 'normalizeToken');

function getCategoryFromUrl(url) {
  const u = String(url || '');
  if (u.includes('/docs/professor/')) return 'Professores';
  if (u.includes('/docs/turma/')) return 'Turmas';
  if (u.includes('/docs/sala/')) return 'Salas';
  if (u.includes('/docs/disciplina/')) return 'Disciplinas';
  if (u.includes('/docs/intro')) return 'Home';
  return 'Outros';
}

class SearchAdapter {
  constructor(searchDocs, _searchIndex, baseUrl = '/', maxHits = 8) {
    this.searchDocs = searchDocs;
    this.baseUrl = baseUrl;
    this.maxHits = maxHits;
    this.lunrIndex = this.buildIndex(searchDocs);
  }

  buildIndex(searchDocs) {
    return lunr(function () {
      this.ref('id');
      this.field('title', { boost: 200 });
      this.field('content', { boost: 2 });
      this.field('keywords', { boost: 100 });
      this.metadataWhitelist = ['position'];

      // Reset to avoid stopwords/stemming (important for names and numbers).
      this.pipeline.reset();
      this.searchPipeline.reset();
      this.pipeline.add(lunr.trimmer, normalizeToken);
      this.searchPipeline.add(lunr.trimmer, normalizeToken);

      for (let i = 0; i < searchDocs.length; i++) {
        const d = searchDocs[i];
        this.add({
          id: i,
          title: d.title || '',
          content: d.content || '',
          keywords: d.keywords || '',
        });
      }
    });
  }

  getResult(input) {
    const normalizedInput = normalizeText(input);
    return this.lunrIndex.query(function (query) {
      const tokens = lunr.tokenizer(normalizedInput);
      query.term(tokens, { boost: 10 });
      query.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
    });
  }

  getHit(doc, formattedTitle, formattedContent) {
    const category = getCategoryFromUrl(doc.url);
    const pageTitle = doc.pageTitle || doc.title;

    return {
      hierarchy: {
        lvl0: category,
        lvl1: doc.type === 0 ? null : pageTitle,
        // lvl2 is rendered as title in the template; keep it as the doc title
        // so users can see the exact page (e.g., "Sala 14", "Prática Profissional").
        lvl2: doc.type === 0 ? doc.title : doc.title,
      },
      url: doc.url,
      version: doc.version,
      _snippetResult: formattedContent
        ? {
            content: {
              value: formattedContent,
              matchLevel: 'full',
            },
          }
        : null,
      _highlightResult: {
        hierarchy: {
          lvl0: { value: category },
          lvl1: doc.type === 0 ? null : { value: pageTitle },
          lvl2: {
            value: formattedTitle || doc.title,
          },
        },
      },
    };
  }

  getTitleHit(doc, position, length) {
    const start = position[0];
    const end = position[0] + length;
    const formattedTitle =
      doc.title.substring(0, start) +
      '<span class="algolia-docsearch-suggestion--highlight">' +
      doc.title.substring(start, end) +
      '</span>' +
      doc.title.substring(end);
    return this.getHit(doc, formattedTitle);
  }

  getKeywordHit(doc, position, length) {
    const start = position[0];
    const end = position[0] + length;
    const formattedTitle =
      doc.title +
      '<br /><i>Keywords: ' +
      doc.keywords.substring(0, start) +
      '<span class="algolia-docsearch-suggestion--highlight">' +
      doc.keywords.substring(start, end) +
      '</span>' +
      doc.keywords.substring(end) +
      '</i>';
    return this.getHit(doc, formattedTitle);
  }

  getContentHit(doc, position) {
    const start = position[0];
    const end = position[0] + position[1];
    let previewStart = start;
    let previewEnd = end;
    let ellipsesBefore = true;
    let ellipsesAfter = true;
    for (let k = 0; k < 3; k++) {
      const nextSpace = doc.content.lastIndexOf(' ', previewStart - 2);
      const nextDot = doc.content.lastIndexOf('.', previewStart - 2);
      if (nextDot > 0 && nextDot > nextSpace) {
        previewStart = nextDot + 1;
        ellipsesBefore = false;
        break;
      }
      if (nextSpace < 0) {
        previewStart = 0;
        ellipsesBefore = false;
        break;
      }
      previewStart = nextSpace + 1;
    }
    for (let k = 0; k < 10; k++) {
      const nextSpace = doc.content.indexOf(' ', previewEnd + 1);
      const nextDot = doc.content.indexOf('.', previewEnd + 1);
      if (nextDot > 0 && nextDot < nextSpace) {
        previewEnd = nextDot;
        ellipsesAfter = false;
        break;
      }
      if (nextSpace < 0) {
        previewEnd = doc.content.length;
        ellipsesAfter = false;
        break;
      }
      previewEnd = nextSpace;
    }
    let preview = doc.content.substring(previewStart, start);
    if (ellipsesBefore) preview = `... ${preview}`;
    preview +=
      '<span class="algolia-docsearch-suggestion--highlight">' +
      doc.content.substring(start, end) +
      '</span>';
    preview += doc.content.substring(end, previewEnd);
    if (ellipsesAfter) preview += ' ...';
    return this.getHit(doc, null, preview);
  }

  search(input) {
    return new Promise((resolve) => {
      const results = this.getResult(input);
      const hits = [];
      if (results.length > this.maxHits) results.length = this.maxHits;
      const titleHitsRes = [];
      results.forEach((result) => {
        const doc = this.searchDocs[result.ref];
        const { metadata } = result.matchData;
        for (const term in metadata) {
          if (metadata[term].title) {
            if (!titleHitsRes.includes(result.ref)) {
              const position = metadata[term].title.position[0];
              hits.push(this.getTitleHit(doc, position, input.length));
              titleHitsRes.push(result.ref);
            }
          } else if (metadata[term].content) {
            const position = metadata[term].content.position[0];
            hits.push(this.getContentHit(doc, position));
          } else if (metadata[term].keywords) {
            const position = metadata[term].keywords.position[0];
            hits.push(this.getKeywordHit(doc, position, input.length));
            titleHitsRes.push(result.ref);
          }
        }
      });
      if (hits.length > this.maxHits) hits.length = this.maxHits;
      resolve(hits);
    });
  }
}

export default SearchAdapter;

