// Content-script entry, injected into AliExpress pages at document_start (see public/manifest.json).
import { buildStatusMessage } from '../shared/messages';
import { DEFAULT_SETTINGS, effectiveHiddenBadges } from '../shared/settings';
import './content.scss';
import { removeAllHiddenNotices, updateAllHiddenNotices } from './notice/allHiddenNotice';
import { applyHiding } from './page/applySettings';
import { followSettings } from './page/followSettings';
import { countHidden } from './page/hiddenCount';
import { createPageState } from './page/pageState';
import { watchPage } from './page/watchPage';
import { startStatusPort } from './statusPort';

const html = document.documentElement;
const pageState = createPageState();

// Storage is asynchronous, so start from the defaults: a brief absence for a shopper who turned
// hiding off beats a flash of unwanted listings for everyone else (research R4).
let hiddenBadges = effectiveHiddenBadges(DEFAULT_SETTINGS);
applyHiding(html, hiddenBadges, pageState.revealed);

const currentCounts = () => countHidden(document, hiddenBadges, pageState.revealed);

const notifyChanged = startStatusPort(() =>
  buildStatusMessage(currentCounts(), pageState.revealed),
);

function revealPage(): void {
  pageState.reveal();
  applyHiding(html, hiddenBadges, pageState.revealed);
  removeAllHiddenNotices(document);
  notifyChanged();
}

function refreshNotices(): void {
  updateAllHiddenNotices(currentCounts().fullyHiddenContainers, hiddenBadges, revealPage);
}

followSettings((settings) => {
  hiddenBadges = effectiveHiddenBadges(settings);
  applyHiding(html, hiddenBadges, pageState.revealed);
  refreshNotices();
  notifyChanged();
});

watchPage(document, {
  onPageKeyChange: (pageKey) => {
    pageState.onNavigate(pageKey);
    applyHiding(html, hiddenBadges, pageState.revealed);
    removeAllHiddenNotices(document);
    notifyChanged();
  },
  onBatchProcessed: () => {
    refreshNotices();
    notifyChanged();
  },
});
