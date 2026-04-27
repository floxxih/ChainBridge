import { interpolateCount, selectPlural } from "@/lib/i18n/config";

describe("selectPlural", () => {
  it("picks one vs other for English", () => {
    const forms = { one: "{count} item", other: "{count} items" };
    expect(interpolateCount(selectPlural("en", 1, forms), 1)).toBe("1 item");
    expect(interpolateCount(selectPlural("en", 3, forms), 3)).toBe("3 items");
  });
});
