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

interface DecisionCreatedEmailProps {
  clientName: string;
  decisionTitle: string;
  projectName: string;
  description?: string;
  portalUrl: string;
}

export function DecisionCreatedEmail({
  clientName,
  decisionTitle,
  projectName,
  description,
  portalUrl,
}: DecisionCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Decision needed on {projectName}: {decisionTitle}
      </Preview>
      <Body style={{ fontFamily: "'Inter', sans-serif", padding: "40px 0" }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Heading style={{ fontSize: "24px", marginBottom: "24px" }}>
            Your Input Is Needed
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px" }}>
            {clientName}, a decision has been added to{" "}
            <strong>{projectName}</strong> that needs your input:{" "}
            <strong>{decisionTitle}</strong>
          </Text>
          {description && (
            <Text style={{ fontSize: "14px", color: "#374151", lineHeight: "22px" }}>
              {description}
            </Text>
          )}
          <Link
            href={portalUrl}
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
            View Decision
          </Link>
          <Text
            style={{ fontSize: "14px", color: "#6b7280", marginTop: "24px" }}
          >
            You are receiving this email because you are a client on this
            project.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
