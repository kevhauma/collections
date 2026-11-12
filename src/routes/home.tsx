import { useLingui } from "@lingui/react/macro";

// Placeholder public home, replaced by the public index of collections in TICKET-PUB-01.
export default function Home() {
  const { t } = useLingui();
  const appName = t({ id: "app.name", message: "Collections" });
  return (
    <>
      <title>{appName}</title>
      <h1>{appName}</h1>
    </>
  );
}
