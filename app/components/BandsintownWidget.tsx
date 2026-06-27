type BandsintownWidgetProps = {
  variant?: "featured" | "full" | "home";
};

const ARTIST_ID = "id_849462";
const ARTIST_NUMERIC_ID = "849462";
const DEFAULT_APP_ID = "js_celticworship.co.uk";

export default function BandsintownWidget({
  variant = "full",
}: BandsintownWidgetProps) {
  const isFeatured = variant === "featured";
  const isHome = variant === "home";
  const appId = process.env.NEXT_PUBLIC_BANDSINTOWN_APP_ID?.trim() || DEFAULT_APP_ID;

  if (isHome) {
    return (
      <div className="bandsintown-widget-shell bandsintown-widget-shell--home">
        <div
          id="bandsintown-events"
          data-artist-id={ARTIST_NUMERIC_ID}
          data-app-id={appId}
          aria-live="polite"
        >
          <p className="events-status">Loading upcoming events...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bandsintown-widget-shell${
        isFeatured ? " bandsintown-widget-shell--featured" : ""
      }`}
    >
      <a
        className="bit-widget-initializer"
        data-artist-name={ARTIST_ID}
        data-app-id={appId}
        data-affil-code={appId}
        data-background-color="transparent"
        data-separator-color={isHome ? "rgba(247,234,216,0.28)" : "rgba(21,19,15,0.18)"}
        data-text-color={isHome ? "#f7ead8" : "#171512"}
        data-font="Helvetica"
        data-auto-style="false"
        data-display-local-dates="false"
        data-display-past-dates="false"
        data-display-details="false"
        data-display-lineup="false"
        data-display-start-time="false"
        data-display-limit={isFeatured ? "1" : "all"}
        data-date-format="MMM D, YYYY"
        data-date-orientation="horizontal"
        data-date-border-color={isHome ? "#f7ead8" : "#cf8a22"}
        data-date-border-width="1px"
        data-date-border-radius="0px"
        data-event-ticket-cta-size="medium"
        data-event-ticket-text="Tickets"
        data-event-ticket-icon="false"
        data-event-ticket-cta-text-color={isHome ? "#f7ead8" : "#11100d"}
        data-event-ticket-cta-bg-color={isHome ? "#1261c9" : "#c97b12"}
        data-event-ticket-cta-border-color={isHome ? "#1261c9" : "#c97b12"}
        data-event-ticket-cta-border-width="1px"
        data-event-ticket-cta-border-radius="0px"
        data-sold-out-button-text-color="#f4efe4"
        data-sold-out-button-background-color="#6f6759"
        data-sold-out-button-border-color="#6f6759"
        data-sold-out-button-clickable="false"
        data-event-rsvp-position="hidden"
        data-event-rsvp-cta-size="medium"
        data-follow-section-position="hidden"
        data-play-my-city-position="hidden"
        data-display-logo="false"
        data-language="en"
        data-layout-breakpoint="900"
      >
        Loading upcoming events...
      </a>
    </div>
  );
}
