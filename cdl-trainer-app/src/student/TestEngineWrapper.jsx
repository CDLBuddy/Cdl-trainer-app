import React from "react";
const TestEngine = React.lazy(() => import("./TestEngine.jsx").catch(() => ({ default: () => <div>Test Engine coming soon…</div> })));
export default function TestEngineWrapper(){ return <React.Suspense fallback={<div>Loading test engine…</div>}><TestEngine/></React.Suspense>; }
