import React, { useState } from 'react';
import TextualExplanation from './TextualExplanation';
import { PlayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const MarkdownDemo = () => {
  const [showDemo, setShowDemo] = useState(false);

  const sampleResponse = {
    success: true,
    query: "A hot-air balloon rises vertically from a point on level ground. How fast is the balloon rising when the angle of elevation is π/6 and increasing at 0.01 rad/s?",
    identified_concepts: ["Related Rates", "Trigonometric Derivatives", "Chain Rule", "Differentiation"],
    explanation: `## 🚩 Problem — Hot Air Balloon & an Observer 

A hot-air balloon rises vertically from a point on level ground. An observer stands 500 m away from the balloon's launch point. The observer measures the angle of elevation θ to the balloon. At a certain instant the angle is θ=π/6 and is increasing at a rate of dθ/dt=0.01 rad/s. 

**Find:**
- How fast is the balloon rising at that instant? (Find dh/dt, where h is the balloon's height)
- How fast is the straight-line distance r from the observer to the balloon changing at that instant? (Find dr/dt)

---

Okay, let's break down this hot air balloon problem step-by-step. This is a classic **"related rates"** problem, meaning we're given information about the rates of change of some quantities and asked to find the rate of change of another related quantity.

## 1. Understanding Related Rates and Why Prerequisites Matter

Related rates problems rely heavily on the **Chain Rule** (which you've covered) and your knowledge of **Trigonometric Derivatives**. The Chain Rule is crucial because it allows us to connect the rates of change of different variables that are related through a function. Trig derivatives are needed because the angle of elevation relates the height and distance via trigonometric functions.

## 2. Setting up the Problem

- **Visualize:** Draw a right triangle. The horizontal distance from the observer to the launch point is constant (500 m). The height of the balloon (h) is the vertical side, and the straight-line distance from the observer to the balloon (r) is the hypotenuse. The angle of elevation is θ.

- **Identify Given Information:**
  - \`dθ/dt = 0.01 rad/s\` (rate of change of the angle)
  - \`θ = π/6\` (the angle at the specific instant)
  - Horizontal distance = 500 m (constant)

- **Identify What We Need to Find:**
  - \`dh/dt\` (rate of change of the balloon's height)
  - \`dr/dt\` (rate of change of the straight-line distance)

## 3. Finding dh/dt (How fast the balloon is rising)

- **Relate h and θ:** Use the tangent function: \`tan(θ) = h/500\`. This connects the height *h* to the angle *θ*, which is essential. Therefore, \`h = 500 * tan(θ)\`.

- **Differentiate with respect to time (t):** This is where the Chain Rule comes in. We differentiate both sides of the equation \`h = 500 * tan(θ)\` with respect to *t*:

  $$\\frac{dh}{dt} = 500 \\cdot \\sec^2(\\theta) \\cdot \\frac{d\\theta}{dt}$$

  - We use the Chain Rule because \`θ\` is a function of time (\`θ(t)\`), and we're differentiating \`tan(θ(t))\` with respect to *t*.
  - The derivative of \`tan(θ)\` is \`sec²(θ)\`. This is a standard **Trigonometric Derivative** you need to know.

- **Substitute and Solve:** Now, plug in the given values: \`θ = π/6\` and \`dθ/dt = 0.01 rad/s\`. Recall that \`sec(π/6) = 2/√3\`.

  $$\\frac{dh}{dt} = 500 \\cdot \\left(\\frac{2}{\\sqrt{3}}\\right)^2 \\cdot 0.01 = 500 \\cdot \\frac{4}{3} \\cdot 0.01 = \\frac{20}{3} \\approx 6.67 \\text{ m/s}$$

  So, the balloon is rising at approximately **6.67 meters per second**.

## 4. Finding dr/dt (How fast the straight-line distance is changing)

- **Relate r and h:** Use the Pythagorean theorem: \`r² = 500² + h²\`.

- **Differentiate with respect to time (t):** Again, use the Chain Rule:

  $$2r \\cdot \\frac{dr}{dt} = 0 + 2h \\cdot \\frac{dh}{dt}$$
  
  (The derivative of 500² is zero because it's a constant).

  Simplify: $$r \\cdot \\frac{dr}{dt} = h \\cdot \\frac{dh}{dt}$$

- **Solve for dr/dt:** $$\\frac{dr}{dt} = \\frac{h}{r} \\cdot \\frac{dh}{dt}$$

- **Find h and r at the given instant:**
  - We know \`θ = π/6\`, so \`h = 500 * tan(π/6) = 500 / √3\`.
  - \`r = √(500² + h²) = √(500² + (500/√3)²) = √(500² + 500²/3) = √(4 * 500² / 3) = (2 * 500) / √3 = 1000/√3\`

- **Substitute and Solve:**

  $$\\frac{dr}{dt} = \\frac{500/\\sqrt{3}}{1000/\\sqrt{3}} \\cdot \\frac{20}{3} = \\frac{1}{2} \\cdot \\frac{20}{3} = \\frac{10}{3} \\approx 3.33 \\text{ m/s}$$

  So, the straight-line distance is increasing at approximately **3.33 meters per second**.

## 5. Summary and Learning Path Connections

- We used trigonometric functions (\`tan(θ)\`) to relate the variables.
- We applied the Chain Rule to differentiate with respect to time.
- We used trigonometric derivatives (\`d/dθ tan(θ) = sec²(θ)\`).
- We used the Pythagorean theorem, which is a fundamental geometric concept.

> **Key Insight:** This problem highlights why a solid understanding of the earlier topics in your learning path is essential for tackling more complex problems like related rates. Make sure you're comfortable with trigonometric functions, derivatives, and the Chain Rule. Practice applying these concepts in different contexts, and you'll become more confident in solving related rates problems.`,
    learning_path: {
      concepts: [
        { name: "Basic Functions" },
        { name: "Trigonometric Functions" },
        { name: "Limits" },
        { name: "Derivatives" },
        { name: "Chain Rule" },
        { name: "Related Rates" }
      ]
    },
    processing_time: 2.34
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Enhanced Markdown Rendering Demo</h1>
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center mx-auto transition-colors"
        >
          {showDemo ? <DocumentTextIcon className="h-5 w-5 mr-2" /> : <PlayIcon className="h-5 w-5 mr-2" />}
          {showDemo ? 'Hide Demo' : 'Show Enhanced Markdown Demo'}
        </button>
      </div>

      {showDemo && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Features Demonstrated:</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>✅ Mathematical notation with KaTeX rendering</li>
              <li>✅ Code syntax highlighting</li>
              <li>✅ Problem statement extraction and highlighting</li>
              <li>✅ Step-by-step solution formatting</li>
              <li>✅ Concept tags and learning path display</li>
              <li>✅ Enhanced typography and spacing</li>
            </ul>
          </div>
          
          <TextualExplanation response={sampleResponse} />
        </div>
      )}
    </div>
  );
};

export default MarkdownDemo;
