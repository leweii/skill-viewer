/**
 * Unit tests for skill detection logic
 * Run with: node content.test.js
 */

// Extract the skill parsing logic from fetchSkills for testing
function parseSkillsFromTree(tree) {
  const skillPatterns = ['.claude/skills/', 'skills/'];
  const skillMap = new Map();

  for (const item of tree) {
    if (item.type !== 'blob') continue;

    for (const pattern of skillPatterns) {
      let matchIndex = -1;
      if (item.path.startsWith(pattern)) {
        matchIndex = 0;
      } else {
        const nestedPattern = '/' + pattern;
        const idx = item.path.indexOf(nestedPattern);
        if (idx !== -1) {
          matchIndex = idx + 1;
        }
      }

      if (matchIndex === -1) continue;

      const prefixEnd = matchIndex + pattern.length;
      const relativePath = item.path.slice(prefixEnd);
      const parts = relativePath.split('/');

      // Handle both single-file skills (.claude/skills/skill-name.md)
      // and folder-based skills (.claude/skills/skill-name/SKILL.md)
      let skillName, fileName, skillPath;

      if (parts.length === 1 && parts[0].endsWith('.md')) {
        // Single-file skill: .claude/skills/my-skill.md
        skillName = parts[0].replace(/\.md$/, '');
        fileName = parts[0]; // The file itself is the skill definition
        skillPath = item.path; // Full path to the file
      } else if (parts.length >= 2) {
        // Folder-based skill: .claude/skills/skill-name/SKILL.md
        skillName = parts[0];
        fileName = parts.slice(1).join('/');
        skillPath = item.path.slice(0, prefixEnd) + skillName;
      } else {
        continue;
      }

      const skillKey = skillPath;

      if (!skillMap.has(skillKey)) {
        const parentPath = item.path.slice(0, matchIndex);
        const displayName = parentPath ? `${parentPath.replace(/\/$/, '')}/${skillName}` : skillName;

        skillMap.set(skillKey, {
          name: displayName,
          path: skillPath,
          files: []
        });
      }

      skillMap.get(skillKey).files.push({
        name: fileName,
        path: item.path
      });

      break;
    }
  }

  for (const skill of skillMap.values()) {
    skill.files.sort((a, b) => {
      if (a.name === 'SKILL.md') return -1;
      if (b.name === 'SKILL.md') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

// Tests

test('detects skill at .claude/skills/skill-name/SKILL.md', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/ba-cart-skip-unskip/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].name, 'ba-cart-skip-unskip');
  assertEqual(skills[0].path, '.claude/skills/ba-cart-skip-unskip');
  assertEqual(skills[0].files.length, 1);
  assertEqual(skills[0].files[0].name, 'SKILL.md');
});

test('detects skill at skills/skill-name/SKILL.md (without .claude prefix)', () => {
  const tree = [
    { type: 'blob', path: 'skills/my-skill/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].name, 'my-skill');
  assertEqual(skills[0].path, 'skills/my-skill');
});

test('detects nested skill at any depth', () => {
  const tree = [
    { type: 'blob', path: 'packages/tools/.claude/skills/nested-skill/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].name, 'packages/tools/nested-skill');
  assertEqual(skills[0].path, 'packages/tools/.claude/skills/nested-skill');
});

test('detects multiple files in a skill directory', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/multi-file/SKILL.md' },
    { type: 'blob', path: '.claude/skills/multi-file/helper.js' },
    { type: 'blob', path: '.claude/skills/multi-file/lib/utils.js' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].files.length, 3);
  assertEqual(skills[0].files[0].name, 'SKILL.md', 'SKILL.md should be sorted first');
});

test('detects single-file skills directly in skills/', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/single-file.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should detect single-file skill');
  assertEqual(skills[0].name, 'single-file');
  assertEqual(skills[0].path, '.claude/skills/single-file.md');
  assertEqual(skills[0].files[0].name, 'single-file.md');
});

test('ignores non-md files directly in skills/', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/README.txt' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 0, 'Should not detect non-md files');
});

test('ignores tree entries (directories)', () => {
  const tree = [
    { type: 'tree', path: '.claude/skills/dir-only' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 0, 'Should ignore tree entries');
});

test('detects multiple skills in same repo', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/skill-a/SKILL.md' },
    { type: 'blob', path: '.claude/skills/skill-b/SKILL.md' },
    { type: 'blob', path: 'skills/skill-c/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 3, 'Should find 3 skills');
  assertEqual(skills.map(s => s.name).sort(), ['skill-a', 'skill-b', 'skill-c']);
});

test('handles deeply nested paths within skill directory', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/deep-skill/SKILL.md' },
    { type: 'blob', path: '.claude/skills/deep-skill/src/lib/nested/file.js' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].files.length, 2);
  assertEqual(skills[0].files[1].name, 'src/lib/nested/file.js');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
