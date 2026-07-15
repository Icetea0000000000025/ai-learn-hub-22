import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const testFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    foo: z.string(),
  }))
  .handler(async (ctx) => {
    return ctx.data.foo;
  });
