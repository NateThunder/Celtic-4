(() => {
  // Find the container that will hold the custom Bandsintown output.
  const root = document.getElementById("bandsintown-events");
  if (!root) return;

  // Read artist/app configuration from data attributes so this script stays reusable.
  const artistId = root.dataset.artistId || "849462";

  // Bandsintown widget convention: default app_id can be derived from the hostname.
  // This keeps the embed copy-paste friendly for any site.
  const fallbackAppId = `js_${window.location.hostname || "localhost"}`;
  const rawAppId = (root.dataset.appId || "").trim();
  const appId = rawAppId && rawAppId !== "MY_APP_ID" ? rawAppId : fallbackAppId;

  // Accept both "849462" and "id_849462" inputs.
  const normalizedArtistId = artistId.startsWith("id_") ? artistId : `id_${artistId}`;

  // Build the required REST endpoint.
  const endpoint = `https://rest.bandsintown.com/V3.1/artists/${encodeURIComponent(
    normalizedArtistId
  )}/events/?app_id=${encodeURIComponent(appId)}`;

  // Reusable helper for info/error/loading messages.
  const renderMessage = (message, className = "events-status") => {
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

  // Render the events as plain HTML elements.
  const renderEvents = (events) => {
    if (!Array.isArray(events) || events.length === 0) {
      renderMessage("No upcoming events available right now.");
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
  const loadEvents = async () => {
    renderMessage("Loading upcoming events...");

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Bandsintown request failed (${response.status}).`);
      }

      const payload = await response.json();

      if (payload && !Array.isArray(payload) && typeof payload.error === "string") {
        throw new Error(payload.error);
      }

      renderEvents(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error("Failed to load Bandsintown events:", error);
      renderMessage(
        "Unable to load events right now. Please try again later.",
        "events-status events-status-error"
      );
    }
  };

  loadEvents();
})();
