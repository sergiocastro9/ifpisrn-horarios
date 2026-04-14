import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Quadro de Horários do IFPI - Campus São Raimundo Nonato',
  tagline:
    '"Com organização e tempo, acha-se o segredo de fazer tudo e bem feito." - Pitágoras',
  favicon: 'img/favicon.gif',

  url: 'https://profsergiocastro.github.io/',
  baseUrl: '/ifpisrn-horarios/',

  organizationName: 'profsergiocastro',
  projectName: 'ifpisrn-horarios',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
    path: 'i18n',
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/ifpi-social-card.png',
    navbar: {
      logo: {
        alt: 'IFPI - Campus São Raimundo Nonato',
        src: 'img/logo.svg',
        srcDark: 'img/logoDark.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Quadro de Horários',
        },
        {
          type: 'search',
          position: 'right',
        },
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Institucional',
          items: [
            {
              label: 'IFPI - Campus São Raimundo Nonato',
              href: 'https://www.ifpi.edu.br/saoraimundononato',
            },
          ],
        },
        {
          title: 'Contato',
          items: [
            {
              label: 'sergio.castro@ifpi.edu.br',
              href: 'mailto:sergio.castro@ifpi.edu.br',
            },
          ],
        },
      ],
      copyright: `Copyright © 2026 Prof. Sérgio Castro.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    [
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: 'G-P5VW49XG7M',
        anonymizeIP: true,
      },
    ],
    [
      '@docusaurus/plugin-google-tag-manager',
      {
        containerId: 'GTM-MQ8B67G4',
      },
    ],
    [
      require.resolve('docusaurus-lunr-search'),
      {
        languages: ['pt'],
        disableVersioning: true,
      },
    ],
  ],
};

export default config;
