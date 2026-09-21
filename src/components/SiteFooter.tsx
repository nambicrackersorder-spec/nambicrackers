import { SHOP } from "@/config";
import { useSettings } from "@/lib/catalog-store";

export function SiteFooter() {
  const { settings } = useSettings();

  return (
    <footer className="surface-royal px-4 py-8 text-center">
      <p className="text-lg font-bold">{settings.name}</p>
      <p className="mx-auto mt-2 max-w-md text-sm opacity-85">{settings.address}</p>
      <p className="mt-2 text-sm opacity-85">
        <a href={`tel:+91${settings.phone}`}>{settings.phoneDisplay}</a> &middot;{" "}
        <a href={`mailto:${settings.email}`}>{settings.email}</a>
      </p>
      <p className="mt-4 text-xs opacity-70">
        As per Supreme Court order, online sale of firecrackers is not permitted. Orders placed here
        are treated as enquiries and completed as direct in-shop billing.
      </p>
    </footer>
  );
}
