import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { api, fetchSlaPolicies } from "../api/client";
import type { SlaPolicy } from "../types";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}

export function SlaSettingsPage(): ReactElement {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [name, setName] = useState("");
  const [firstResponseMinutes, setFirstResponseMinutes] = useState(240);
  const [resolutionMinutes, setResolutionMinutes] = useState(1440);

  const load = () => {
    void fetchSlaPolicies().then(setPolicies);
  };

  useEffect(load, []);

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/v1/sla-policies", {
      name,
      firstResponseMinutes,
      resolutionMinutes,
    });
    setName("");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-vw-headline">SLA policies</h1>
        <p className="mt-1 text-sm text-vw-muted">
          Define first-response and resolution targets. Breaches are flagged on tickets automatically.
        </p>
      </div>

      <div className="vw-panel overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-vw-table-head text-vw-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Policy</th>
              <th className="px-5 py-3 font-medium">First response</th>
              <th className="px-5 py-3 font-medium">Resolution</th>
              <th className="px-5 py-3 font-medium">Default</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className="border-t border-vw-border-faint">
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
