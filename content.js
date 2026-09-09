(function () {
  const STORAGE_PREFIX = 'pickapartTracker';

  const locationList = {
    "Mangere-Stock": "Mangere",
    "Avondale-Stock": "Avondale",
    "Current-Stock-New-Plymouth": "New Plymouth",
    "Current-Stock-Wellington": "Wellington",
    "Takanini-Stock": "Takanini"
  };

  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const SETTINGS_KEY = `${STORAGE_PREFIX}/settings`;
  const MAX_RANGE_DAYS = 60;
  const DEFAULT_RANGE = { minDays: 0, maxDays: 30 };

  function getStoreKeyForPath(pathValue) {
    const normalized = String(pathValue || '')
      .trim()
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    return normalized ? `${STORAGE_PREFIX}/${normalized}` : STORAGE_PREFIX;
  }

  function getStoreKey() {
    try {
      const url = new URL(window.location.href);
      const pathname = (url.pathname || '').toLowerCase();

      if (pathname.includes('display_vehicle.asp') || pathname.includes('display_vehicle.aspx') || pathname.includes('display_vehicle')) {
        const container = document.querySelector('.part-detail-right');
        const locationNameFromRef = extractLocationFromVehicleRef(container);
        if (typeof locationNameFromRef === 'string' && locationNameFromRef.trim()) {
          const locationKey = getStoreKeyForLocationName(locationNameFromRef);
          if (locationKey) {
            return locationKey;
          }
        }
      }

      if (pathname.includes('display_vehicles.asp') || url.searchParams.get('SeriesID')) {
        const intermediateLocationEl = document.querySelector('.car-search-code');
        const intermediateLocationText = intermediateLocationEl ? (intermediateLocationEl.textContent || '').trim() : '';
        if (intermediateLocationText) {
          const locationKey = getStoreKeyForLocationName(intermediateLocationText);
          if (locationKey) {
            return locationKey;
          }
        }
      }

      return getStoreKeyForPath(url.pathname);
    } catch (e) {
      return STORAGE_PREFIX;
    }
  }

  function logStorageEvent(action, storeKey, details) {
    console.log(`[pickapartTracker] ${action} localStorage`, {
      key: storeKey,
      ...details,
    });
  }

  function readSeenMap() {
    const storeKey = getStoreKey();
    const raw = window.localStorage.getItem(storeKey);
    if (!raw) {
      logStorageEvent('read', storeKey, { result: 'empty', entries: 0 });
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      const map = parsed && typeof parsed === 'object' ? parsed : {};
      logStorageEvent('read', storeKey, {
        result: 'success',
        entries: Object.keys(map).length,
        preview: Object.keys(map).slice(0, 5),
      });
      return map;
    } catch (error) {
      logStorageEvent('read', storeKey, { result: 'parse-error', error: String(error) });
      return {};
    }
  }

  function writeSeenMap(map, explicitStoreKey = null) {
    const storeKey = explicitStoreKey || getStoreKey();
    const serialized = JSON.stringify(map);
    console.log('[pickapartTracker] write localStorage', {
      key: storeKey,
      entries: Object.keys(map).length,
      preview: Object.keys(map).slice(0, 5),
      serializedLength: serialized.length,
    });
    window.localStorage.setItem(storeKey, serialized);
  }

  function readHighlightRange() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');
      const minDays = Number(parsed.minDays);
      const maxDays = Number(parsed.maxDays);

      const safeMinDays = Number.isFinite(minDays) ? Math.max(0, Math.min(MAX_RANGE_DAYS, minDays)) : DEFAULT_RANGE.minDays;
      const safeMaxDays = Number.isFinite(maxDays) ? Math.max(0, Math.min(MAX_RANGE_DAYS, maxDays)) : DEFAULT_RANGE.maxDays;

      return {
        minDays: Math.min(safeMinDays, safeMaxDays),
        maxDays: Math.max(safeMinDays, safeMaxDays),
      };
    } catch (error) {
      return { ...DEFAULT_RANGE };
    }
  }

  function writeHighlightRange(range) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(range));
  }

  function cleanText(node) {
    return (node.textContent).replace(/\s+/g, ' ').trim();
  }

  function getVehicleTitleFromCard(cardEl) {
    if (!cardEl) return null;

    const nameEl = cardEl.querySelector('.car-search-name');
    const yearEl = cardEl.querySelector('.car-search-year');
    const nameText = nameEl ? (nameEl.textContent || '').replace(/\s+/g, ' ').trim().replace(/,$/, '') : '';
    const yearText = yearEl ? (yearEl.textContent || '').replace(/\s+/g, ' ').trim() : '';

    if (!nameText && !yearText) {
      return null;
    }

    return `${nameText}${nameText && yearText ? ' ' : ''}${yearText}`.replace(/\s+/g, ' ').trim();
  }

  function isHeaderAnchor(anchor) {
    if (!anchor || anchor.querySelector('b')) {
      return true;
    }

    return false;
  }

  function getKeyFromAnchorTag(anchor) {
    const href = anchor.getAttribute('href') || '';
    const url = new URL(href, window.location.href);
    const vehicleId = url.searchParams.get('VehicleID');

    

    if (vehicleId) {
      return `vehicleId:${vehicleId}`;
    }
    
    console.log(anchor)
    const text = cleanText(anchor);
    console.log(text);
    return `title:${text}`;
  }

  function isVehicleAnchor(anchor) {
    
    if (!anchor) {
      return false;
    }

    if (isHeaderAnchor(anchor)) {
      return false;
    }

    const href = anchor.getAttribute('href') || '';
    const text = cleanText(anchor);

    if (!text || !href || href === '#') {
      return false;
    }

    if (!href.toLowerCase().includes('display_vehicle.asp') && !href.toLowerCase().includes('display_vehicles.asp')) {
      return false;
    }

    return true;
  }

  function shouldRunOnPage() {
    try {
      const url = new URL(window.location.href);
      const pathname = (url.pathname || '').toLowerCase();
      // Skip the eziparts directory entirely
      if (pathname.includes('/eziparts/')) {
        return false;
      }
    } catch (e) {
      // If URL parsing fails, be conservative and run
    }

    return true;
  }

  function isDetailPage() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('VehicleID')) {
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  function isIntermediaryPage() {
    try {
      const url = new URL(window.location.href);
      const pathname = (url.pathname || '').toLowerCase();
      if (pathname.includes('display_vehicles.asp') || url.searchParams.get('SeriesID')) {
        return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  }

  function isHomePage() {
    try {
      const url = new URL(window.location.href);
      const pathname = (url.pathname || '').toLowerCase();

      for (const locationKey of Object.keys(locationList)) {
        const normalized = locationKey.toLowerCase().trim();
        if (
          pathname === `/${normalized}` ||
          pathname.endsWith(`/${normalized}`) ||
          pathname.includes(`/${normalized}/`)
        ) {
          return true;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  function updateParentFromIntermediaryPage() {
    try {
      const firstCard = document.querySelector('.car-detail-search-detail');
      const parentTitle = getVehicleTitleFromCard(firstCard);
      if (!parentTitle) return;

      const carCount = document.querySelectorAll('.car-detail-search').length;
      const parentKey = `title:${parentTitle} (${carCount})`;

      // Find the first car link in the list (left-most). Prefer the .car-detail-search img link or view link
      let firstLink = null;
      const imgLink = document.querySelector('.car-detail-search .car-detail-search-img a');
      if (imgLink) {
        firstLink = imgLink;
      } else {
        const viewLink = document.querySelector('.car-detail-search .car-search-view a');
        if (viewLink) firstLink = viewLink;
      }

      if (!firstLink) return;
      const href = firstLink.getAttribute('href') || '';
      const firstUrl = new URL(href, window.location.href);
      const firstVehicleId = firstUrl.searchParams.get('VehicleID');
      if (!firstVehicleId) return;

      // Determine store key for this listing's location
      let storeKey = getStoreKey();
        // Try to read location name from first car's .car-search-code (e.g., Mangere)
        let firstLocationName = null;
        const firstCodeEl = document.querySelector('.car-detail-search .car-search-code');
        if (firstCodeEl) firstLocationName = (firstCodeEl.textContent || '').trim();
        if (firstLocationName) {
          const candidateNameKey = getStoreKeyForLocationName(firstLocationName);
          if (candidateNameKey) storeKey = candidateNameKey;
        }

      const raw = window.localStorage.getItem(storeKey);
      if (!raw) return;
      let seenMap = {};
      try {
        seenMap = JSON.parse(raw) || {};
      } catch (e) {
        return;
      }

      const firstKey = `vehicleId:${firstVehicleId}`;
      const firstSeenValue = Number(seenMap[firstKey]);
      if (!Number.isFinite(firstSeenValue)) return;

      seenMap[parentKey] = firstSeenValue;
      console.log('[pickapartTracker] updating parent title localStorage entry', {
        storeKey,
        parentKey,
        firstKey,
        parentValue: seenMap[parentKey],
      });
      writeSeenMap(seenMap, storeKey);
    } catch (e) {
      // ignore
    }
  }

  function updateDateInStockFromDetailPage() {
    const container = document.querySelector('.part-detail-right');

    if (!container) return;

    const detailDes = Array.from(container.querySelectorAll('.detail-des'));
    let dateText = null;
    for (const el of detailDes) {
      if ((el.textContent || '').toLowerCase().includes('date in stock')) {
        const info = el.nextElementSibling;
        if (info && info.classList && info.classList.contains('detail-info')) {
          dateText = (info.textContent || '').trim();
          break;
        }
      }
    }

    if (!dateText) return;

    const parsed = new Date(dateText);
    if (isNaN(parsed.getTime())) return;
    const ms = parsed.getTime();

    const url = new URL(window.location.href);
    const vehicleId = url.searchParams.get('VehicleID');
    if (!vehicleId) return;

    // Read the seen map for the correct location store
    let storeKey = getStoreKey();
    // Prefer the Vehicle Ref location name from the page to determine store key
    const locationNameFromRef = extractLocationFromVehicleRef(container);
    if (locationNameFromRef) {
      const candidateNameKey = getStoreKeyForLocationName(locationNameFromRef);
      if (candidateNameKey) {
        storeKey = candidateNameKey;
      }
    }

    const raw = window.localStorage.getItem(storeKey);
    let seenMap = {};
    if (raw) {
      try {
        seenMap = JSON.parse(raw) || {};
      } catch (e) {
        seenMap = {};
      }
    }

    const key = `vehicleId:${vehicleId}`;
    // Always set/update the vehicle timestamp using Date In Stock
    seenMap[key] = ms;
    writeSeenMap(seenMap, storeKey);
  }

  // Note: storage location names are derived from page content using `locationList`

  function extractLocationFromVehicleRef(container) {
    if (!container) {
      return null;
    }

    const detailDes = Array.from(container.querySelectorAll('.detail-des'));
    for (const el of detailDes) {
      if ((el.textContent || '').toLowerCase().includes('vehicle ref')) {
        const info = el.nextElementSibling;
        if (info && info.classList && info.classList.contains('detail-info')) {
          const location = info.childNodes[0].textContent || '';
          return location;
        }
      }
    }
    return null;
  }

  function getStoreKeyForLocationName(locationName) {
    if (!locationName) return null;
    const target = locationName.toLowerCase();

    for (const key in locationList) {
      if (key.toLowerCase().includes(target) || key.toLowerCase() === target) {
        return getStoreKeyForPath(key);
      }
    }

    return null;
  }

  function applyHighlight(anchor, firstSeenTs, range) {
    if (!anchor) {
      return;
    }

    const ageDays = (Date.now() - Number(firstSeenTs)) / millisecondsInDay;
    const inRange = ageDays >= range.minDays && ageDays <= range.maxDays;

    anchor.classList.toggle('pickapart-highlight', inRange);
    anchor.dataset.pickapartFirstSeen = String(firstSeenTs);
    anchor.title = `First seen: ${new Date(Number(firstSeenTs)).toLocaleString()}`;
  }

  function processHomePage(range = readHighlightRange()) {
    const seenMap = readSeenMap();
    const anchors = Array.from(document.querySelectorAll('a[href]'));

    anchors.forEach((anchor) => {
      if (!isVehicleAnchor(anchor)) {
        return;
      }

      const key = getKeyFromAnchorTag(anchor);
      if (!seenMap[key]) {
        console.log(`Vehicle not found in seenMap: ${key}`);
        seenMap[key] = Date.now();
      }

      console.log(seenMap);

      console.log(`Applying highlight for ${key} with timestamp ${seenMap[key]}`);

      applyHighlight(anchor, seenMap[key], range);
    });
    writeSeenMap(seenMap);
  }

  function addHighlightControls() {
    if (document.querySelector('.pickapart-controls')) {
      return;
    }

    const range = readHighlightRange();
    const controls = document.createElement('div');
    controls.className = 'pickapart-controls';
    controls.innerHTML = `
      <strong>Highlight age</strong>
      <label>Minimum: <output data-range-min>${range.minDays}</output> days
        <input type="range" min="0" max="${MAX_RANGE_DAYS}" value="${range.minDays}" data-range-min-input>
      </label>
      <label>Maximum: <output data-range-max>${range.maxDays}</output> days
        <input type="range" min="0" max="${MAX_RANGE_DAYS}" value="${range.maxDays}" data-range-max-input>
      </label>
    `;

    const minInput = controls.querySelector('[data-range-min-input]');
    const maxInput = controls.querySelector('[data-range-max-input]');
    const minOutput = controls.querySelector('[data-range-min]');
    const maxOutput = controls.querySelector('[data-range-max]');

    const updateRange = () => {
      const minDays = Math.min(Number(minInput.value), Number(maxInput.value));
      const maxDays = Math.max(Number(minInput.value), Number(maxInput.value));
      minInput.value = String(minDays);
      maxInput.value = String(maxDays);
      minOutput.value = String(minDays);
      maxOutput.value = String(maxDays);
      minOutput.textContent = String(minDays);
      maxOutput.textContent = String(maxDays);
      writeHighlightRange({ minDays, maxDays });
      processHomePage({ minDays, maxDays });
    };

    minInput.addEventListener('input', updateRange);
    maxInput.addEventListener('input', updateRange);
    document.body.appendChild(controls);
  }

  function initialize() {
    // Only one page type is active at a time, so process the matching type and exit.
    if (isDetailPage()) {
      updateDateInStockFromDetailPage();
      return;
    }

    if (isIntermediaryPage()) {
      updateParentFromIntermediaryPage();
      return;
    }

    if (!isHomePage()) {
      return;
    }

    const targetNode = document.body || document.documentElement;
    if (!targetNode) {
      return;
    }

    // Process listings that already exist before watching for async additions.
    addHighlightControls();
    processHomePage();

    const observer = new MutationObserver(() => {
      processHomePage();     
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
