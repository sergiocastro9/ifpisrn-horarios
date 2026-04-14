import React, { useRef, useCallback, useState, useEffect } from 'react'
import clsx from 'clsx'
import { useHistory } from '@docusaurus/router'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { usePluginData } from '@docusaurus/useGlobalData'
import useIsBrowser from '@docusaurus/useIsBrowser'

import { HighlightSearchResults } from 'docusaurus-lunr-search/src/theme/SearchBar/HighlightSearchResults'
import { trackEvent } from '@site/src/utils/analytics'

function joinUrl(base, fileName) {
  const b = String(base ?? '')
  const f = String(fileName ?? '')
  if (!b) return f
  if (!f) return b
  if (b.endsWith('/') && f.startsWith('/')) return b + f.slice(1)
  if (!b.endsWith('/') && !f.startsWith('/')) return `${b}/${f}`
  return b + f
}

async function fetchJsonFirstOk(urls) {
  let lastError
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-cache' })
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} for ${url}`)
        continue
      }
      return await response.json()
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Failed to fetch JSON')
}

const Search = (props) => {
  const initialized = useRef(false)
  const searchBarRef = useRef(null)
  const [indexReady, setIndexReady] = useState(false)
  const history = useHistory()
  const { siteConfig = {} } = useDocusaurusContext()
  const isBrowser = useIsBrowser()
  const isProduction = process.env.NODE_ENV === 'production'
  const { baseUrl } = siteConfig

  const pluginConfig = (siteConfig.plugins || []).find(
    (plugin) =>
      Array.isArray(plugin) &&
      typeof plugin[0] === 'string' &&
      plugin[0].includes('docusaurus-lunr-search'),
  )

  const assetUrl = (pluginConfig && pluginConfig[1]?.assetUrl) || baseUrl

  const initAlgolia = (searchDocs, searchIndex, DocSearch, options) => {
    // eslint-disable-next-line no-new
    new DocSearch({
      searchDocs,
      searchIndex,
      baseUrl,
      inputSelector: '#search_input_react',
      handleSelected: (_input, _event, suggestion) => {
        const url = suggestion.url || '/'
        const a = document.createElement('a')
        a.href = url
        _input.setVal('')
        _event.target.blur()

        let wordToHighlight = ''
        if (options.highlightResult) {
          try {
            const matchedLine = suggestion.text || suggestion.subcategory || suggestion.title
            const matchedWordResult = matchedLine.match(new RegExp('<span.+span>\\w*', 'g'))
            if (matchedWordResult && matchedWordResult.length > 0) {
              const tempDoc = document.createElement('div')
              tempDoc.innerHTML = matchedWordResult[0]
              wordToHighlight = tempDoc.textContent
            }
          } catch (e) {
            // ignore
          }
        }

        history.push(url, {
          highlightState: { wordToHighlight },
        })

        trackEvent('search_result_open', {
          url,
          title: suggestion.title || '',
          subcategory: suggestion.subcategory || '',
        })
      },
      maxHits: options.maxHits,
    })
  }

  const pluginData = usePluginData('docusaurus-lunr-search')

  const getSearchDoc = () => {
    const pluginFile = pluginData?.fileNames?.searchDoc
    const fileNames = [pluginFile, 'search-doc.json'].filter(Boolean)
    const candidates = fileNames.flatMap((fileName) => [
      joinUrl(assetUrl, fileName),
      joinUrl(baseUrl, fileName),
      `/${fileName}`,
      fileName,
    ])
    return fetchJsonFirstOk(candidates)
  }

  const getLunrIndex = () => {
    const pluginFile = pluginData?.fileNames?.lunrIndex
    const fileNames = [pluginFile, 'lunr-index.json'].filter(Boolean)
    const candidates = fileNames.flatMap((fileName) => [
      joinUrl(assetUrl, fileName),
      joinUrl(baseUrl, fileName),
      `/${fileName}`,
      fileName,
    ])
    return fetchJsonFirstOk(candidates)
  }

  const loadAlgolia = () => {
    if (initialized.current || !isBrowser) return
    // docusaurus-lunr-search only generates the index in build/serve (postBuild).
    if (!isProduction) return

    Promise.all([
      getSearchDoc(),
      getLunrIndex(),
      import('docusaurus-lunr-search/src/theme/SearchBar/DocSearch'),
      import('docusaurus-lunr-search/src/theme/SearchBar/algolia.css'),
    ])
      .then(([searchDocFile, searchIndex, { default: DocSearch }]) => {
        const { searchDocs, options } = searchDocFile || {}
        if (!searchDocs || searchDocs.length === 0) return
        initAlgolia(searchDocs, searchIndex, DocSearch, options)
        setIndexReady(true)
        initialized.current = true
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Search initialization failed:', error)
        initialized.current = false
      })
  }

  const toggleSearchIconClick = useCallback(
    (e) => {
      if (!searchBarRef.current?.contains(e.target)) {
        searchBarRef.current?.focus()
      }

      props.handleSearchBarToggle &&
        props.handleSearchBarToggle(!props.isSearchBarExpanded)
    },
    [props.isSearchBarExpanded],
  )

  let placeholder = 'Search'
  if (isBrowser) {
    placeholder = !isProduction
      ? 'Busca disponível após build (use npm start)'
      : window.navigator.platform.startsWith('Mac')
        ? 'Search âŒ˜+K'
        : 'Search Ctrl+K'
  }

  useEffect(() => {
    loadAlgolia()
  }, [])

  useEffect(() => {
    if (props.autoFocus && indexReady) {
      searchBarRef.current?.focus()
    }
  }, [indexReady])

  return (
    <div className="navbar__search" key="search-box">
      <span
        aria-label="expand searchbar"
        role="button"
        className={clsx('search-icon', {
          'search-icon-hidden': props.isSearchBarExpanded,
        })}
        onClick={toggleSearchIconClick}
        onKeyDown={toggleSearchIconClick}
        tabIndex={0}
      />
      <input
        id="search_input_react"
        type="search"
        placeholder={isProduction ? (indexReady ? placeholder : 'Carregando...') : placeholder}
        aria-label="Search"
        className={clsx(
          'navbar__search-input',
          { 'search-bar-expanded': props.isSearchBarExpanded },
          { 'search-bar': !props.isSearchBarExpanded },
        )}
        onClick={loadAlgolia}
        onMouseOver={loadAlgolia}
        onFocus={toggleSearchIconClick}
        onBlur={toggleSearchIconClick}
        ref={searchBarRef}
        readOnly={!isProduction || !indexReady}
        aria-disabled={!isProduction || !indexReady}
      />
      <HighlightSearchResults />
    </div>
  )
}

export default Search

