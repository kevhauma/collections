import { Badge } from "../ui/badge";
import { Button, LinkButton } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox, RadioGroup } from "../ui/choice";
import { Dialog } from "../ui/dialog";
import { EmptyState } from "../ui/empty-state";
import { FormField } from "../ui/form-field";
import { Input, Select, Textarea } from "../ui/input";
import { Popover } from "../ui/popover";
import { PostIt } from "../ui/post-it";
import { TabLinks } from "../ui/tab-links";
import { Table, Td, Th } from "../ui/table";

// Placeholder home route (TICKET-PLAT-02), replaced by the public index in TICKET-PUB-01.
// shortcut: it also mounts every src/ui component for UI-01's live browser check (deliberately no showcase page);
// delete each usage once a real screen uses that component.
const rows = [
  { rank: 1, title: "Example item A", note: "placeholder", color: "yellow", top: true },
  { rank: 2, title: "Example item B", note: "placeholder", color: "pink", top: false },
  { rank: 3, title: "Example item C", note: "placeholder", color: "green", top: false },
] as const;

export default function Home() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <h1>Collections</h1>
        <TabLinks
          label="Placeholder tabs"
          tabs={[
            { href: "/?tab=have", label: "Have" },
            { href: "/", label: "Want", current: true },
          ]}
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button popoverTarget="placeholder-popover">Popover</Button>
          <Button commandfor="placeholder-dialog" command="show-modal">
            Dialog
          </Button>
          <LinkButton href="/" variant="primary">
            + Add item
          </LinkButton>
        </div>
      </div>

      <div className="grid items-start gap-x-8 gap-y-10 lg:grid-cols-[1.6fr_1fr]">
        <Card heading="Table (placeholder)">
          <Table>
            <thead>
              <tr>
                <Th sort={{ href: "/?sort=rank&dir=desc", direction: "ascending" }}>Rank</Th>
                <Th>Image</Th>
                <Th sort={{ href: "/?sort=title", direction: "none" }}>Title</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rank}>
                  <Td className="font-hand text-4xl leading-none text-red-pen">{row.rank}</Td>
                  <Td>
                    <PostIt color={row.color} tilt={row.top ? "left" : "right"} fastening={row.top ? "tape" : "pin"} />
                  </Td>
                  <Td className="font-bold">{row.top ? <span className="highlighted px-1">{row.title}</span> : row.title}</Td>
                  <Td className="text-ink-soft">{row.note}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <EmptyState title="Nothing here yet" action={<Button size="sm">+ Add the first one</Button>}>
            The empty state, shown when a list has no items.
          </EmptyState>
        </Card>

        <Card heading="Form (placeholder)" tone="ink">
          <form className="grid gap-4">
            <FormField id="ph-title" label="Title" hint="A hint under the control.">
              {(control) => <Input {...control} name="title" placeholder="Example item" />}
            </FormField>
            <FormField id="ph-year" label="Year" error="An error, announced with the field.">
              {(control) => <Input {...control} name="year" inputMode="numeric" defaultValue="19x9" />}
            </FormField>
            <FormField id="ph-kind" label="Kind">
              {(control) => (
                <Select {...control} name="kind" defaultValue="b">
                  <option value="a">Option A</option>
                  <option value="b">Option B</option>
                </Select>
              )}
            </FormField>
            <FormField id="ph-notes" label="Notes">
              {(control) => <Textarea {...control} name="notes" />}
            </FormField>
            <Checkbox name="public" label="Public" defaultChecked />
            <RadioGroup
              legend="Status"
              name="status"
              defaultValue="want"
              options={[
                { value: "have", label: "Have" },
                { value: "want", label: "Want" },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" type="submit">
                Save
              </Button>
              <Button size="sm" type="reset">
                Small
              </Button>
              <Button size="sm" disabled>
                Disabled
              </Button>
            </div>
          </form>
        </Card>

        <Card heading="Badges and post-its (placeholder)">
          <div className="flex flex-wrap gap-2">
            <Badge>Outline</Badge>
            <Badge variant="highlight">Highlight</Badge>
            <Badge variant="pencil">Pencil</Badge>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <PostIt size="md" color="blue" fastening="tape" />
            <PostIt size="md" color="green" tilt="right" />
            <PostIt size="lg" color="pink" tilt="right">
              <span className="font-hand text-3xl leading-none">a big note</span>
            </PostIt>
          </div>
        </Card>
      </div>

      <Popover id="placeholder-popover">
        <p>Popover content (placeholder).</p>
      </Popover>
      <Dialog id="placeholder-dialog" title="Dialog (placeholder)" closeLabel="Close">
        <p>Opened without JavaScript via invoker commands.</p>
      </Dialog>
    </main>
  );
}
