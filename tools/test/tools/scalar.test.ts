import { getPowerOfTwoUntil } from "../../src/tools/scalar";

describe("tools/scalar", () => {
    describe("getPowerOfTwoUntil", () => {
        test("should return a boolean indicated if the passed object is a mesh or not", () => {
            expect(getPowerOfTwoUntil(1)).toBe(1);
            expect(getPowerOfTwoUntil(2)).toBe(2);
            expect(getPowerOfTwoUntil(4)).toBe(4);
            expect(getPowerOfTwoUntil(2000)).toBe(1024);
            expect(getPowerOfTwoUntil(2500)).toBe(2048);
        });
    });
});
