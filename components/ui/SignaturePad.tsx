import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  onChange?: (signatureData: string) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureDataRef = useRef("");
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
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
    const devicePixelRatio = window.devicePixelRatio || 1;

    function syncCanvasSize() {
      const bounds = canvasElement.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));

      canvasElement.width = Math.round(width * devicePixelRatio);
      canvasElement.height = Math.round(height * devicePixelRatio);
      drawingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      drawingContext.clearRect(0, 0, width, height);
      drawingContext.strokeStyle = "#1A1916";
      drawingContext.lineWidth = 2;
      drawingContext.lineCap = "round";
      drawingContext.lineJoin = "round";

      if (signatureDataRef.current) {
        const image = new Image();
        image.onload = () => {
          drawingContext.drawImage(image, 0, 0, width, height);
        };
        image.src = signatureDataRef.current;
      }
    }

    syncCanvasSize();

    function pointFromEvent(event: PointerEvent) {
      const rect = canvasElement.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onPointerDown(event: PointerEvent) {
      event.preventDefault();
      canvasElement.setPointerCapture?.(event.pointerId);
      drawingRef.current = true;
      const point = pointFromEvent(event);
      drawingContext.beginPath();
      drawingContext.moveTo(point.x, point.y);
    }

    function onPointerMove(event: PointerEvent) {
      if (!drawingRef.current) {
        return;
      }

      event.preventDefault();
      const point = pointFromEvent(event);
      drawingContext.lineTo(point.x, point.y);
      drawingContext.stroke();
      hasInkRef.current = true;
      setHasInk(true);
    }

    function stopDrawing(event?: PointerEvent) {
      if (event) {
        event.preventDefault();
        canvasElement.releasePointerCapture?.(event.pointerId);
      }

      if (drawingRef.current && hasInkRef.current) {
        const signatureData = canvasElement.toDataURL("image/png");
        signatureDataRef.current = signatureData;
        onChange?.(signatureData);
      }

      drawingRef.current = false;
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    canvasElement.addEventListener("pointerup", stopDrawing);
    canvasElement.addEventListener("pointercancel", stopDrawing);
    window.addEventListener("resize", syncCanvasSize);

    return () => {
      canvasElement.removeEventListener("pointerdown", onPointerDown);
      canvasElement.removeEventListener("pointermove", onPointerMove);
      canvasElement.removeEventListener("pointerup", stopDrawing);
      canvasElement.removeEventListener("pointercancel", stopDrawing);
      window.removeEventListener("resize", syncCanvasSize);
    };
  }, [onChange]);

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    signatureDataRef.current = "";
    hasInkRef.current = false;
    setHasInk(false);
    onChange?.("");
  }

  return (
    <>
      <div className="sign-pad">
        <canvas ref={canvasRef} id="sig-canvas" />
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
