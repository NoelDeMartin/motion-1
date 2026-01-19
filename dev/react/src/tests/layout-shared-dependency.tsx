import { motion, useMotionValue } from "framer-motion"
import { useState } from "react"

/**
 * Test for issue #1436: layoutDependency not working with layoutId
 *
 * This test verifies that when a component with layoutId remounts in a different
 * location, it should NOT animate if layoutDependency hasn't changed.
 *
 * Expected behavior:
 * - When clicking "Switch Section" (layoutDependency stays the same): NO animation
 * - When clicking "Animate" (layoutDependency changes): animation should occur
 */
export const App = () => {
    const [section, setSection] = useState<"a" | "b">("a")
    const [animationTrigger, setAnimationTrigger] = useState(0)
    const backgroundColor = useMotionValue("#f00")

    const box = (
        <motion.div
            id="box"
            data-testid="box"
            layoutId="shared-box"
            layout
            layoutDependency={animationTrigger}
            style={{
                position: "absolute",
                width: 100,
                height: 100,
                backgroundColor,
                borderRadius: 10,
            }}
            transition={{ duration: 0.5, ease: () => 0.5 }}
            onLayoutAnimationStart={() => backgroundColor.set("#0f0")}
            onLayoutAnimationComplete={() => backgroundColor.set("#00f")}
        />
    )

    return (
        <div style={{ position: "relative", height: 400 }}>
            <div style={{ marginBottom: 20 }}>
                <button
                    id="switch-section"
                    onClick={() => setSection(section === "a" ? "b" : "a")}
                >
                    Switch Section (should NOT animate)
                </button>
                <button
                    id="animate"
                    onClick={() => setAnimationTrigger((t) => t + 1)}
                    style={{ marginLeft: 10 }}
                >
                    Animate (should animate)
                </button>
            </div>

            {section === "a" && (
                <div
                    id="section-a"
                    style={{ position: "absolute", top: 100, left: 0 }}
                >
                    {box}
                </div>
            )}

            {section === "b" && (
                <div
                    id="section-b"
                    style={{ position: "absolute", top: 200, left: 200 }}
                >
                    {box}
                </div>
            )}
        </div>
    )
}
