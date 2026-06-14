import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPortalCsat, submitPortalCsat } from "../api/client";
import { usePageTitle } from "../hooks/usePageTitle";

export function PortalCsatPage(): ReactElement {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Awaited<ReturnType<typeof fetchPortalCsat>> | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle("Rate your support experience");

  useEffect(() => {
    if (!token) return;
    fetchPortalCsat(token)
      .then(setInfo)
      .catch(() => setError("Survey link is invalid or expired."));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await submitPortalCsat(token, { rating, comment: comment || undefined });
    setDone(true);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
        <p className="text-vw-danger">{error}</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
        <p className="text-vw-muted">Loading…</p>
      </div>
    );
  }

  if (info.alreadyResponded || done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
        <div className="vw-panel max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-vw-headline">Thank you!</h1>
          <p className="mt-2 text-sm text-vw-muted">Your feedback helps us improve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-vw-bg p-6">
      <form onSubmit={(e) => void handleSubmit(e)} className="vw-panel w-full max-w-md space-y-5 p-8">
        <div>
          <h1 className="text-xl font-semibold text-vw-headline">How did we do?</h1>
          <p className="mt-2 text-sm text-vw-muted">
            Your feedback on ticket #{info.ticketNumber} helps us improve support for everyone.
          </p>
          <p className="mt-1 text-sm text-vw-fg-soft">{info.subject}</p>
        </div>
        <div>
          <label className="vw-field-label">Rating (1–5)</label>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`h-10 w-10 rounded-full border ${
                  rating === n
                    ? "border-vw-accent bg-vw-accent text-vw-accent-fg"
                    : "border-vw-border text-vw-muted"
                }`}
                onClick={() => setRating(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="vw-field-label" htmlFor="csat-comment">
            Comments (optional)
          </label>
          <textarea
            id="csat-comment"
            rows={3}
            className="vw-input mt-2"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <button type="submit" className="vw-btn-primary w-full">
          Submit feedback
        </button>
        <p className="text-center text-sm text-vw-muted">
          <Link to="/help/rate-your-experience" className="text-vw-accent hover:text-vw-accent-hover">
            About this survey
          </Link>
        </p>
      </form>
    </div>
  );
}
