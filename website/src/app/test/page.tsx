"use client";

import { LandingRendererComponent } from "../renderer";

export default function TestPage() {
    return (
        <main className="w-screen h-screen">
            <LandingRendererComponent postProcessVisible={false} />
        </main>
    );
}
