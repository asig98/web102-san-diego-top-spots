// main.js
// San Diego Top Spots — interactive card grid + live map

const CATEGORIES = [
  { key: "beach",    label: "Beach & Coast",     emoji: "🏖️", test: /beach|surf|boardwalk|coast|shore/ },
  { key: "brewery",  label: "Breweries",         emoji: "🍺", test: /beer|brewery|brew|ale/ },
  { key: "food",     label: "Food & Drink",      emoji: "🍽️", test: /food|burger|brunch|dessert|dinner|café|cafe|taco|pizza|restaurant|grub|eat/ },
  { key: "culture",  label: "Museums & Culture", emoji: "🏛️", test: /museum|library|mummies|art|gallery|exhibit/ },
  { key: "outdoors", label: "Outdoors & Trails", emoji: "🥾", test: /hike|trail|run|park|marathon/ },
  { key: "ocean",    label: "Ocean & Aquarium",  emoji: "🐠", test: /aquarium|scuba|dive|snorkel|tide ?pool/ },
  { key: "shopping", label: "Shopping",          emoji: "🛍️", test: /shop|thrift|fashion|market|seaport|boutique/ },
  { key: "music",    label: "Live Music",        emoji: "🎶", test: /concert|music|casbah|organ|band/ },
  { key: "bike",     label: "Bike & Cruise",     emoji: "🚲", test: /bike|cruise|cycling|pedal/ },
  { key: "spooky",   label: "Spooky",            emoji: "👻", test: /ghost|haunted|paranormal/ },
  { key: "theater",  label: "Theater & Shows",   emoji: "🎭", test: /theater|globe|grinch|show|play\b/ },
  { key: "family",   label: "Zoo & Family",      emoji: "🦁", test: /zoo|animal|legoland|comic con|geek/ },
];
const OTHER_CATEGORY = { key: "other", label: "Explore", emoji: "📍" };

const FAVORITES_KEY = "sd-top-spots-favorites";

function categorize(spot) {
  const text = (spot.name + " " + spot.description).toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.test.test(text)) return cat;
  }
  return OTHER_CATEGORY;
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveFavorites(set) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
  } catch (e) {
    /* storage unavailable — favorites just won't persist */
  }
}

$(document).ready(function () {
  let spots = [];
  let favorites = loadFavorites();
  let activeCategory = "all";
  let searchTerm = "";
  let favoritesOnly = false;
  let map, markers = {};

  const $cardsCol = $("#cards-col");
  const $categoryRow = $("#category-row");
  const $resultsCount = $("#results-count");
  const $emptyState = $("#empty-state");
  const $favToggle = $("#favorites-toggle");
  const $favCount = $("#favorites-count");
  const $search = $("#search-input");

  function initMap() {
    map = L.map("map", { scrollWheelZoom: false }).setView([32.78, -117.13], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);
  }

  function makeDivIcon(emoji, isFav) {
    return L.divIcon({
      html: `<span class="pin${isFav ? " pin-fav" : ""}">${emoji}</span>`,
      className: "spot-pin-wrap",
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -28],
    });
  }

  function buildCategoryChips() {
    const counts = {};
    spots.forEach((s) => {
      counts[s.category.key] = (counts[s.category.key] || 0) + 1;
    });
    const present = CATEGORIES.filter((c) => counts[c.key]);
    if (counts.other) present.push(OTHER_CATEGORY);

    const $all = $(
      `<button type="button" class="chip category-chip active" data-key="all">All <span class="chip-count">${spots.length}</span></button>`
    );
    $categoryRow.append($all);

    present.forEach((c) => {
      const $chip = $(
        `<button type="button" class="chip category-chip" data-key="${c.key}">${c.emoji} ${c.label} <span class="chip-count">${counts[c.key]}</span></button>`
      );
      $categoryRow.append($chip);
    });

    $categoryRow.on("click", ".category-chip", function () {
      activeCategory = $(this).data("key");
      $categoryRow.find(".category-chip").removeClass("active");
      $(this).addClass("active");
      render();
    });
  }

  function cardTemplate(spot, index) {
    const [lat, lng] = spot.location;
    const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const isFav = favorites.has(spot.id);
    const delay = Math.min(index * 0.05, 0.6).toFixed(2);

    return $(`
      <article class="spot-card" data-id="${spot.id}" style="animation-delay:${delay}s">
        <div class="card-stamp" title="${spot.category.label}">${spot.category.emoji}</div>
        <button class="fav-btn ${isFav ? "is-fav" : ""}" data-id="${spot.id}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}" aria-pressed="${isFav}">
          ${isFav ? "♥" : "♡"}
        </button>
        <h3 class="card-title">${spot.name}</h3>
        <p class="card-desc">${spot.description}</p>
        <div class="card-footer">
          <span class="card-category">${spot.category.label}</span>
          <div class="card-links">
            <button class="pill-btn locate-btn" data-id="${spot.id}" type="button">Find on map</button>
            <a class="pill-btn pill-btn-outline" href="${mapLink}" target="_blank" rel="noopener">Directions</a>
          </div>
        </div>
      </article>
    `);
  }

  function matchesFilters(spot) {
    if (activeCategory !== "all" && spot.category.key !== activeCategory) return false;
    if (favoritesOnly && !favorites.has(spot.id)) return false;
    if (searchTerm) {
      const hay = (spot.name + " " + spot.description).toLowerCase();
      if (!hay.includes(searchTerm)) return false;
    }
    return true;
  }

  function render() {
    const visible = spots.filter(matchesFilters);

    $cardsCol.empty();
    Object.values(markers).forEach((m) => map.removeLayer(m));
    markers = {};

    visible.forEach((spot, i) => {
      $cardsCol.append(cardTemplate(spot, i));

      const marker = L.marker(spot.location, { icon: makeDivIcon(spot.category.emoji, favorites.has(spot.id)) })
        .addTo(map)
        .bindPopup(`<strong>${spot.name}</strong><br>${spot.category.label}`);

      marker.on("click", () => highlightCard(spot.id));
      markers[spot.id] = marker;
    });

    $resultsCount.text(
      visible.length === spots.length
        ? `Showing all ${spots.length} spots`
        : `${visible.length} of ${spots.length} spots`
    );
    $emptyState.prop("hidden", visible.length !== 0);

    $favCount.text(favorites.size);
    $favToggle.attr("aria-pressed", String(favoritesOnly));
    $favToggle.toggleClass("active", favoritesOnly);
  }

  function highlightCard(id) {
    const $card = $(`.spot-card[data-id="${id}"]`);
    if (!$card.length) return;
    $card[0].scrollIntoView({ behavior: "smooth", block: "center" });
    $card.addClass("pulse");
    setTimeout(() => $card.removeClass("pulse"), 900);
  }

  function focusOnMap(id) {
    const spot = spots.find((s) => s.id === id);
    const marker = markers[id];
    if (!spot || !marker) return;
    map.flyTo(spot.location, 13, { duration: 0.8 });
    marker.openPopup();
  }

  function toggleFavorite(id) {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    saveFavorites(favorites);
    render();
  }

  function spinCompass(landingAngle) {
    const $needle = $(".compass-needle");
    // spin several full rotations, then settle on a "random" heading
    const spins = 3;
    const finalAngle = spins * 360 + landingAngle;
    $needle.css("transition", "none");
    $needle.css("transform", "rotate(0deg)");
    // force reflow so the transition below actually animates from 0
    $needle[0].getBoundingClientRect();
    $needle.css("transition", "transform 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)");
    $needle.css("transform", `rotate(${finalAngle}deg)`);
  }

  function surpriseMe() {
    const pool = spots.filter(matchesFilters);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];

    spinCompass(Math.floor(Math.random() * 360));

    setTimeout(() => {
      focusOnMap(pick.id);
      highlightCard(pick.id);
    }, 750);
  }

  // --- events ---
  $cardsCol.on("click", ".fav-btn", function (e) {
    e.stopPropagation();
    toggleFavorite($(this).data("id"));
  });

  $cardsCol.on("click", ".locate-btn", function () {
    focusOnMap($(this).data("id"));
  });

  $favToggle.on("click", function () {
    favoritesOnly = !favoritesOnly;
    render();
  });

  $search.on("input", function () {
    searchTerm = $(this).val().trim().toLowerCase();
    render();
  });

  $("#clear-filters-btn").on("click", function () {
    activeCategory = "all";
    favoritesOnly = false;
    searchTerm = "";
    $search.val("");
    $categoryRow.find(".category-chip").removeClass("active");
    $categoryRow.find('[data-key="all"]').addClass("active");
    render();
  });

  $("#surprise-btn").on("click", surpriseMe);

  // --- boot ---
  initMap();

  $.getJSON("data.json", function (data) {
    spots = data.map((spot, i) => ({
      ...spot,
      id: `spot-${i}`,
      category: categorize(spot),
    }));
    buildCategoryChips();
    render();
  }).fail(function () {
    $cardsCol.html('<p class="empty-state">Could not load spots data. Try refreshing the page.</p>');
  });
});
