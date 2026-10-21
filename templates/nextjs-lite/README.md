This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app), rendering the scenes made with the Babylon.js Editor using [Babylon Lite](https://doc.babylonjs.com/lite/).

## Babylon Lite

The scenes are loaded by `babylonjs-editor-tools-lite`, the Babylon Lite version of `babylonjs-editor-tools`:

- Babylon Lite renders using WebGPU only: the browser must support WebGPU.
- The only supported compressed textures are the KTX2 textures.
- The scripts attached to the objects in the editor use the Babylon Lite API (see `src/scripts/box.ts`).
- The features of Babylon.js that Babylon Lite doesn't support are listed in the `MISSING_FEATURES.md` file of the `babylonjs-editor-tools-lite` package.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

To learn more about Babylon Lite, take a look at [the Babylon Lite documentation](https://doc.babylonjs.com/lite/).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
