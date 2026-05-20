import { describe, expect, it } from "vitest";
import { alignShapes, distributeShapes, getOverlappingShapeIds } from "./layout";
import type { Shape } from "../types/Shape";

const shapes: Shape[] = [
  {
    id: "a",
    type: "rectangle",
    x: 20,
    y: 40,
    width: 60,
    height: 30,
    color: "red",
  },
  {
    id: "b",
    type: "rectangle",
    x: 120,
    y: 90,
    width: 40,
    height: 30,
    color: "blue",
  },
  {
    id: "c",
    type: "rectangle",
    x: 220,
    y: 20,
    width: 80,
    height: 30,
    color: "green",
  },
];

describe("layout helpers", () => {
  it("aligns shapes to the left-most edge", () => {
    expect(alignShapes(shapes, "left")).toEqual({
      a: { x: 20, y: 40 },
      b: { x: 20, y: 90 },
      c: { x: 20, y: 20 },
    });
  });

  it("distributes shapes evenly across the horizontal span", () => {
    expect(distributeShapes(shapes, "horizontal")).toEqual({
      a: { x: 20, y: 40 },
      b: { x: 130, y: 90 },
      c: { x: 220, y: 20 },
    });
  });

  it("finds overlapping shape ids", () => {
    const overlapping = getOverlappingShapeIds([
      shapes[0],
      {
        id: "d",
        type: "rectangle",
        x: 50,
        y: 50,
        width: 50,
        height: 40,
        color: "yellow",
      },
      shapes[2],
    ]);

    expect(overlapping.sort()).toEqual(["a", "d"]);
  });
});
