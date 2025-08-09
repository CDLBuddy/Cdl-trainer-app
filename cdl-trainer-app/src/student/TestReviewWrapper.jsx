import React from "react";
const TestReview = React.lazy(() => import("./TestReview.jsx").catch(() => ({ default: () => <div>Test Review coming soon…</div> })));
export default function TestReviewWrapper(){ return <React.Suspense fallback={<div>Loading review…</div>}><TestReview/></React.Suspense>; }
