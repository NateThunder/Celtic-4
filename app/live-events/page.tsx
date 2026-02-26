import SiteHeader from "../components/SiteHeader";

export default function LiveEventsPage() {
  const bandsintownAppId = process.env.NEXT_PUBLIC_BANDSINTOWN_APP_ID?.trim() || "js_localhost";

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="live-events-page">
        <section className="live-events-section live-events-standalone">
          <div className="live-events-inner">
            <h1 className="live-events-title">Upcoming Events</h1>
            <div
              id="bandsintown-events"
              data-artist-id="849462"
              data-app-id={bandsintownAppId}
              aria-live="polite"
            >
              <p className="events-status">Loading upcoming events...</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
