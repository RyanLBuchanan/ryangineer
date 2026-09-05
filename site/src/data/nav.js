// Single source of truth for site navigation.
// Defined ONCE here instead of being copy-pasted into every page.
// `external: true` opens in a new tab; internal links stay in the same tab
// and use relative URLs so the site works locally and on any domain.

// Top-level nav. A top item is either a direct link ({ label, href }) or a
// dropdown group ({ label, children: [...] }). Grouping mirrors the structure
// of the other sites (logo left, a few grouped items, CTA button right).
export const navLinks = [
  { label: 'Home', href: '/' },
  {
    label: 'Mathematics',
    children: [
      { label: 'Algebra', href: '/algebra.html' },
      { label: 'Precalculus', href: '/precalculus.html' },
      { label: 'Mathematicians', href: '/mathematicians.html' },
    ],
  },
  {
    label: 'Data & ML',
    children: [
      { label: 'Machine Learning', href: '/machine_learning.html' },
      { label: 'Data Science', href: '/data_science.html' },
      { label: 'AI Finance', href: '/ai_finance.html' },
      { label: 'Data Dashboard', href: '/data_dashboard.html' },
      {
        label: 'Executive Dashboard',
        href: 'https://public.tableau.com/views/RepresentationandReporting-NAM2-D210-Part1-InteractiveDataDashboard/ExecutiveDashboard?:language=en-US&publish=yes&:display_count=n&:origin=viz_share_link',
        external: true,
      },
    ],
  },
  {
    label: 'Projects',
    children: [
      { label: 'AITA', href: '/aitaProject/public/index.html' },
      { label: 'CKK Store', href: '/ckk_store.html' },
      { label: 'Quick Start Finance', href: '/QuickStartFinance.html' },
      { label: 'JavaJam', href: '/javajam/index.html' },
      { label: 'KittyHub', href: '/KittyHub/index.html' },
      { label: 'VR Dev Kids', href: '/virtual_reality.html' },
    ],
  },
  {
    label: 'Education',
    children: [
      { label: 'DavisTech', href: '/dtech.html' },
      { label: 'OTech', href: '/otech.html' },
      { label: 'WSU', href: '/wsu.html' },
    ],
  },
  {
    label: 'Tools',
    children: [
      { label: 'Nowcast (Live Weather)', href: '/tools/nowcast.html' },
      { label: 'Cat Translator (Dave)', href: '/tools/cat-translator.html' },
      { label: 'Hurricane Simulator', href: '/tools/hurricane-simulator.html' },
    ],
  },
  { label: 'About', href: '/about.html' },
];

// Prominent call-to-action button on the right of the nav (matches the
// "Start a Project" button on the other sites).
export const navCta = { label: 'Resume', href: '/resume.pdf', external: true };

export const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/RyanLBuchanan', icon: '/assets/social-github.png' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ryanlbuchanan/', icon: '/assets/social-linkedin.png' },
  { label: 'Facebook', href: 'https://www.facebook.com/buchananryan22', icon: '/assets/social-facebook.png' },
  { label: 'Twitter', href: 'https://twitter.com/buchananryan22', icon: '/assets/social-twitter.png' },
  { label: 'Instagram', href: 'https://www.instagram.com/ryanlbuchanan/', icon: '/assets/social-instagram.png' },
  { label: 'DataCamp', href: 'https://www.datacamp.com/profile/ryanlbuchanan', icon: '/assets/social-datacamp.png' },
  { label: 'Stack Overflow', href: 'https://stackoverflow.com/users/story/7541619?view=Timeline', icon: '/assets/social-stack-overflow.png' },
  { label: 'VR Dev Kids', href: '/virtual_reality.html', icon: '/assets/social-youtube.png' },
];
