---
name: example-skill
description: Example skill demonstrating the single-file skill format
---

# Example Skill

This is an example skill to demonstrate the single-file skill format supported by Claude Code.

## When to Use

Use this skill when you need a template for creating new skills.

## Skill Format

Skills can be defined in two formats:

1. **Single-file**: `.claude/skills/skill-name.md`
2. **Folder-based**: `.claude/skills/skill-name/SKILL.md`

## Frontmatter

Skills should include YAML frontmatter with:
- `name`: The skill identifier
- `description`: Brief description of what the skill does

## Instructions

The body of the skill contains instructions that Claude will follow when the skill is invoked.
