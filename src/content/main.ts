// Content-script entry, injected into AliExpress pages at document_start (see public/manifest.json).
import { effectiveHiddenBadges, DEFAULT_SETTINGS } from '../shared/settings';
import { readSettings } from '../shared/settingsStore';
import './content.scss';
import { removeAllHiddenNotices, updateAllHiddenNotices } from './notice/allHiddenNotice';
import { applyHiding } from './page/applySettings';
import { countHidden } from './page/hiddenCount';
import { createPageState } from './page/pageState';
import { watchPage } from './page/watchPage';

const html = document.documentElement;
const pageState = createPageState();

// Storage is asynchronous, so start from the defaults: a brief absence for a shopper who turned
// hiding off beats a flash of unwanted listings for everyone else (research R4).
let hiddenBadges = effectiveHiddenBadges(DEFAULT_SETTINGS);
applyHiding(html, hiddenBadges, pageState.revealed);

function revealPage(): void {
  pageState.reveal();
  applyHiding(html, hiddenBadges, pageState.revealed);
  removeAllHiddenNotices(document);
}

function refreshNotices(): void {
  const { fullyHiddenContainers } = countHidden(document, hiddenBadges, pageState.revealed);
  updateAllHiddenNotices(fullyHiddenContainers, hiddenBadges, revealPage);
}

readSettings()
  .then((settings) => {
    hiddenBadges = effectiveHiddenBadges(settings);
    applyHiding(html, hiddenBadges, pageState.revealed);
    refreshNotices();
  })
  .catch((error: unknown) => {
    // Fail-safe: keep the defaults already applied and never throw into the page.
    console.debug('NoChoice: could not read settings', error);
  });

watchPage(document, {
  onPageKeyChange: (pageKey) => {
    pageState.onNavigate(pageKey);
    applyHiding(html, hiddenBadges, pageState.revealed);
    removeAllHiddenNotices(document);
  },
  onBatchProcessed: refreshNotices,
});
