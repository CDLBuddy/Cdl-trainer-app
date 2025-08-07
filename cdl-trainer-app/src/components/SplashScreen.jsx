export default function SplashScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh" }}>
      <div className="spinner" style={{ marginBottom: 24 }} />
      <h2>Loading CDL Trainer…</h2>
    </div>
  );
}