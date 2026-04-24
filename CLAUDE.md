# Instructions for Claude Code

## Git Commit Policy

**IMPORTANT**: Do NOT commit changes to the main branch unless the user explicitly asks you to commit.

- Always wait for user confirmation that changes are working correctly before committing
- The user wants to verify that changes work as expected before they are committed
- Only create commits when the user explicitly requests it with phrases like:
  - "commit this"
  - "commit the changes"
  - "create a commit"
  - "git commit"

## Version Bump Policy

Quand l'utilisateur demande de bumper la version :
1. Mettre à jour `version` dans `package.json`
2. Mettre à jour `src/whats-new.js` : changer `version` et mettre à jour `changes[]` avec les nouveautés depuis la dernière version — concis, sans trop de détail, en français

## General Guidelines

- When making changes, explain what you're doing
- After changes are applied, wait for the user to test and confirm they work
- Do not be proactive about committing - always wait for explicit instruction
