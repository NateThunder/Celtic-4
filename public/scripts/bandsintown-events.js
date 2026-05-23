(() => {
  const initializedRoots = new WeakSet();
  const PLACEHOLDER_APP_IDS = new Set(["MY_APP_ID", "YOUR_APP_ID"]);

  // Reusable helper for info/error/loading messages.
  const renderMessage = (root, message, className = "events-status") => {
    root.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = message;
    root.appendChild(paragraph);
  };

  // Format date/time in the visitor's local timezone.
  const formatLocalDateTime = (isoDateTime) => {
    const parsed = new Date(isoDateTime);
    if (Number.isNaN(parsed.getTime())) return "Date and time TBD";

    return `${new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed)} (local)`;
  };

  // Choose a ticket URL from offers first, then fall back to the event URL.
  const getTicketUrl = (event) => {
    if (Array.isArray(event?.offers)) {
      const offerWithUrl = event.offers.find(
        (offer) => typeof offer?.url === "string" && offer.url.trim().length > 0
      );
      if (offerWithUrl) return offerWithUrl.url;
    }

    if (typeof event?.url === "string" && event.url.trim().length > 0) {
      return event.url;
    }

    return null;
  };

  const renderFeaturedEvent = (root, events) => {
    if (!Array.isArray(events) || events.length === 0) {
      renderMessage(root, "No upcoming events available right now.");
      return;
    }

    const event = events[0];
    const venue = event?.venue?.name?.trim() || "Venue TBA";
    const city = event?.venue?.city?.trim() || "City TBA";
    const title = event?.title?.trim() || venue || "Celtic Worship Live";
    const ticketUrl = getTicketUrl(event);

    const card = document.createElement("article");
    card.className = "events-featured-card";

    const kicker = document.createElement("p");
    kicker.className = "events-featured-kicker";
    kicker.textContent = formatLocalDateTime(event?.datetime);

    const heading = document.createElement("h3");
    heading.className = "events-featured-title";
    heading.textContent = title;

    const location = document.createElement("p");
    location.className = "events-featured-location";
    location.textContent = `${venue} - ${city}`;

    const meta = document.createElement("div");
    meta.className = "events-featured-meta";
    meta.append(kicker, heading, location);
    card.appendChild(meta);

    if (ticketUrl) {
      const ticketLink = document.createElement("a");
      ticketLink.className = "events-ticket-link events-featured-ticket";
      ticketLink.href = ticketUrl;
      ticketLink.target = "_blank";
      ticketLink.rel = "noopener noreferrer";
      ticketLink.textContent = "Get Tickets";
      card.appendChild(ticketLink);
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = "events-ticket-unavailable events-featured-ticket";
      unavailable.textContent = "Tickets TBA";
      card.appendChild(unavailable);
    }

    root.innerHTML = "";
    root.appendChild(card);
  };

  // Render the events as plain HTML elements.
  const renderEvents = (root, events) => {
    if (root.dataset.layout === "featured") {
      renderFeaturedEvent(root, events);
      return;
    }

    if (!Array.isArray(events) || events.length === 0) {
      renderMessage(root, "No upcoming events available right now.");
      return;
    }

    const list = document.createElement("ul");
    list.className = "events-list";

    events.forEach((event) => {
      const listItem = document.createElement("li");
      listItem.className = "events-item";

      const meta = document.createElement("div");
      meta.className = "events-meta";

      const dateTime = document.createElement("p");
      dateTime.className = "events-datetime";
      dateTime.textContent = formatLocalDateTime(event?.datetime);

      const venue = event?.venue?.name?.trim() || "Venue TBA";
      const city = event?.venue?.city?.trim() || "City TBA";
      const venueAndCity = document.createElement("p");
      venueAndCity.className = "events-venue";
      venueAndCity.textContent = `${venue} - ${city}`;

      meta.append(dateTime, venueAndCity);
      listItem.appendChild(meta);

      const ticketUrl = getTicketUrl(event);
      if (ticketUrl) {
        const ticketLink = document.createElement("a");
        ticketLink.className = "events-ticket-link";
        ticketLink.href = ticketUrl;
        ticketLink.target = "_blank";
        ticketLink.rel = "noopener noreferrer";
        ticketLink.textContent = "Get Tickets";
        listItem.appendChild(ticketLink);
      } else {
        const unavailable = document.createElement("span");
        unavailable.className = "events-ticket-unavailable";
        unavailable.textContent = "Tickets TBA";
        listItem.appendChild(unavailable);
      }

      list.appendChild(listItem);
    });

    root.innerHTML = "";
    root.appendChild(list);
  };

  // Fetch upcoming events and handle all failure states gracefully.
  const loadEvents = async (root) => {
    // Read artist/app configuration from data attributes so this script stays reusable.
    const artistId = root.dataset.artistId || "849462";

    // Bandsintown widget convention: default app_id can be derived from the hostname.
    // This keeps the embed copy-paste friendly for any site.
    const fallbackAppId = `js_${window.location.hostname || "localhost"}`;
    const rawAppId = (root.dataset.appId || "").trim();
    const appIdCandidates = [];

    if (rawAppId && !PLACEHOLDER_APP_IDS.has(rawAppId.toUpperCase())) {
      appIdCandidates.push(rawAppId);
    }

    if (!appIdCandidates.includes(fallbackAppId)) {
      appIdCandidates.push(fallbackAppId);
    }

    if (!appIdCandidates.includes("js_localhost")) {
      appIdCandidates.push("js_localhost");
    }

    // Accept both "849462" and "id_849462" inputs.
    const normalizedArtistId = artistId.startsWith("id_") ? artistId : `id_${artistId}`;

    renderMessage(root, "Loading upcoming events...");

    let lastError = null;

    for (const appId of appIdCandidates) {
      // Build the required REST endpoint.
      const endpoint = `https://rest.bandsintown.com/V3.1/artists/${encodeURIComponent(
        normalizedArtistId
      )}/events/?app_id=${encodeURIComponent(appId)}`;

      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            lastError = new Error(`Bandsintown request failed (${response.status}) for app_id ${appId}.`);
            continue;
          }

          throw new Error(`Bandsintown request failed (${response.status}).`);
        }

        const payload = await response.json();
        if (payload && !Array.isArray(payload) && typeof payload.error === "string") {
          const payloadError = payload.error.toLowerCase();
          if (payloadError.includes("app_id") || payloadError.includes("authorized")) {
            lastError = new Error(payload.error);
            continue;
          }

          throw new Error(payload.error);
        }

        renderEvents(root, Array.isArray(payload) ? payload : []);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    console.error("Failed to load Bandsintown events:", lastError);
    renderMessage(
      root,
      "Unable to load events right now. Please try again later.",
      "events-status events-status-error"
    );
  };

  const initRoot = (root) => {
    if (!root || initializedRoots.has(root)) return;
    initializedRoots.add(root);
    loadEvents(root);
  };

  const findAndInit = () => {
    initRoot(document.getElementById("bandsintown-events"));
  };

  findAndInit();

  // In App Router, route transitions are client-side. Observe the DOM so
  // this can initialize when /live-events is mounted after navigation.
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      findAndInit();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
