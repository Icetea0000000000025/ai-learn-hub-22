import { createServerFn } from "@tanstack/react-start";

export const testFn = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: { foo: string } }) => {
    return ctx.data.foo;
  },
);
