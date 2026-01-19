import { animateSync } from "../../__tests__/utils"
import { ValueAnimationOptions } from "../../types"
import { spring } from "../spring"
import { calcGeneratorDuration } from "../utils/calc-duration"

describe("spring", () => {
    test("Runs animations with default values ", () => {
        expect(animateSync(spring({ keyframes: [0, 1] }), 200)).toEqual([
            0, 1, 1, 1, 1, 1, 1, 1,
        ])
    })

    test("Underdamped spring", () => {
        expect(
            animateSync(
                spring({
                    keyframes: [100, 1000],
                    stiffness: 300,
                    restSpeed: 10,
                    restDelta: 0.5,
                }),
                200
            )
        ).toEqual([100, 1343, 873, 1046, 984, 1005, 998, 1001, 1000])
    })

    test("Velocity passed to underdamped spring", () => {
        const settings: ValueAnimationOptions<number> = {
            keyframes: [100, 1000],
            stiffness: 300,
            restSpeed: 10,
            restDelta: 0.5,
        }

        const noVelocity = animateSync(spring(settings), 200)
        const velocity = animateSync(
            spring({ ...settings, velocity: 1000 }),
            200
        )

        expect(noVelocity).not.toEqual(velocity)
    })

    test("Critically damped spring", () => {
        expect(
            animateSync(
                spring({
                    keyframes: [100, 1000],
                    stiffness: 100,
                    damping: 20,
                    restSpeed: 10,
                    restDelta: 0.5,
                }),
                200
            )
        ).toEqual([100, 635, 918, 984, 997, 1000])
    })

    test("Velocity passed to critically spring", () => {
        const settings = {
            keyframes: [100, 1000],
            stiffness: 100,
            damping: 20,
            restSpeed: 10,
            restDelta: 0.5,
        }

        const noVelocity = animateSync(spring(settings), 200)
        const velocity = animateSync(
            spring({ ...settings, velocity: 1000 }),
            200
        )

        expect(noVelocity).not.toEqual(velocity)
    })

    test("Overdamped spring", () => {
        expect(
            animateSync(
                spring({
                    keyframes: [100, 1000],
                    stiffness: 300,
                    damping: 100,
                    restSpeed: 10,
                    restDelta: 0.5,
                }),
                200
            )
        ).toEqual([
            100, 499, 731, 855, 922, 958, 977, 988, 993, 996, 998, 999, 999,
            1000,
        ])
    })
    test("Overdamped spring with very high stiffness/damping", () => {
        expect(
            animateSync(
                spring({
                    keyframes: [100, 1000],
                    stiffness: 1000000,
                    damping: 10000000,
                    restDelta: 1,
                    restSpeed: 10,
                }),
                200
            )
        ).toEqual([100, 1000])
    })

    test("Velocity passed to overdamped spring", () => {
        const settings = {
            keyframes: [100, 1000],
            stiffness: 300,
            damping: 100,
            restSpeed: 10,
            restDelta: 0.5,
        }

        const noVelocity = animateSync(spring(settings), 200)
        const velocity = animateSync(
            spring({ ...settings, velocity: 1000 }),
            200
        )

        expect(noVelocity).not.toEqual(velocity)
    })

    test("Spring defined with bounce and duration is same as just bounce", () => {
        const settings = {
            keyframes: [100, 1000],
            bounce: 0.1,
        }

        const withoutDuration = animateSync(spring(settings), 200)
        const withDuration = animateSync(
            spring({ ...settings, duration: 800 }),
            200
        )

        expect(withoutDuration).toEqual(withDuration)
        // Check duration order of magnitude is correct
        expect(withoutDuration.length).toBeGreaterThan(4)
    })

    test("Spring defined as bounce and duration is resolved with correct velocity", () => {
        const settings = {
            keyframes: [500, 10],
            bounce: 0.2,
            duration: 1000,
        }
        const resolvedSpring = spring({ ...settings, velocity: 1000 })

        expect(resolvedSpring.next(0).value).toBe(500)
        expect(Math.floor(resolvedSpring.next(100).value)).toBe(420)
    })

    test("Spring animating back to same number returns correct duration", () => {
        const duration = calcGeneratorDuration(
            spring({
                keyframes: [1, 1],
                velocity: 5,
                stiffness: 200,
                damping: 15,
            })
        )

        expect(duration).toBe(600)
    })
})

describe("visualDuration", () => {
    test("returns correct duration", () => {
        const generator = spring({ keyframes: [0, 1], visualDuration: 0.5 })

        expect(calcGeneratorDuration(generator)).toBe(1100)
    })

    test("correctly resolves shorthand", () => {
        expect(
            spring({
                keyframes: [0, 1],
                visualDuration: 0.5,
                bounce: 0.25,
            }).toString()
        ).toEqual(spring(0.5, 0.25).toString())
    })
})

describe("slow springs for layout animations", () => {
    /**
     * Layout animations use a 0-1000 progress range with explicit rest thresholds.
     * For slow springs (low stiffness), the animation should complete
     * smoothly without cutting off early.
     *
     * Issue: https://github.com/motiondivision/motion/issues/1207
     */
    test("slow overdamped spring completes smoothly with layout animation thresholds", () => {
        // Settings from the GitHub issue, with layout animation rest thresholds
        const springSettings = {
            keyframes: [0, 1000],
            stiffness: 4,
            damping: 35,
            mass: 0.5,
            // These are the explicit thresholds used by layout animations
            // to prevent slow springs from cutting off early
            restDelta: 1,
            restSpeed: 0.01,
        }

        const generator = spring(springSettings)

        // Collect values at regular intervals to check for smooth completion
        const values: number[] = []
        const timeStep = 100 // 100ms intervals
        let state = generator.next(0)
        values.push(Math.round(state.value))

        while (!state.done && values.length < 200) {
            state = generator.next(values.length * timeStep)
            values.push(Math.round(state.value))
        }

        // The animation should not cut off early - it should get very close to 1000
        // before being marked as done
        const secondToLast = values[values.length - 2]
        const lastValue = values[values.length - 1]

        // The second-to-last value should be at least 99.9% of the target
        // to ensure smooth completion without visible jump
        expect(secondToLast).toBeGreaterThanOrEqual(999)

        // Final value should snap to target
        expect(lastValue).toBe(1000)
    })

    test("slow spring without explicit thresholds may cut off early", () => {
        // Same spring settings but without explicit thresholds
        // This demonstrates the issue that was fixed
        const springSettings = {
            keyframes: [0, 1000],
            stiffness: 4,
            damping: 35,
            mass: 0.5,
            // Using default thresholds (not specifying restDelta/restSpeed)
        }

        const generator = spring(springSettings)

        // Collect values at regular intervals
        const values: number[] = []
        const timeStep = 100 // 100ms intervals
        let state = generator.next(0)
        values.push(Math.round(state.value))

        while (!state.done && values.length < 200) {
            state = generator.next(values.length * timeStep)
            values.push(Math.round(state.value))
        }

        // With default thresholds, the animation completes
        // (this test documents the behavior, not necessarily a bug)
        const lastValue = values[values.length - 1]
        expect(lastValue).toBe(1000)
    })
})

describe("toString", () => {
    test("returns correct string", () => {
        const physicsSpring = spring({
            keyframes: [0, 1],
            stiffness: 100,
            damping: 10,
            mass: 1,
        })

        expect(physicsSpring.toString()).toBe(
            "1100ms linear(0, 0.0419, 0.1493, 0.2963, 0.4608, 0.625, 0.7759, 0.905, 1.0077, 1.0827, 1.1314, 1.1567, 1.1629, 1.1545, 1.1359, 1.1114, 1.0844, 1.0578, 1.0336, 1.0131, 0.9969, 0.9853, 0.9779, 0.9742, 0.9735, 0.9751, 0.9783, 0.9824, 0.9868, 0.9911, 0.995, 0.9982, 1.0008, 1.0026, 1.0037, 1.0043, 1)"
        )

        const durationSpring = spring({
            keyframes: [0, 1],
            duration: 800,
            bounce: 0.25,
        })

        expect(durationSpring.toString()).toBe(
            "800ms linear(0, 0.0542, 0.1797, 0.3344, 0.4905, 0.6321, 0.7511, 0.8451, 0.9152, 0.9644, 0.9967, 1.0157, 1.0253, 1.0283, 1.0273, 1.024, 1.0196, 1.0152, 1.0111, 1.0076, 1.0048, 1.0027, 1.0012, 1.0002, 0.9996, 0.9993, 1)"
        )

        const visualDurationSpring = spring({
            keyframes: [0, 1],
            visualDuration: 0.5,
            bounce: 0.25,
        })

        expect(visualDurationSpring.toString()).toBe(
            "850ms linear(0, 0.046, 0.1551, 0.2934, 0.4378, 0.5737, 0.6927, 0.7915, 0.8694, 0.928, 0.9699, 0.998, 1.0153, 1.0245, 1.0281, 1.0279, 1.0254, 1.0217, 1.0176, 1.0136, 1.01, 1.007, 1.0045, 1.0027, 1.0013, 1.0003, 0.9997, 1)"
        )
    })
})
