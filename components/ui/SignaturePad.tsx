import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  onChange?: (signatureData: string) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    const canvasElement = canvas;
    const drawingContext = context;

    drawingContext.strokeStyle = "#1A1916";
    drawingContext.lineWidth = 2;
    drawingContext.lineCap = "round";

    function pointFromEvent(event: PointerEvent) {
      const rect = canvasElement.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onPointerDown(event: PointerEvent) {
      drawingRef.current = true;
      const point = pointFromEvent(event);
      drawingContext.beginPath();
      drawingContext.moveTo(point.x, point.y);
    }

    function onPointerMove(event: PointerEvent) {
      if (!drawingRef.current) {
        return;
      }

      const point = pointFromEvent(event);
      drawingContext.lineTo(point.x, point.y);
      drawingContext.stroke();
      setHasInk(true);
    }

    function stopDrawing() {
      if (drawingRef.current && onChange && hasInk) {
        onChange(canvasElement.toDataURL("image/png"));
      }
      drawingRef.current = false;
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrawing);

    return () => {
      canvasElement.removeEventListener("pointerdown", onPointerDown);
      canvasElement.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrawing);
    };
  }, []);

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.("");
  }

  return (
    <>
      <div className="sign-pad">
        <canvas ref={canvasRef} id="sig-canvas" width="460" height="160" />
        {!hasInk ? <div className="sign-pad-hint">Sign here with your mouse or touch</div> : null}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button type="button" className="btn btn-ghost btn-xs" onClick={clearSignature}>
          Clear
        </button>
      </div>
    </>
  );
}
