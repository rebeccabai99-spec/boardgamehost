# TableMaster Quick Questions MVP

TableMaster is a mobile-first board-game rules assistant. This prototype keeps the existing Play Along demo mocked and connects Quick Questions to the official Catan rulebook through a server-side OpenAI call.

## Local development

1. Copy `.env.example` to `.env`.
2. Put your OpenAI API key in `OPENAI_API_KEY`.
3. Run `pnpm install` and `pnpm dev`.
4. Open the Vite URL, choose **Quick Questions**, then choose **Catan**.

The API key is read only by the Vite server/API function and is never exposed through `VITE_` variables or frontend code.

## Deploy to Vercel

1. Import this GitHub repository in Vercel.
2. Add `OPENAI_API_KEY` in **Project Settings → Environment Variables**.
3. Optionally set `OPENAI_MODEL` (the default is `gpt-5-nano`).
4. Deploy. `vercel.json` builds the Vite frontend and publishes `api/chat.ts` as `/api/chat`.

Quick Questions currently supports only `gameId: "catan"`. Other games return a friendly unavailable-rulebook response without calling OpenAI.
