import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Quadro de Horários do IFPI - São Raimundo Nonato',
  tagline:
    '"Com organização e tempo, acha-se o segredo de fazer tudo e bem feito." - Pitágoras',
   favicon: 'img/favicon.gif',

  // Set the production url of your site here
  url: 'https://profsergiocastro.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/ifpisrn-horarios/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'profsergiocastro', // Usually your GitHub org/user name.
  projectName: 'ifpisrn-horarios', // Usually your repo name.
  trailingSlash: false,

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
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
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      logo: {
        alt: 'My Site Logo',
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
        // {
        //   href: 'https://www.ifpi.edu.br/saoraimundononato',
        //   label: 'Campus São Raimundo Nonato',
        //   position: 'right',
        // },
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
        // {
        //   title: 'Docs',
        //   items: [
        //     {
        //       label: 'Tutorial',
        //       to: '/docs/intro',
        //     },
        //   ],
        // },
        {
          title: 'Institucional',
          items: [
            {
              label: 'IFPI - Campus São Raimundo Nonato',
              href: 'https://www.ifpi.edu.br/saoraimundononato',
            },
            // {
            //   label: 'Discord',
            //   href: 'https://discordapp.com/invite/docusaurus',
            // },
            // {
            //   label: 'Twitter',
            //   href: 'https://twitter.com/docusaurus',
            // },
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
        trackingID: 'GTM-MQ8B67G4',
        anonymizeIP: false,
      },
    ],
    [require.resolve('docusaurus-lunr-search'),
      {
        languages: ['pt'],
        disableVersioning : true
      }
    ],

    // [
    //   require.resolve('@cmfcmf/docusaurus-search-local'),
    //   {
    //     // Options here
    //     indexDocs: true,
    //     indexBlog: false,
    //     indexPages: false,
    //     language: "pt",
    //   },
    // ],
  ],

};

export default config;
