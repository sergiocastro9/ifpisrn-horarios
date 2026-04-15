import Hogan from 'hogan.js';
import SearchAdapter from './lunar-search';
import autocomplete from 'autocomplete.js';
import templates from './templates';
import utils from './utils';
import $ from 'autocomplete.js/zepto';

class DocSearch {
  constructor({
    searchDocs,
    searchIndex,
    inputSelector,
    debug = false,
    baseUrl = '/',
    queryDataCallback = null,
    autocompleteOptions = {
      debug: false,
      hint: false,
      autoselect: true,
    },
    transformData = false,
    queryHook = false,
    handleSelected = false,
    enhancedSearchInput = false,
    layout = 'column',
    maxHits = 8,
  }) {
    this.input = DocSearch.getInputFromSelector(inputSelector);
    this.queryDataCallback = queryDataCallback || null;
    const autocompleteOptionsDebug =
      autocompleteOptions && autocompleteOptions.debug
        ? autocompleteOptions.debug
        : false;
    autocompleteOptions.debug = debug || autocompleteOptionsDebug;
    this.autocompleteOptions = autocompleteOptions;
    this.autocompleteOptions.cssClasses = this.autocompleteOptions.cssClasses || {};
    this.autocompleteOptions.cssClasses.prefix =
      this.autocompleteOptions.cssClasses.prefix || 'ds';
    const inputAriaLabel =
      this.input &&
      typeof this.input.attr === 'function' &&
      this.input.attr('aria-label');
    this.autocompleteOptions.ariaLabel =
      this.autocompleteOptions.ariaLabel || inputAriaLabel || 'search input';

    this.isSimpleLayout = layout === 'simple';

    this.client = new SearchAdapter(searchDocs, searchIndex, baseUrl, maxHits);

    if (enhancedSearchInput) {
      this.input = DocSearch.injectSearchBox(this.input);
    }
    this.autocomplete = autocomplete(this.input, autocompleteOptions, [
      {
        source: this.getAutocompleteSource(transformData, queryHook),
        templates: {
          suggestion: DocSearch.getSuggestionTemplate(this.isSimpleLayout),
          footer: templates.footer,
          empty: DocSearch.getEmptyTemplate(),
        },
      },
    ]);

    const customHandleSelected = handleSelected;
    this.handleSelected = customHandleSelected || this.handleSelected;

    if (customHandleSelected) {
      $('.algolia-autocomplete').on('click', '.ds-suggestions a', (event) => {
        event.preventDefault();
      });
    }

    this.autocomplete.on(
      'autocomplete:selected',
      this.handleSelected.bind(null, this.autocomplete.autocomplete),
    );

    this.autocomplete.on(
      'autocomplete:shown',
      this.handleShown.bind(this, this.input),
    );

    if (enhancedSearchInput) {
      DocSearch.bindSearchBoxEvent();
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        this.input.focus();
        e.preventDefault();
      }
    });
  }

  positionDropdown() {
    try {
      if (!this.input || !this.input[0] || typeof window === 'undefined') return;
      if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) return;

      const menu = document.querySelector('.algolia-autocomplete .ds-dropdown-menu');
      if (!menu) return;

      const inputEl = this.input[0];
      const inputRect = inputEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      const gutter = 8;
      const desiredWidth = Math.min(600, Math.max(0, viewportWidth - gutter * 2));
      const top = Math.round(inputRect.bottom + 6);

      let left = Math.round(inputRect.right - desiredWidth);
      left = Math.max(gutter, Math.min(left, viewportWidth - desiredWidth - gutter));

      menu.classList.add('ds-dropdown-menu--fixed');
      menu.style.position = 'fixed';
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.right = 'auto';
      menu.style.margin = '0';
      menu.style.width = `${desiredWidth}px`;
      menu.style.maxWidth = `${desiredWidth}px`;
      menu.style.maxHeight = `${Math.max(200, viewportHeight - top - gutter)}px`;
      menu.style.overflow = 'auto';
      menu.style.zIndex = '9999';
    } catch (e) {
      // ignore: positioning should never break search
    }
  }

  static getInputFromSelector(selector) {
    const input = $(selector).filter('input');
    return input.length ? $(input[0]) : null;
  }

  getAutocompleteSource(transformData, queryHook) {
    return (query, callback) => {
      if (queryHook) {
        query = queryHook(query) || query;
      }
      this.client.search(query).then((hits) => {
        if (this.queryDataCallback && typeof this.queryDataCallback === 'function') {
          this.queryDataCallback(hits);
        }
        if (transformData) {
          hits = transformData(hits) || hits;
        }
        callback(DocSearch.formatHits(hits));
      });
    };
  }

  static formatHits(receivedHits) {
    const clonedHits = utils.deepClone(receivedHits);
    const hits = clonedHits.map((hit) => {
      if (hit._highlightResult) {
        hit._highlightResult = utils.mergeKeyWithParent(hit._highlightResult, 'hierarchy');
      }
      return utils.mergeKeyWithParent(hit, 'hierarchy');
    });

    let groupedHits = utils.groupBy(hits, 'lvl0');
    $.each(groupedHits, (level, collection) => {
      const groupedHitsByLvl1 = utils.groupBy(collection, 'lvl1');
      const flattenedHits = utils.flattenAndFlagFirst(groupedHitsByLvl1, 'isSubCategoryHeader');
      groupedHits[level] = flattenedHits;
    });
    groupedHits = utils.flattenAndFlagFirst(groupedHits, 'isCategoryHeader');

    return groupedHits.map((hit) => {
      const url = DocSearch.formatURL(hit);
      const category = utils.getHighlightedValue(hit, 'lvl0');
      const subcategory = utils.getHighlightedValue(hit, 'lvl1') || category;
      const displayTitle = utils
        .compact([utils.getHighlightedValue(hit, 'lvl2') || subcategory])
        .join('<span class="aa-suggestion-title-separator" aria-hidden="true"> › </span>');
      const text = utils.getSnippetedValue(hit, 'content');
      const isTextOrSubcategoryNonEmpty =
        (subcategory && subcategory !== '') || (displayTitle && displayTitle !== '');
      const isLvl1EmptyOrDuplicate = !subcategory || subcategory === '' || subcategory === category;
      const isLvl2 = displayTitle && displayTitle !== '' && displayTitle !== subcategory;
      const isLvl1 = !isLvl2 && subcategory && subcategory !== '' && subcategory !== category;
      const isLvl0 = !isLvl1 && !isLvl2;
      const version = hit.version;

      return {
        isLvl0,
        isLvl1,
        isLvl2,
        isLvl1EmptyOrDuplicate,
        isCategoryHeader: hit.isCategoryHeader,
        isSubCategoryHeader: hit.isSubCategoryHeader,
        isTextOrSubcategoryNonEmpty,
        category,
        subcategory,
        title: displayTitle,
        text,
        url,
        version,
      };
    });
  }

  static formatURL(hit) {
    const { url, anchor } = hit;
    if (url) {
      const containsAnchor = url.indexOf('#') !== -1;
      if (containsAnchor) return url;
      else if (anchor) return `${hit.url}#${hit.anchor}`;
      return url;
    } else if (anchor) return `#${hit.anchor}`;
    return null;
  }

  static getEmptyTemplate() {
    return (args) => Hogan.compile(templates.empty).render(args);
  }

  static getSuggestionTemplate(isSimpleLayout) {
    const template = isSimpleLayout ? templates.suggestionSimple : templates.suggestion;
    return (suggestion) => Hogan.compile(template).render(suggestion);
  }

  handleSelected(input, event, suggestion) {
    window.location.assign(suggestion.url);
  }

  handleShown(input) {
    input.attr('aria-expanded', true);
    requestAnimationFrame(() => this.positionDropdown());
  }
}

export default DocSearch;
