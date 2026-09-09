export interface SubmissionProps {
  id: string;
  attemptId: string;
  assumptions: string;
  classDesign: string;
  explanation: string;
  code: string;
  submittedAt?: Date;
}

export class Submission {
  public readonly id: string;
  public readonly attemptId: string;
  public readonly assumptions: string;
  public readonly classDesign: string;
  public readonly explanation: string;
  public readonly code: string;
  public readonly submittedAt: Date;

  constructor(props: SubmissionProps) {
    if (!props.id) throw new Error("Submission id is required.");
    if (!props.attemptId) throw new Error("Submission attemptId is required.");

    this.id = props.id;
    this.attemptId = props.attemptId;
    this.assumptions = props.assumptions || "";
    this.classDesign = props.classDesign || "";
    this.explanation = props.explanation || "";
    this.code = props.code || "";
    this.submittedAt = props.submittedAt || new Date();
  }

  validateCompleteness(): { isValid: boolean; missingSections: string[] } {
    const missing: string[] = [];
    if (!this.assumptions.trim()) missing.push("Assumptions & High-Level Strategy");
    if (!this.classDesign.trim()) missing.push("Class Architecture & Relationships");
    if (!this.explanation.trim()) missing.push("Design Rationale & Trade-offs");
    if (!this.code.trim()) missing.push("Core Interface & Implementation Code");

    return {
      isValid: missing.length === 0,
      missingSections: missing,
    };
  }

  toFormattedSummary(): string {
    return `
### 1. Assumptions & Strategy
${this.assumptions}

### 2. Class Architecture & Relationships
${this.classDesign}

### 3. Design Rationale & Trade-offs
${this.explanation}

### 4. Implementation Code & Interfaces
\`\`\`
${this.code}
\`\`\`
`.trim();
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      attemptId: this.attemptId,
      assumptions: this.assumptions,
      classDesign: this.classDesign,
      explanation: this.explanation,
      code: this.code,
      submittedAt: this.submittedAt,
    };
  }
}
