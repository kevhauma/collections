import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

const body = (csv: string) => csv.slice(1);

describe("toCsv", () => {
  it("starts with a UTF-8 BOM and ends every row with CRLF", () => {
    const csv = toCsv([["Title", "Year"], ["Café Olé", "1959"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(body(csv)).toBe("Title,Year\r\nCafé Olé,1959\r\n");
  });

  it("quotes cells with commas, quotes or newlines, doubling the quotes", () => {
    expect(body(toCsv([["a,b", 'say "hi"', "two\nlines", "cr\rhere", "plain"]]))).toBe(
      '"a,b","say ""hi""","two\nlines","cr\rhere",plain\r\n',
    );
  });

  it("defuses cells that start like a formula", () => {
    expect(body(toCsv([["=SUM(A1)", "+1", "-5", "@cmd", "a=b"]]))).toBe("'=SUM(A1),'+1,'-5,'@cmd,a=b\r\n");
    expect(body(toCsv([['=HYPERLINK("x")']]))).toBe(`"'=HYPERLINK(""x"")"\r\n`);
  });

  it("keeps empty values as empty cells", () => {
    expect(body(toCsv([["", "x", ""]]))).toBe(",x,\r\n");
  });
});
