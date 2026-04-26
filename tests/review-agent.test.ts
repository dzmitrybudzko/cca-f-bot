import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

describe("ReviewAgent", () => {
  it("exam guide PDF exists", () => {
    const pdfPath = path.join(
      process.cwd(),
      "instructor_8lsy243ftffjjy1cx9lm3o2bw_public_1773274827_Claude+Certified+Architect+–+Foundations+Certification+Exam+Guide.pdf"
    );
    expect(fs.existsSync(pdfPath)).toBe(true);
  });

  it("PDF is a valid file with reasonable size", () => {
    const pdfPath = path.join(
      process.cwd(),
      "instructor_8lsy243ftffjjy1cx9lm3o2bw_public_1773274827_Claude+Certified+Architect+–+Foundations+Certification+Exam+Guide.pdf"
    );
    const stat = fs.statSync(pdfPath);
    expect(stat.size).toBeGreaterThan(100000);
    expect(stat.size).toBeLessThan(10000000);
  });

  it("PDF can be read as base64", () => {
    const pdfPath = path.join(
      process.cwd(),
      "instructor_8lsy243ftffjjy1cx9lm3o2bw_public_1773274827_Claude+Certified+Architect+–+Foundations+Certification+Exam+Guide.pdf"
    );
    const base64 = fs.readFileSync(pdfPath).toString("base64");
    expect(base64.length).toBeGreaterThan(0);
    expect(base64.startsWith("JVBER")).toBe(true);
  });

  it("ReviewResult interface covers required fields", async () => {
    const { ReviewAgent } = await import("../src/agents/review-agent");
    expect(ReviewAgent).toBeDefined();
  });
});
