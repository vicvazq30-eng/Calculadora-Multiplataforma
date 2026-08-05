"use client";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f7f9fc",
        color: "#26313d",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "32px",
          background: "#ffffff",
          border: "1px solid #e6ebf1",
          borderRadius: "18px",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>HQS Energy</h1>
        <p style={{ marginTop: "12px", color: "#7a8797" }}>
          Calculadora multiplataforma
        </p>
      </section>
    </main>
  );
}
