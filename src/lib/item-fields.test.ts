import { describe, expect, it } from "vitest";

import { typeSpecificPayload } from "@/lib/item-fields";

const values = { content: "body", url: "https://x.dev", language: "ts" };

describe("typeSpecificPayload", () => {
  it("includes only content for a text item", () => {
    expect(
      typeSpecificPayload(
        { showContent: true, showUrl: false, showLanguage: false, isCode: false },
        values,
      ),
    ).toEqual({ content: "body" });
  });

  it("includes content + language for a code item", () => {
    expect(
      typeSpecificPayload(
        { showContent: true, showUrl: false, showLanguage: true, isCode: true },
        values,
      ),
    ).toEqual({ content: "body", language: "ts" });
  });

  it("includes only url for a link item", () => {
    expect(
      typeSpecificPayload(
        { showContent: false, showUrl: true, showLanguage: false, isCode: false },
        values,
      ),
    ).toEqual({ url: "https://x.dev" });
  });

  it("omits every type-specific field for a file item (all flags off)", () => {
    expect(
      typeSpecificPayload(
        { showContent: false, showUrl: false, showLanguage: false, isCode: false },
        values,
      ),
    ).toEqual({});
  });

  it("omits keys entirely rather than sending empty strings (leaves them untouched)", () => {
    const payload = typeSpecificPayload(
      { showContent: false, showUrl: false, showLanguage: false, isCode: false },
      { content: "", url: "", language: "" },
    );
    expect("content" in payload).toBe(false);
    expect("url" in payload).toBe(false);
    expect("language" in payload).toBe(false);
  });
});
