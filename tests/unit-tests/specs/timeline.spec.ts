import { Ease, Timeline } from '@rpgjs/client';
import { describe, test, expect } from 'vitest';

describe('Test Ease Function', () => {

    test('linear easing', () => {
        expect(Ease.linear(0, 0, 10, 100)).toBe(0);
        expect(Ease.linear(50, 0, 10, 100)).toBe(5);
        expect(Ease.linear(100, 0, 10, 100)).toBe(10);
    });

    test('easeInQuad easing', () => {
        expect(Ease.easeInQuad(0, 0, 10, 100)).toBe(0);
        expect(Ease.easeInQuad(50, 0, 10, 100)).toBeCloseTo(2.5);
        expect(Ease.easeInQuad(100, 0, 10, 100)).toBe(10);
    });

    test('easeOutBounce easing', () => {
        expect(Ease.easeOutBounce(0, 0, 10, 100)).toBe(0);
        expect(Ease.easeOutBounce(25, 0, 10, 100)).toBeGreaterThan(0);
        expect(Ease.easeOutBounce(100, 0, 10, 100)).toBe(10);
    });

    // test('easeInOutQuad easing', () => {
    //     expect(Ease.easeInOutQuad(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeInOutQuad(50, 0, 10, 100)).toBe(2.5);
    //     expect(Ease.easeInOutQuad(100, 0, 10, 100)).toBe(10);
    // });

    test('easeInCubic easing', () => {
        expect(Ease.easeInCubic(0, 0, 10, 100)).toBe(0);
        expect(Ease.easeInCubic(50, 0, 10, 100)).toBeCloseTo(1.25);
        expect(Ease.easeInCubic(100, 0, 10, 100)).toBe(10);
    });

    test('easeOutCubic easing', () => {
        expect(Ease.easeOutCubic(0, 0, 10, 100)).toBe(0);
        expect(Ease.easeOutCubic(50, 0, 10, 100)).toBeCloseTo(8.75);
        expect(Ease.easeOutCubic(100, 0, 10, 100)).toBe(10);
    });

    // test('easeInOutCubic easing', () => {
    //     expect(Ease.easeInOutCubic(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeInOutCubic(50, 0, 10, 100)).toBe(2.5);
    //     expect(Ease.easeInOutCubic(100, 0, 10, 100)).toBe(10);
    // });


    // test('easeInElastic easing', () => {
    //     expect(Ease.easeInElastic(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeInElastic(50, 0, 10, 100, 1)).toBeCloseTo(0); // You might want to determine a specific expected value here
    //     expect(Ease.easeInElastic(100, 0, 10, 100, 1)).toBe(10);
    // });

    // test('easeOutElastic easing', () => {
    //     expect(Ease.easeOutElastic(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeOutElastic(50, 0, 10, 100, 1)).toBeCloseTo(10); // You might want to determine a specific expected value here
    //     expect(Ease.easeOutElastic(100, 0, 10, 100, 1)).toBe(10);
    // });

    test('easeInOutElastic easing', () => {
        expect(Ease.easeInOutElastic(0, 0, 10, 100)).toBe(0);
        expect(Ease.easeInOutElastic(50, 0, 10, 100)).toBe(5);
        expect(Ease.easeInOutElastic(100, 0, 10, 100)).toBe(10);
    });

    // ...

    // test('easeInBack easing', () => {
    //     expect(Ease.easeInBack(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeInBack(50, 0, 10, 100)).toBeCloseTo(1.75);
    //     expect(Ease.easeInBack(100, 0, 10, 100)).toBe(10);
    // });

    // test('easeOutBack easing', () => {
    //     expect(Ease.easeOutBack(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeOutBack(50, 0, 10, 100)).toBeCloseTo(8.25);
    //     expect(Ease.easeOutBack(100, 0, 10, 100)).toBe(10);
    // });

    // test('easeInOutBack easing', () => {
    //     expect(Ease.easeInOutBack(0, 0, 10, 100)).toBe(0);
    //     expect(Ease.easeInOutBack(50, 0, 10, 100)).toBe(2.5);
    //     expect(Ease.easeInOutBack(100, 0, 10, 100)).toBe(10);
    // });


});

describe('Timeline class', () => {
    describe('add method', () => {
        test('should create a sequence with linear scaling and pause, 10 frames max', () => {
            const timeline = new Timeline();
            timeline.add(30, ({ scale }) => [{ scale: [scale] }], {
                scale: { from: 0, to: 1 }
            })
                .add(100)
                .add(30, ({ scale }) => [{ scale: [scale] }], {
                    scale: { from: 1, to: 0 }
                });

            const animation = timeline.create();

            // With a max of 10 frames per 30-duration added, there should be 30 frames plus 10 frames for pause
            expect(animation.length).toEqual(21);
            expect(animation[0][0].scale).toEqual([0]); // Initial scale
            expect(animation[9][0].scale).toEqual([1]); // Scale at the end of the first 30-duration
            expect(animation[10][0].time).toEqual(130);
            expect(animation[20][0].scale).toEqual([0]); // Final scale
        });
    });

    describe('create method', () => {
        test('should create the animation array with linear scaling, 10 frames max', () => {
            const timeline = new Timeline();
            timeline.add(30, ({ scale }) => [{ scale: [scale] }], {
                scale: { from: 0, to: 1 }
            });

            const animation = timeline.create();

            expect(animation.length).toEqual(10); // Only 10 frames as it's the max
            expect(animation[0][0].scale).toEqual([0]);
            expect(animation[9][0].scale).toEqual([1]);
        });
    });

    describe('add method with different properties', () => {
        test('should handle x and y properties with linear scaling', () => {
            const timeline = new Timeline();
            timeline.add(30, ({ x, y }) => [{ x, y }], {
                x: { from: 10, to: 50 },
                y: { from: 20, to: 60 }
            });

            const animation = timeline.create();

            expect(animation.length).toEqual(10);
            expect(animation[0][0].x).toEqual(10); // Initial x
            expect(animation[0][0].y).toEqual(20); // Initial y
            expect(animation[9][0].x).toEqual(50); // Final x
            expect(animation[9][0].y).toEqual(60); // Final y
        });

        test('should handle rotation and opacity properties', () => {
            const timeline = new Timeline();
            timeline.add(30, ({ rotation, opacity }) => [{ rotation, opacity }], {
                rotation: { from: 0, to: 360 },
                opacity: { from: 1, to: 0 }
            });

            const animation = timeline.create();

            expect(animation.length).toEqual(10);
            expect(animation[0][0].rotation).toEqual(0); // Initial rotation
            expect(animation[0][0].opacity).toEqual(1); // Initial opacity
            expect(animation[9][0].rotation).toEqual(360); // Final rotation
            expect(animation[9][0].opacity).toEqual(0); // Final opacity
        });
    });

    describe('pause functionality in add method', () => {
        test('should correctly pause animation for specified duration', () => {
            const timeline = new Timeline();
            timeline.add(30, ({ scale }) => [{ scale: [scale] }], {
                scale: { from: 0, to: 1 }
            })
                .add(100); // Pause

            const animation = timeline.create();

            expect(animation.length).toEqual(11); // 10 frames for scale animation plus 1 frame for pause
            expect(animation[10][0].time).toEqual(130); // Time at the end of the pause
        });
    });
});