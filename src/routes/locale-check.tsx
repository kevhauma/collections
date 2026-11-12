"use client";
import { Trans } from "@lingui/react/macro";
import { useActionState } from "react";
import { Button } from "../ui/button";
import { localeCheckAction } from "./home-actions";

// shortcut: placeholder client component proving client-side translation and a translated action result
// (TICKET-I18N-01). Delete it once a real client component and action exist.
export const LocaleCheck = () => {
  const [result, action] = useActionState(localeCheckAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <p>
        <Trans id="home.placeholder.client">Rendered by a client component.</Trans>
      </p>
      <Button size="sm" type="submit">
        <Trans id="home.placeholder.submit">Ask the server</Trans>
      </Button>
      <output>{result}</output>
    </form>
  );
};
