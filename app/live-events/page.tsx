import BandsintownWidget from "../components/BandsintownWidget";
import EventPosterSlider from "../components/EventPosterSlider";
import SiteHeader from "../components/SiteHeader";

export default function LiveEventsPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="live-events-page">
        <section className="live-events-section live-events-standalone">
          <EventPosterSlider />
          <div className="live-events-inner">
            <header className="live-events-heading">
              <h1 className="live-events-title">
                Upcoming{" "}
                <span>Events</span>
              </h1>
              <div className="live-events-title-rule" aria-hidden="true" />
            </header>
            <BandsintownWidget />
          </div>
        </section>
      </main>
    </div>
  );
}
