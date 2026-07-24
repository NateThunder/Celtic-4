import Image from "next/image";
import Link from "next/link";
import type { HomeEvent } from "../lib/events";

// The three background photos, laid side by side and cross-faded into one
// continuous, heavily-dimmed atmospheric band behind the section.
const BAND_PHOTOS = [
  { src: "/photos/crowd-bw.jpg", className: "home-events-band-photo--a" },
  { src: "/photos/guitarist-gold.jpg", className: "home-events-band-photo--b" },
  { src: "/photos/side-stage.jpg", className: "home-events-band-photo--c" },
];

function EventCard({ event }: { event: HomeEvent }) {
  return (
    <article className="event-card">
      <div className="event-card-media">
        <Image
          src={event.poster}
          alt={`${event.venueName}, ${event.city} — ${event.dateLabel}`}
          fill
          sizes="(max-width: 700px) 86vw, (max-width: 1100px) 44vw, 23vw"
          className="event-card-poster"
        />
      </div>
      <div className="event-card-body">
        <p className="event-card-date">{event.dateLabel}</p>
        <p className="event-card-venue">{event.venueName}</p>
        {event.city ? <p className="event-card-city">{event.city}</p> : null}
        {event.ticketUrl ? (
          <a
            className="event-card-cta"
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Tickets
          </a>
        ) : (
          <span className="event-card-cta event-card-cta--disabled">
            Tickets Soon
          </span>
        )}
      </div>
    </article>
  );
}

export default function HomeEvents({ events }: { events: HomeEvent[] }) {
  const visibleEvents = events.slice(0, 4);
  return (
    <section
      id="live-events"
      className="home-events-section"
      aria-label="Upcoming live events"
    >
      {/* Full-bleed band of band photography, blended into one image and
          dimmed to a dark atmospheric wash, sitting behind the section. */}
      <div className="home-events-band" aria-hidden="true">
        <div className="home-events-band-photos">
          {BAND_PHOTOS.map((photo) => (
            <div
              key={photo.src}
              className={`home-events-band-photo ${photo.className}`}
              style={{ backgroundImage: `url("${photo.src}")` }}
            />
          ))}
        </div>
        <div className="home-events-band-overlay" />
      </div>

      <div className="home-events-inner">
        <div className="home-events-header">
          <h2 className="live-events-title">
            Upcoming <span>Events</span>
          </h2>
          <Link className="home-events-link" href="/live-events">
            View All Events
          </Link>
        </div>

        {visibleEvents.length > 0 ? (
          <ul className="home-events-row">
            {visibleEvents.map((event) => (
              <li key={event.id} className="home-events-row-item">
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-events-empty">
            No upcoming events right now — check back soon.
          </p>
        )}
      </div>
    </section>
  );
}
