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

interface DecisionRespondedEmailProps {
  adminName: string;
  clientName: string;
  decisionTitle: string;
  projectName: string;
  responsePreview?: string;
  dashboardUrl: string;
}

export function DecisionRespondedEmail({
  adminName,
  clientName,
  decisionTitle,
  projectName,
  responsePreview,
  dashboardUrl,
}: DecisionRespondedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {clientName} responded to: {decisionTitle}
      </Preview>
      <Body style={{ fontFamily: "'Inter', sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            Decision Response Received
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {adminName}, <strong>{clientName}</strong> has responded to the
            decision <strong>{decisionTitle}</strong> on project{" "}
            <strong>{projectName}</strong>.
          </Text>
          {responsePreview && (
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
              <strong>Response:</strong> {responsePreview}
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
