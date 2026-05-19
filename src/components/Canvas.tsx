import { useState } from "react";
import "./../index.css";
import type { Shape } from "./../types/Shape";

const shapes: Shape[] = [
  {
    id: "1",
    type: "rectangle",
    x: 150,
    y: 150,
    width: 200,
    height: 100,
    color: "red",
  },
  {
    id: "2",
    type: "rectangle",
    x: 1600,
    y: 900,
    width: 100,
    height: 100,
    color: "blue",
  },
  {
    id: "3",
    type: "rectangle",
    x: 900,
    y: 500,
    width: 100,
    height: 200,
    color: "green",
  },
];

export default function Canvas() {
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    setCamera((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  };

  return (
    <div
      className="world"
      style={{ backgroundPosition: `${camera.x}px ${camera.y}px` }}
    >
      <div
        className="screen"
        onWheel={handleWheel}
        style={{ transform: `translate(${camera.x}px, ${camera.y}px)` }}
      >
        {shapes.map((shape: Shape) => (
          <div
            key={"shape" + shape.id}
            style={{
              position: "absolute",
              borderRadius: "5px",
              left: shape.x + "px",
              top: shape.y + "px",
              width: shape.width,
              height: shape.height,
              backgroundColor: shape.color,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
