import type { ReactElement } from "react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAsyncData } from "../hooks/useAsyncData";
import { api, fetchSlaPolicies } from "../api/client";
import type { SlaPolicy } from "../types";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}

export function SlaSettingsPage(): ReactElement {
  usePageTitle("SLA policies");
  const [name, setName] = useState("");
  const [firstResponseMinutes, setFirstResponseMinutes] = useState(240);
  const [resolutionMinutes, setResolutionMinutes] = useState(1440);
  const { data: policies, reload } = useAsyncData(() => fetchSlaPolicies(), []);

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/v1/sla-policies", {
      name,
      firstResponseMinutes,
      resolutionMinutes,
    });
    setName("");
    reload();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="SLA policies"
        description="Set first-response and resolution time targets. The breach checker runs every minute and flags overdue tickets in the queue and dashboard."
      />

      <div className="vw-panel overflow-hidden">
        <ul className="vw-table-mobile">
          {(policies ?? []).map((policy: SlaPolicy) => (
            <li key={policy.id} className="space-y-2 p-4">
              <p className="font-medium text-vw-headline">{policy.name}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-vw-muted">First response</p>
                  <p className="text-vw-fg-soft">{formatMinutes(policy.firstResponseMinutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-vw-muted">Resolution</p>
                  <p className="text-vw-fg-soft">{formatMinutes(policy.resolutionMinutes)}</p>
                </div>
              </div>
              <p className="text-xs text-vw-muted">
                Default: {policy.isDefault ? "Yes" : "No"}
              </p>
            </li>
          ))}
        </ul>
        <div className="vw-table-desktop">
          <table className="min-w-full text-left text-sm">
            <thead className="vw-table-head">
              <tr>
                <th className="px-5 py-3">Policy</th>
                <th className="px-5 py-3">First response</th>
                <th className="px-5 py-3">Resolution</th>
                <th className="px-5 py-3">Default</th>
              </tr>
            </thead>
            <tbody>
              {(policies ?? []).map((policy: SlaPolicy) => (
                <tr key={policy.id} className="vw-table-row">
                  <td className="px-5 py-3 font-medium text-vw-fg">{policy.name}</td>
                  <td className="px-5 py-3 text-vw-fg-soft">
                    {formatMinutes(policy.firstResponseMinutes)}
                  </td>
                  <td className="px-5 py-3 text-vw-fg-soft">
                    {formatMinutes(policy.resolutionMinutes)}
                  </td>
                  <td className="px-5 py-3 text-vw-muted">{policy.isDefault ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={(e) => void createPolicy(e)} className="vw-panel space-y-4 p-6">
        <h2 className="text-lg font-medium text-vw-headline">New SLA policy</h2>
        <label className="vw-field-label">
          Name
          <input className="vw-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="vw-field-label">
            First response (minutes)
            <input
              className="vw-input"
              type="number"
              min={1}
              value={firstResponseMinutes}
              onChange={(e) => setFirstResponseMinutes(Number(e.target.value))}
            />
          </label>
          <label className="vw-field-label">
            Resolution (minutes)
            <input
              className="vw-input"
              type="number"
              min={1}
              value={resolutionMinutes}
              onChange={(e) => setResolutionMinutes(Number(e.target.value))}
            />
          </label>
        </div>
        <button type="submit" className="vw-btn-primary">
          Create policy
        </button>
      </form>
    </div>
  );
}
