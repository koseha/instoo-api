import { Transform } from "class-transformer";

// common/decorators/trim.decorator.ts
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value));
