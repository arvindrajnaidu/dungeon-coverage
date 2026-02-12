# Dungeon Coverage - Communications

## LinkedIn Post

---

**I turned unit testing into a dungeon crawler.**

In **Dungeon Coverage**, every JavaScript function becomes a dungeon. Branches are forking paths. Loops are winding corridors. And the gems scattered throughout? Those are your code coverage.

Your mission: achieve 100% coverage to complete each level.

**How it works:**

1. **Forge your weapons** - Create test inputs: numbers, strings, arrays, or stub functions
2. **Equip your hero** - Drag weapons into the function's parameter slots
3. **Run the test** - Watch your hero walk through the exact code path your inputs execute
4. **Collect gems** - Each covered statement lights up as you pass through
5. **Find the gaps** - Dark rooms reveal untested code paths

The "aha" moment hits when you're staring at an unreachable room thinking: *"What input gets me in there?"*

That's the puzzle of testing - made visible.

**Levels progress through real testing challenges:**
- Simple if/else branches
- Nested conditions
- Loops that run zero, one, or many times
- Error handling with try/catch
- Switch statements
- Async functions with mock dependencies

By the end, you're not just playing - you're thinking like a tester. And the game generates real test code from your runs that you can use in actual projects.

Built with PIXI.js for the game engine, Istanbul for coverage tracking, and powered by [maineffect](link) for dependency-free function execution.

The best part? No test framework to install. No mocking library to configure. Just play.

🎮 [Link to play]

#GameDev #JavaScript #Testing #LearnToCode #CodingEducation

---

## Hacker News / Dev Portal Post

---

**Show HN: Dungeon Coverage – Beat levels by achieving 100% code coverage**

I made a game where JavaScript functions become dungeons, and the only way to explore them is by writing tests.

**Gameplay:**

Each level loads a real JavaScript function. The game analyzes its structure and generates a dungeon:
- If statements → forking paths
- Loops → corridors with return paths
- Try/catch → parallel chambers
- Switch → multi-way branches

You "forge" test inputs (numbers, strings, objects, mock functions) as weapons, drag them into parameter slots, and hit RUN. Your hero walks through the code path those inputs execute, collecting gems for each covered statement.

**Goal:** 100% statement coverage = level complete.

**What makes it click:**

The spatial representation changes how you think about testing:

- *"Why can't I reach that room?"* → "What input triggers this branch?"
- *"How do I get through this loop twice?"* → "What array length causes multiple iterations?"
- *"That treasure is behind an error..."* → "I need to make this function throw"

For async functions, you forge **stubs** - mock functions that return whatever you want. Drag a stub that returns `{ok: true}` and watch your hero take the success path. Swap it for `{ok: false}` and explore the error handling.

**Levels:**

1. Simple branch (if/else)
2. Nested branches
3. For loop
4. Try/catch
5. Switch statement
6. Async with stubs
7. Boss: for → try → if → switch (all combined)

**Tech:**

- PIXI.js for rendering
- Istanbul (babel-plugin-istanbul) for coverage instrumentation
- Custom AST → CFG → tile-based dungeon generator
- [maineffect](link) for isolated function execution - this is what makes it possible to run arbitrary functions with stubs without a full test harness

**The generated tests:**

Every run you make is tracked. Click "View Tests" and get actual test code:

```javascript
test('with valid items and successful payment', async () => {
  const stubs = Stubs(jest.fn);
  const paymentAPI = stubs.createStub('paymentAPI')
    .mockResolvedValue({ success: true });

  const result = await parsedFn
    .find('processOrder')
    .callWith([{id: 1, price: 100}], paymentAPI);

  expect(result).toMatchSnapshot();
});
```

You learn testing by playing, then walk away with code you can actually use.

**Why I built this:**

Coverage reports are abstract. Colored lines in an IDE don't create intuition. But a room you can't reach? That's visceral. You *need* to get in there.

Testing is puzzle-solving. This just makes the puzzle visible.

[Play it] | [Source]

---

## Short Twitter/X Version

---

Made a game where you beat dungeons by writing tests.

Every function becomes a dungeon. Branches = forking paths. Coverage = gems.

Forge your test inputs as weapons. Drag them into parameter slots. Watch your hero walk through the code.

100% coverage = level complete.

🎮 [link]

---

## Dev.to / Medium Intro

---

# I Made Unit Testing Into a Video Game (And It Actually Teaches You Something)

Testing is puzzle-solving. You're given a function and asked: *what inputs make this do interesting things?*

The problem is, that puzzle is invisible. You stare at code, imagine execution paths, and hope your mental model is right. Coverage reports show colored lines, but they don't show you *where you haven't been*.

So I made the puzzle visible.

**Dungeon Coverage** turns JavaScript functions into explorable dungeons. Your test inputs are weapons. Your coverage percentage is treasure collected. And that branch you haven't tested yet? It's a locked room you can see but can't reach.

[Continue reading...]

---

## Quick Taglines

- "The dungeon crawler where your weapons are test inputs"
- "See your code coverage. Literally."
- "100% coverage has never been this satisfying"
- "Learn testing by playing, not reading docs"
- "The game that makes you think like a tester"
- "Finally, a coverage report you want to explore"

---

## Attributions

When mentioning the tech that makes it possible:

> "Powered by [maineffect](link) - which handles the tricky part of executing isolated functions with stubs, no test framework required."

> "Built on [maineffect](link) for dependency-free function testing."

> "Uses [maineffect](link) under the hood for isolated execution with mocks."

Keep it as a "powered by" or "built on" rather than the main story. The game is the experience; maineffect is what makes the magic work.
