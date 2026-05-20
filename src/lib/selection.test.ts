import { describe, expect, it } from "vitest";
import { duplicateShapes, expandSelectionWithGroups, getSelectionForShape } from "./selection";
import type { Shape } from "../types/Shape";

const groupedShapes: Shape[] = [
  {
    id: "shape-1",
    type: "rectangle",
    x: 10,
    y: 10,
    width: 40,
    height: 40,
    color: "red",
    groupId: "group-1",
  },
  {
    id: "shape-2",
    type: "rectangle",
    x: 80,
    y: 10,
    width: 40,
    height: 40,
    color: "blue",
    groupId: "group-1",
  },
  {
    id: "shape-3",
    type: "rectangle",
    x: 160,
    y: 10,
    width: 40,
    height: 40,
    color: "green",
  },
];

describe("selection helpers", () => {
  it("selects all shapes in the same group", () => {
    expect(getSelectionForShape("shape-1", groupedShapes).toSorted()).toEqual([
      "shape-1",
      "shape-2",
    ]);
  });

  it("expands mixed selections to include grouped siblings", () => {
    expect(expandSelectionWithGroups(["shape-2", "shape-3"], groupedShapes).toSorted()).toEqual([
      "shape-1",
      "shape-2",
      "shape-3",
    ]);
  });

  it("duplicates shapes with offset positions and fresh group ids", () => {
    const ids = {
      shape: ["shape-a", "shape-b"],
      group: ["group-a"],
    };
    const duplicatedShapes = duplicateShapes(
      groupedShapes.slice(0, 2),
      (prefix) => ids[prefix].shift() ?? "fallback-id",
      24,
    );

    expect(duplicatedShapes).toEqual([
      {
        ...groupedShapes[0],
        id: "shape-a",
        x: 34,
        y: 34,
        groupId: "group-a",
      },
      {
        ...groupedShapes[1],
        id: "shape-b",
        x: 104,
        y: 34,
        groupId: "group-a",
      },
    ]);
  });
});
