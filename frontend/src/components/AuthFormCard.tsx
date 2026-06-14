import type { FormEvent, ReactElement, ReactNode } from "react";

type AuthFormCardProps = {
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  error?: string | null;
  status?: string | null;
  submitLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
};

export function AuthFormCard({
  onSubmit,
  children,
  error,
  status,
  submitLabel,
  loadingLabel = "Please wait…",
  loading = false,
  submitDisabled = false,
}: AuthFormCardProps): ReactElement {
  return (
    <form onSubmit={onSubmit} className="vw-auth-card space-y-5" noValidate>
      {children}

      {error ? (
        <div className="vw-auth-alert vw-auth-alert-error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      ) : null}

      {status ? (
        <div className="vw-auth-alert vw-auth-alert-success" role="status">
          <CheckIcon />
          <span>{status}</span>
        </div>
      ) : null}

      <button
        type="submit"
        className="vw-btn-primary w-full py-3 text-[0.9375rem]"
        disabled={loading || submitDisabled}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            {loadingLabel}
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

export function AuthDivider({ label = "or continue with email" }: { label?: string }): ReactElement {
  return (
    <div className="vw-auth-divider" aria-hidden>
      <span className="h-px flex-1 bg-vw-border" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-vw-border" />
    </div>
  );
}

function Spinner(): ReactElement {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function AlertIcon(): ReactElement {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
