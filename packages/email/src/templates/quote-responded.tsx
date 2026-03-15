import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface QuoteRespondedEmailProps {
  adminName: string;
  clientName: string;
  quoteTitle: string;
  projectName: string;
  decision: "accepted" | "declined";
  note?: string;
  dashboardUrl: string;
}

export function QuoteRespondedEmail({
  adminName,
  clientName,
  quoteTitle,
  projectName,
  decision,
  note,
  dashboardUrl,
}: QuoteRespondedEmailProps) {
  const verb = decision === "accepted" ? "accepted" : "declined";
  const colour = decision === "accepted" ? "#12B388" : "#ef4444";

  return (
    <Html>
      <Head />
      <Preview>
        {clientName} {verb} quote: {quoteTitle}
      </Preview>
      <Body style={{ fontFamily: "'Inter', sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            Quote {verb.charAt(0).toUpperCase() + verb.slice(1)}
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {adminName}, <strong>{clientName}</strong> has{" "}
            <span style={{ color: colour, fontWeight: 600 }}>{verb}</span> the
            quote <strong>{quoteTitle}</strong> on project{" "}
            <strong>{projectName}</strong>.
          </Text>
          {note && (
            <Text
              style={{
                fontSize: "14px",
                lineHeight: "22px",
                color: "#374151",
                backgroundColor: "#f3f4f6",
                padding: "12px 16px",
                borderRadius: "6px",
              }}
            >
              <strong>Client note:</strong> {note}
            </Text>
          )}
          <Link
            href={dashboardUrl}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#12B388",
              color: "#ffffff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "16px",
              marginTop: "16px",
            }}
          >
            View in Dashboard
          </Link>
          <Text
            style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}
          >
            You are receiving this email because you are an administrator of
            this organisation.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
