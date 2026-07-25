"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HomeEvent } from "../lib/events";

export default function HomeEvents({ events }: { events: HomeEvent[] }) {
  const visibleEvents = events.slice(0, 4);
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  return (
    <section
      id="live-events"
      className="home-events-section"
      aria-label="Upcoming live events"
    >
      <div className="home-events-noise" aria-hidden="true" />

      <div className="home-events-inner" data-home-reveal>
        <div className="home-events-header">
          <h2 className="live-events-title">
            Upcoming <span>Events</span>
          </h2>
          <Link className="home-events-link" href="/live-events">
            View All Events
          </Link>
        </div>

        {visibleEvents.length > 0 ? (
          <div className="home-events-feature">
            <div className="home-events-poster-stage" aria-live="polite">
              {visibleEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="home-events-featured-poster"
                  style={{ transform: `translateX(${(index - activeEventIndex) * 104}%)` }}
                  aria-hidden={index !== activeEventIndex}
                >
                  <Image
                    src={event.poster}
                    alt={`${event.venueName}, ${event.city} — ${event.dateLabel}`}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 800px) 92vw, 46vw"
                    className="home-events-featured-poster-image"
                  />
                </div>
              ))}
            </div>

            <ul className="home-events-list" aria-label="Upcoming gigs">
              {visibleEvents.map((event, index) => (
                <li
                  key={event.id}
                  className={`home-events-list-item${index === activeEventIndex ? " is-active" : ""}`}
                  onMouseEnter={() => setActiveEventIndex(index)}
                  onFocus={() => setActiveEventIndex(index)}
                  tabIndex={0}
                >
                  <div className="home-events-list-date">{event.dateLabel}</div>
                  <div className="home-events-list-place">
                    <h3>{event.venueName}</h3>
                    {event.city ? <p>{event.city}</p> : null}
                  </div>
                  {event.ticketUrl ? (
                    <a
                      className="home-events-list-ticket"
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Tickets
                    </a>
                  ) : (
                    <span className="home-events-list-ticket is-disabled">Soon</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="home-events-empty">
            No upcoming events right now — check back soon.
          </p>
        )}
      </div>
    </section>
  );
}
