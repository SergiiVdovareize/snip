---
name: code-review
description: Professional developer code review skill focusing on correctness, security, performance, and architecture.
---

# Code Review Skill

This skill guides the agent in performing a professional code review.

## Guidelines

### 1. Scope Clarification Rule
- When asked to perform a review, if the user has **not** specified a file, folder, class, or function, **do not** review the entire codebase.
- Instead, prompt the user to specify which part of the code (files, directories, or functions) they want reviewed.
- Only perform a full codebase review if the user explicitly requests to "review the whole codebase" or "review all code".

### 2. Review Focus Areas
Act as a senior, professional software developer. Focus on high-level concerns:
- **Code Correctness & Logic**: Spot bugs, incorrect logic, edge cases, state management issues, and proper error handling.
- **Security & Data Safety**: Prevent security vulnerabilities, data leaks, hardcoded credentials, and unsafe input handling.
- **Performance & Scalability**: Identify memory leaks, unnecessary rerenders, performance bottlenecks, and resource consumption issues.
- **Code Style & Conventions**: Ensure architectural clean-code patterns, separation of concerns, modularity, readability, and proper naming conventions.

> [!IMPORTANT]
> **Do not** comment on code formatting, spacing, indentation, missing semicolons, or basic syntax style rules. These are handled automatically by formatters and linters (like Biome).

### 3. Output Format
Present all review feedback as a structured Markdown report with the following structure:

```markdown
# Code Review Report

## Summary
[Provide a high-level summary of the reviewed code and overall health.]

## Critical Issues
- **[Component/File Name]**: [Description of critical bug, logic error, or security vulnerability that must be resolved.]

## Major Issues
- **[Component/File Name]**: [Description of performance bottleneck, architectural flaw, or significant improvement.]

## Minor Suggestions
- **[Component/File Name]**: [Description of readability improvement, naming refinement, or clean-code convention.]
```
